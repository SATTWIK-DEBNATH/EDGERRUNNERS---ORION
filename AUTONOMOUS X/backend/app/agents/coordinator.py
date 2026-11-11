"""Coordinator that validates proposals and commits one order assignment."""

from typing import Mapping
from uuid import uuid4

from app.agents.contracts import AssignmentResult, DecisionRecord
from app.agents.demand_agent import DemandAgent
from app.agents.fleet_agent import FleetAgent
from app.agents.routing_agent import RoutingAgent
from app.agents.warehouse_agent import WarehouseAgent
from app.domain.models import DeliveryLocation, Order, OrderStatus, Vehicle, Warehouse
from app.events.bus import EventBus
from app.events.contracts import LogisticsEvent
from app.graph.road_graph import RoadGraph


class CoordinatorAgent:
    def __init__(self, road_graph: RoadGraph, event_bus: EventBus | None = None) -> None:
        self.road_graph = road_graph
        self.event_bus = event_bus or EventBus()
        self.warehouse_agent = WarehouseAgent(road_graph)
        self.fleet_agent = FleetAgent()
        self.routing_agent = RoutingAgent(road_graph)
        self.demand_agent = DemandAgent()

    def assign_order(
        self,
        order: Order,
        warehouses: tuple[Warehouse, ...],
        vehicles: tuple[Vehicle, ...],
        locations: Mapping[str, DeliveryLocation],
        simulation_run_id: str,
        historical_demand_by_region: Mapping[str, tuple[int, ...]] | None = None,
    ) -> AssignmentResult:
        decisions: list[DecisionRecord] = []
        if order.status != OrderStatus.PENDING:
            return self._reject(order, decisions, "coordinator", "order is not pending")
        location = locations.get(order.location_id)
        if location is None:
            return self._reject(order, decisions, "coordinator", "delivery location is missing")

        history = (historical_demand_by_region or {}).get(location.region, ())
        demand = self.demand_agent.propose(location.region, history)
        decisions.append(
            DecisionRecord(
                "demand",
                True,
                "historical moving average calculated",
                {"region": demand.region, "average_orders": demand.average_orders, "method": demand.method},
            )
        )
        warehouse_proposal = self.warehouse_agent.propose(order, warehouses, location)
        decisions.append(
            DecisionRecord(
                "warehouse",
                bool(warehouse_proposal.candidates),
                warehouse_proposal.reason,
                {"candidate_ids": tuple(candidate.warehouse_id for candidate in warehouse_proposal.candidates)},
            )
        )
        fleet_proposal = self.fleet_agent.propose(order, vehicles)
        decisions.append(
            DecisionRecord(
                "fleet",
                bool(fleet_proposal.candidates),
                fleet_proposal.reason,
                {"candidate_ids": tuple(candidate.vehicle_id for candidate in fleet_proposal.candidates)},
            )
        )
        if not warehouse_proposal.candidates or not fleet_proposal.candidates:
            reason = warehouse_proposal.reason if not warehouse_proposal.candidates else fleet_proposal.reason
            return self._reject(order, decisions, "coordinator", reason)

        warehouse_by_id = {warehouse.id: warehouse for warehouse in warehouses}
        vehicle_by_id = {vehicle.id: vehicle for vehicle in vehicles}
        combinations = []
        route_details = []
        for warehouse_candidate in warehouse_proposal.candidates:
            warehouse = warehouse_by_id[warehouse_candidate.warehouse_id]
            for fleet_candidate in fleet_proposal.candidates:
                vehicle = vehicle_by_id[fleet_candidate.vehicle_id]
                route = self.routing_agent.assess(vehicle, warehouse, location)
                route_details.append(route)
                if route.feasible and route.estimated_travel_time_s is not None:
                    combinations.append(
                        (
                            route.estimated_travel_time_s,
                            warehouse.id,
                            vehicle.id,
                            route,
                        )
                    )
        decisions.append(
            DecisionRecord(
                "routing",
                bool(combinations),
                "reachable candidate routes evaluated" if combinations else "no candidate pair has a reachable route",
                {
                    "candidate_count": len(route_details),
                    "feasible_count": len(combinations),
                    "graph_source": self.road_graph.source,
                },
            )
        )
        if not combinations:
            return self._reject(order, decisions, "coordinator", "no feasible warehouse, vehicle, and route combination")

        _travel_time, warehouse_id, vehicle_id, route = min(
            combinations, key=lambda entry: (entry[0], entry[1], entry[2])
        )
        warehouse, vehicle = warehouse_by_id[warehouse_id], vehicle_by_id[vehicle_id]
        if (
            order.status != OrderStatus.PENDING
            or not warehouse.available
            or warehouse.inventory.get(order.item_id, 0) < order.quantity
            or not vehicle.available
            or vehicle.capacity_kg - vehicle.load_kg < order.weight_kg
            or not route.feasible
        ):
            return self._reject(order, decisions, "coordinator", "candidate became infeasible before commit")

        old_load = vehicle.load_kg
        stock_reserved = False
        try:
            warehouse.reserve(order.item_id, order.quantity)
            stock_reserved = True
            vehicle.load_kg += order.weight_kg
            order.warehouse_id = warehouse.id
            order.vehicle_id = vehicle.id
            order.transition_to(OrderStatus.ASSIGNED)
            event = LogisticsEvent(
                event_id=f"order-assignment:{order.id}:{uuid4().hex}",
                event_type="OrderAssigned",
                simulation_run_id=simulation_run_id,
                occurred_at_s=0,
                payload={
                    "order_id": order.id,
                    "warehouse_id": warehouse.id,
                    "vehicle_id": vehicle.id,
                    "estimated_travel_time_s": route.estimated_travel_time_s,
                    "graph_source": self.road_graph.source,
                },
            )
            if not self.event_bus.publish(event):
                raise ValueError("assignment event was already published")
        except (ValueError, OverflowError) as exc:
            if order.status == OrderStatus.ASSIGNED:
                order.transition_to(OrderStatus.PENDING)
            order.warehouse_id = None
            order.vehicle_id = None
            vehicle.load_kg = old_load
            if stock_reserved:
                warehouse.release(order.item_id, order.quantity)
            return self._reject(order, decisions, "coordinator", f"commit rejected: {exc}")

        decisions.append(
            DecisionRecord(
                "coordinator",
                True,
                "warehouse, capacity, route, and event checks passed; assignment committed",
                {"warehouse_id": warehouse.id, "vehicle_id": vehicle.id},
            )
        )
        return AssignmentResult(order.id, True, warehouse.id, vehicle.id, tuple(decisions))

    @staticmethod
    def _reject(
        order: Order, decisions: list[DecisionRecord], agent_name: str, reason: str
    ) -> AssignmentResult:
        decisions.append(DecisionRecord(agent_name, False, reason, {}))
        return AssignmentResult(order.id, False, None, None, tuple(decisions), reason)
