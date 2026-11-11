"""Deterministic incident handling and assignment recovery."""

from uuid import uuid4

from app.agents.coordinator import CoordinatorAgent
from app.agents.contracts import AssignmentResult
from app.domain.incidents import Incident, IncidentKind
from app.domain.models import Order, OrderStatus, Scenario
from app.events.bus import EventBus
from app.events.contracts import LogisticsEvent
from app.graph.road_graph import RoadGraph, RoadPath
from app.recovery.contracts import RecoveryAction, RouteStabilityPolicy, path_cost


class RecoveryEngine:
    def __init__(
        self,
        scenario: Scenario,
        road_graph: RoadGraph,
        coordinator: CoordinatorAgent,
        event_bus: EventBus | None = None,
        stability_policy: RouteStabilityPolicy | None = None,
    ) -> None:
        self.scenario = scenario
        self.road_graph = road_graph
        self.coordinator = coordinator
        self.event_bus = event_bus or coordinator.event_bus
        self.stability_policy = stability_policy or RouteStabilityPolicy()
        self.latest_paths: dict[str, RoadPath] = {}
        self.frozen_order_ids: set[str] = set()
        self.additional_orders: list[Order] = []
        self.actions: list[RecoveryAction] = []
        self._warehouses = {warehouse.id: warehouse for warehouse in scenario.warehouses}
        self._vehicles = {vehicle.id: vehicle for vehicle in scenario.vehicles}
        self._locations = {location.id: location for location in scenario.locations}

    def freeze_next_stop(self, order_id: str) -> None:
        if not any(order.id == order_id for order in (*self.scenario.orders, *self.additional_orders)):
            raise KeyError(f"unknown order: {order_id}")
        self.frozen_order_ids.add(order_id)

    def vehicle_breakdown(self, vehicle_id: str, simulation_run_id: str, occurred_at_s: float = 0) -> RecoveryAction:
        vehicle = self._vehicles.get(vehicle_id)
        if vehicle is None:
            raise KeyError(f"unknown vehicle: {vehicle_id}")
        incident = self._incident(
            IncidentKind.VEHICLE_BREAKDOWN,
            simulation_run_id,
            occurred_at_s,
            affected_entity_id=vehicle_id,
            details={"vehicle_id": vehicle_id},
        )
        self._publish_incident(incident)
        vehicle.available = False
        vehicle.in_transit = False
        affected = self._assigned_orders(vehicle_id=vehicle_id)
        results = self._release_and_reassign(affected, simulation_run_id)
        action = self._action(incident, affected, results)
        self._publish_recovery(action)
        return action

    def warehouse_outage(
        self, warehouse_id: str, simulation_run_id: str, occurred_at_s: float = 0
    ) -> RecoveryAction:
        warehouse = self._warehouses.get(warehouse_id)
        if warehouse is None:
            raise KeyError(f"unknown warehouse: {warehouse_id}")
        incident = self._incident(
            IncidentKind.WAREHOUSE_OUTAGE,
            simulation_run_id,
            occurred_at_s,
            affected_entity_id=warehouse_id,
            details={"warehouse_id": warehouse_id},
        )
        self._publish_incident(incident)
        warehouse.available = False
        affected = self._assigned_orders(warehouse_id=warehouse_id)
        results = self._release_and_reassign(affected, simulation_run_id)
        action = self._action(incident, affected, results)
        self._publish_recovery(action)
        return action

    def road_closure(
        self,
        start_node: str,
        end_node: str,
        simulation_run_id: str,
        occurred_at_s: float = 0,
    ) -> RecoveryAction:
        if not self.road_graph.graph.has_edge(start_node, end_node):
            raise KeyError(f"road edge {start_node}->{end_node} does not exist")
        before = self._active_order_paths()
        affected = tuple(
            order for order, path in before if (start_node, end_node) in tuple(zip(path.node_ids, path.node_ids[1:]))
        )
        incident = self._incident(
            IncidentKind.ROAD_CLOSURE,
            simulation_run_id,
            occurred_at_s,
            affected_entity_id=f"{start_node}->{end_node}",
            affected_edge=(start_node, end_node),
        )
        self._publish_incident(incident)
        self.road_graph.close_edge(start_node, end_node)
        route_updates: list[str] = []
        results: list[AssignmentResult] = []
        unresolved: list[str] = []
        for order in affected:
            location = self._locations[order.location_id]
            warehouse = self._warehouses[order.warehouse_id or ""]
            new_path = self.road_graph.shortest_path(
                (warehouse.latitude, warehouse.longitude), (location.latitude, location.longitude)
            )
            if new_path is not None:
                self.latest_paths[order.id] = new_path
                route_updates.append(order.id)
                continue
            self._release_assignment(order)
            result = self._reassign(order, simulation_run_id)
            results.append(result)
            if not result.assigned:
                unresolved.append(order.id)
        action = RecoveryAction(
            incident,
            tuple(order.id for order in affected),
            tuple(result.order_id for result in results if result.assigned),
            tuple(unresolved),
            tuple(results),
            tuple(route_updates),
        )
        self._publish_recovery(action)
        return self._remember(action)

    def traffic_slowdown(
        self,
        start_node: str,
        end_node: str,
        multiplier: float,
        simulation_run_id: str,
        occurred_at_s: float = 0,
    ) -> RecoveryAction:
        if multiplier <= 1:
            raise ValueError("traffic slowdown multiplier must be greater than one")
        if not self.road_graph.graph.has_edge(start_node, end_node):
            raise KeyError(f"road edge {start_node}->{end_node} does not exist")
        before = self._active_order_paths()
        affected = tuple(
            order for order, path in before if (start_node, end_node) in tuple(zip(path.node_ids, path.node_ids[1:]))
        )
        old_edge_cost = self.road_graph.graph.edges[start_node, end_node]["travel_time_s"]
        incident = self._incident(
            IncidentKind.TRAFFIC,
            simulation_run_id,
            occurred_at_s,
            affected_entity_id=f"{start_node}->{end_node}",
            affected_edge=(start_node, end_node),
            details={"multiplier": multiplier},
        )
        self._publish_incident(incident)
        self.road_graph.set_edge_cost(start_node, end_node, old_edge_cost * multiplier)
        route_updates: list[str] = []
        for order in affected:
            old_path = next(path for candidate, path in before if candidate.id == order.id)
            location = self._locations[order.location_id]
            warehouse = self._warehouses[order.warehouse_id or ""]
            new_path = self.road_graph.shortest_path(
                (warehouse.latitude, warehouse.longitude), (location.latitude, location.longitude)
            )
            if new_path is None:
                self._release_assignment(order)
                result = self._reassign(order, simulation_run_id)
                if not result.assigned:
                    continue
                new_warehouse = self._warehouses[result.warehouse_id or ""]
                new_path = self.road_graph.shortest_path(
                    (new_warehouse.latitude, new_warehouse.longitude), (location.latitude, location.longitude)
                )
            if new_path is not None and self.stability_policy.should_reoptimize(
                path_cost(old_path, self.road_graph.graph),
                new_path.travel_time_s,
                frozen=order.id in self.frozen_order_ids,
            ):
                self.latest_paths[order.id] = new_path
                route_updates.append(order.id)
            else:
                self.latest_paths.setdefault(order.id, old_path)
        action = RecoveryAction(
            incident,
            tuple(order.id for order in affected),
            (),
            (),
            (),
            tuple(route_updates),
        )
        self._publish_recovery(action)
        return self._remember(action)

    def insert_urgent_order(self, order: Order, simulation_run_id: str, occurred_at_s: float = 0) -> RecoveryAction:
        self.additional_orders.append(order)
        incident = self._incident(
            IncidentKind.URGENT_ORDER,
            simulation_run_id,
            occurred_at_s,
            affected_entity_id=order.id,
            details={"order_id": order.id, "priority": order.priority},
        )
        self._publish_incident(incident)
        result = self._reassign(order, simulation_run_id)
        action = RecoveryAction(
            incident,
            (order.id,),
            (order.id,) if result.assigned else (),
            () if result.assigned else (order.id,),
            (result,),
        )
        self._publish_recovery(action)
        return self._remember(action)

    def _active_order_paths(self):
        active = []
        for order in (*self.scenario.orders, *self.additional_orders):
            if order.status not in {OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT} or not order.warehouse_id:
                continue
            location = self._locations.get(order.location_id)
            warehouse = self._warehouses.get(order.warehouse_id)
            if location is None or warehouse is None:
                continue
            path = self.latest_paths.get(order.id) or self.road_graph.shortest_path(
                (warehouse.latitude, warehouse.longitude), (location.latitude, location.longitude)
            )
            if path is not None:
                active.append((order, path))
        return tuple(active)

    def _assigned_orders(self, vehicle_id: str | None = None, warehouse_id: str | None = None):
        return tuple(
            order
            for order in (*self.scenario.orders, *self.additional_orders)
            if order.status in {OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT}
            and (vehicle_id is None or order.vehicle_id == vehicle_id)
            and (warehouse_id is None or order.warehouse_id == warehouse_id)
        )

    def _release_assignment(self, order: Order) -> None:
        warehouse = self._warehouses.get(order.warehouse_id or "")
        vehicle = self._vehicles.get(order.vehicle_id or "")
        if warehouse is not None:
            warehouse.release(order.item_id, order.quantity)
        if vehicle is not None:
            vehicle.load_kg = max(0.0, vehicle.load_kg - order.weight_kg)
            vehicle.in_transit = False
        if order.status in {OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT}:
            order.transition_to(OrderStatus.PENDING)
        order.warehouse_id = None
        order.vehicle_id = None
        self.latest_paths.pop(order.id, None)

    def _release_and_reassign(self, orders: tuple[Order, ...], simulation_run_id: str) -> tuple[AssignmentResult, ...]:
        results: list[AssignmentResult] = []
        for order in orders:
            self._release_assignment(order)
            results.append(self._reassign(order, simulation_run_id))
        return tuple(results)

    def _reassign(self, order: Order, simulation_run_id: str) -> AssignmentResult:
        return self.coordinator.assign_order(
            order,
            self.scenario.warehouses,
            self.scenario.vehicles,
            self._locations,
            simulation_run_id,
        )

    def _incident(
        self,
        kind: IncidentKind,
        run_id: str,
        occurred_at_s: float,
        affected_entity_id: str | None = None,
        affected_edge: tuple[str, str] | None = None,
        details: dict[str, object] | None = None,
    ) -> Incident:
        return Incident(
            f"incident-{uuid4().hex}",
            kind,
            run_id,
            occurred_at_s,
            affected_entity_id=affected_entity_id,
            affected_edge=affected_edge,
            details=details or {},
        )

    def _publish_incident(self, incident: Incident) -> None:
        self.event_bus.publish(
            LogisticsEvent(
                f"incident-event:{incident.id}",
                "IncidentRaised",
                incident.simulation_run_id,
                incident.occurred_at_s,
                {"incident_id": incident.id, "kind": incident.kind.value, "details": incident.details},
            )
        )

    def _publish_recovery(self, action: RecoveryAction) -> None:
        self.event_bus.publish(
            LogisticsEvent(
                f"recovery-event:{action.incident.id}",
                "RecoveryCommitted",
                action.incident.simulation_run_id,
                action.incident.occurred_at_s,
                {
                    "incident_id": action.incident.id,
                    "affected_order_ids": action.affected_order_ids,
                    "reassigned_order_ids": action.reassigned_order_ids,
                    "unresolved_order_ids": action.unresolved_order_ids,
                    "route_updates": action.route_updates,
                },
            )
        )

    def _action(self, incident: Incident, orders: tuple[Order, ...], results: tuple[AssignmentResult, ...]) -> RecoveryAction:
        return RecoveryAction(
            incident,
            tuple(order.id for order in orders),
            tuple(result.order_id for result in results if result.assigned),
            tuple(result.order_id for result in results if not result.assigned),
            results,
        )

    def _remember(self, action: RecoveryAction) -> RecoveryAction:
        self.actions.append(action)
        return action
