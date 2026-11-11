"""SimPy-powered delivery lifecycle for the synthetic prototype."""

from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt
from collections.abc import Callable, Mapping

import simpy

from app.domain.models import Order, OrderStatus, Scenario, Vehicle, Warehouse
from app.graph.road_graph import RoadGraph


@dataclass(frozen=True)
class SimulationEvent:
    time_s: float
    event_type: str
    order_id: str
    vehicle_id: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    detail: str | None = None


@dataclass(frozen=True)
class SimulationResult:
    simulated_time_s: float
    delivered_order_ids: tuple[str, ...]
    unfulfilled_order_ids: tuple[str, ...]
    events: tuple[SimulationEvent, ...]
    routing_source: str = "approximate_straight_line"
    route_strategy: str = "baseline"
    route_strategy_reason: str | None = None


def _distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance used only until graph routing is integrated in M2."""
    lat1, lon1, lat2, lon2 = map(radians, (lat1, lon1, lat2, lon2))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 6_371_000 * 2 * asin(sqrt(a))


class SimulationEngine:
    """Assign feasible orders and run sequential vehicle delivery processes."""

    def __init__(
        self,
        scenario: Scenario,
        average_speed_kph: float = 25.0,
        road_graph: RoadGraph | None = None,
        initial_routes: Mapping[str, tuple[str, ...]] | None = None,
        route_strategy: str = "baseline",
        route_strategy_reason: str | None = None,
    ) -> None:
        if average_speed_kph <= 0:
            raise ValueError("average speed must be positive")
        self.scenario = scenario
        self.average_speed_mps = average_speed_kph * 1000 / 3600
        self.road_graph = road_graph
        self.initial_routes = dict(initial_routes or {})
        self.route_strategy = route_strategy
        self.route_strategy_reason = route_strategy_reason
        self.env = simpy.Environment()
        self.events: list[SimulationEvent] = []
        self._locations = {location.id: location for location in scenario.locations}
        self._warehouses = {warehouse.id: warehouse for warehouse in scenario.warehouses}
        self._vehicle_orders: dict[str, list[tuple[Order, Warehouse]]] = {
            vehicle.id: [] for vehicle in scenario.vehicles
        }
        self._scheduled_incidents: list[tuple[float, Callable[[], object]]] = []
        self._running_vehicles: set[str] = set()
        self._active_orders: dict[str, str] = {}
        self._additional_orders: dict[str, Order] = {}
        self._run_started = False
        self._run_called = False
        self._completed = False

    @property
    def now(self) -> float:
        return float(self.env.now)

    def schedule_incident(self, at_s: float, handler: Callable[[], object]) -> None:
        if self._completed:
            raise RuntimeError("cannot schedule incidents after the simulation completes")
        if at_s < self.now:
            raise ValueError("incident time must be nonnegative")
        if self._run_started:
            self.env.process(self._run_scheduled_incident(at_s, handler))
        else:
            self._scheduled_incidents.append((at_s, handler))

    def register_order(self, order: Order) -> None:
        if order.location_id not in self._locations:
            raise ValueError(f"order {order.id} references an unknown delivery location")
        if any(existing.id == order.id for existing in self._all_orders()):
            raise ValueError(f"duplicate order id: {order.id}")
        self._additional_orders[order.id] = order
        if self._run_started and order.status == OrderStatus.ASSIGNED:
            self._sync_assigned_orders()

    def start(self) -> None:
        """Initialize vehicle and incident processes once, without advancing time."""
        if self._run_started:
            return
        self._run_started = True
        self._assign_orders()
        for vehicle in self.scenario.vehicles:
            if self._vehicle_orders[vehicle.id]:
                self._start_vehicle(vehicle)
        for at_s, handler in self._scheduled_incidents:
            self.env.process(self._run_scheduled_incident(at_s, handler))
        self._scheduled_incidents.clear()

    def advance(self, seconds: float | None = None) -> SimulationResult:
        """Advance by a duration, or to completion when duration is omitted."""
        if self._completed:
            return self.result()
        self.start()
        if seconds is not None:
            if seconds <= 0:
                raise ValueError("advance duration must be positive")
            self.env.run(until=self.env.now + seconds)
        else:
            self.env.run()
        self._completed = self.env.peek() == float("inf")
        return self.result()

    def result(self) -> SimulationResult:
        return SimulationResult(
            simulated_time_s=float(self.env.now),
            delivered_order_ids=tuple(order.id for order in self._all_orders() if order.status == OrderStatus.DELIVERED),
            unfulfilled_order_ids=tuple(
                order.id for order in self._all_orders() if order.status == OrderStatus.UNFULFILLABLE
            ),
            events=tuple(self.events),
            routing_source=self.road_graph.source if self.road_graph else "approximate_straight_line",
            route_strategy=self.route_strategy,
            route_strategy_reason=self.route_strategy_reason,
        )

    def run(self, until: float | None = None) -> SimulationResult:
        if self._run_called:
            raise RuntimeError("a simulation engine can only be run once")
        self._run_called = True
        self.start()
        self.env.run(until=until)
        self._completed = self.env.peek() == float("inf")
        return self.result()

    def _start_vehicle(self, vehicle: Vehicle) -> None:
        if vehicle.id in self._running_vehicles or not vehicle.available:
            return
        if not self._vehicle_orders[vehicle.id]:
            return
        self._running_vehicles.add(vehicle.id)
        self.env.process(self._run_vehicle(vehicle))

    def _run_vehicle(self, vehicle: Vehicle):
        yield from self._deliver(vehicle, self._vehicle_orders[vehicle.id])
        self._running_vehicles.discard(vehicle.id)
        self._active_orders.pop(vehicle.id, None)
        if vehicle.available and self._vehicle_orders[vehicle.id]:
            self._start_vehicle(vehicle)

    def _run_scheduled_incident(self, at_s: float, handler: Callable[[], object]):
        delay = max(0.0, at_s - self.env.now)
        if delay:
            yield self.env.timeout(delay)
        action = handler()
        self.events.append(
            SimulationEvent(
                float(self.env.now),
                "IncidentApplied",
                getattr(getattr(action, "incident", None), "id", "incident"),
                detail=getattr(getattr(action, "incident", None), "kind", "custom"),
            )
        )
        if hasattr(action, "reassigned_order_ids"):
            self.events.append(
                SimulationEvent(
                    float(self.env.now),
                    "RecoveryCommitted",
                    getattr(getattr(action, "incident", None), "id", "incident"),
                    detail=f"reassigned={len(action.reassigned_order_ids)}; unresolved={len(action.unresolved_order_ids)}",
                )
            )
        self._sync_assigned_orders()

    def _sync_assigned_orders(self) -> None:
        for order in self._all_orders():
            if order.status != OrderStatus.ASSIGNED or not order.vehicle_id:
                continue
            if self._active_orders.get(order.vehicle_id) == order.id:
                continue
            vehicle = next((item for item in self.scenario.vehicles if item.id == order.vehicle_id), None)
            warehouse = self._warehouses.get(order.warehouse_id or "")
            if vehicle is None or warehouse is None or not vehicle.available:
                continue
            queue = self._vehicle_orders[vehicle.id]
            if any(queued_order.id == order.id for queued_order, _ in queue):
                continue
            queue.append((order, warehouse))
            self._start_vehicle(vehicle)

    def _all_orders(self) -> tuple[Order, ...]:
        return (*self.scenario.orders, *self._additional_orders.values())

    def _assign_orders(self) -> None:
        planned_load = {vehicle.id: vehicle.load_kg for vehicle in self.scenario.vehicles}
        for order in self._all_orders():
            if order.status == OrderStatus.ASSIGNED:
                warehouse = self._warehouses.get(order.warehouse_id or "")
                vehicle = next((item for item in self.scenario.vehicles if item.id == order.vehicle_id), None)
                if warehouse is None or vehicle is None:
                    raise ValueError(f"preassigned order {order.id} references a missing warehouse or vehicle")
                self._vehicle_orders[vehicle.id].append((order, warehouse))
                continue
            if order.status != OrderStatus.PENDING:
                continue
            location = self._locations.get(order.location_id)
            if location is None:
                order.transition_to(OrderStatus.UNFULFILLABLE)
                self.events.append(SimulationEvent(0, "OrderUnfulfilled", order.id, detail="unknown delivery location"))
                continue
            warehouses = sorted(
                (
                    warehouse
                    for warehouse in self.scenario.warehouses
                    if warehouse.available and warehouse.inventory.get(order.item_id, 0) >= order.quantity
                ),
                key=lambda warehouse: _distance_m(
                    warehouse.latitude, warehouse.longitude, location.latitude, location.longitude
                ),
            )
            vehicles = sorted(
                (
                    vehicle
                    for vehicle in self.scenario.vehicles
                    if vehicle.available and planned_load[vehicle.id] + order.weight_kg <= vehicle.capacity_kg
                ),
                key=lambda vehicle: (len(self._vehicle_orders[vehicle.id]), vehicle.id),
            )
            if not warehouses or not vehicles:
                order.transition_to(OrderStatus.UNFULFILLABLE)
                reason = "no warehouse with stock" if not warehouses else "no available vehicle capacity"
                self.events.append(SimulationEvent(0, "OrderUnfulfilled", order.id, detail=reason))
                continue

            warehouse, vehicle = warehouses[0], vehicles[0]
            warehouse.reserve(order.item_id, order.quantity)
            order.warehouse_id, order.vehicle_id = warehouse.id, vehicle.id
            order.transition_to(OrderStatus.ASSIGNED)
            planned_load[vehicle.id] += order.weight_kg
            vehicle.load_kg = planned_load[vehicle.id]
            self._vehicle_orders[vehicle.id].append((order, warehouse))
            self.events.append(
                SimulationEvent(0, "OrderAssigned", order.id, vehicle.id, detail=f"warehouse={warehouse.id}")
            )
        for vehicle_id, route_order_ids in self.initial_routes.items():
            if vehicle_id not in self._vehicle_orders:
                raise ValueError(f"initial route references unknown vehicle {vehicle_id}")
            route_rank = {order_id: index for index, order_id in enumerate(route_order_ids)}
            queue = self._vehicle_orders[vehicle_id]
            queue.sort(key=lambda task: route_rank.get(task[0].id, len(route_rank)))

    def _deliver(self, vehicle: Vehicle, tasks: list[tuple[Order, Warehouse]]):
        latitude, longitude = vehicle.latitude, vehicle.longitude
        while tasks:
            order, warehouse = tasks.pop(0)
            if order.status != OrderStatus.ASSIGNED or order.vehicle_id != vehicle.id:
                continue
            if not vehicle.available:
                return
            self._active_orders[vehicle.id] = order.id
            location = self._locations[order.location_id]
            if self.road_graph is not None:
                first_path = self.road_graph.shortest_path(
                    (latitude, longitude), (warehouse.latitude, warehouse.longitude)
                )
                second_path = self.road_graph.shortest_path(
                    (warehouse.latitude, warehouse.longitude), (location.latitude, location.longitude)
                )
                if first_path is None or second_path is None:
                    order.transition_to(OrderStatus.UNFULFILLABLE)
                    warehouse.release(order.item_id, order.quantity)
                    vehicle.load_kg -= order.weight_kg
                    vehicle.in_transit = False
                    self.events.append(
                        SimulationEvent(
                            self.env.now,
                            "OrderUnfulfilled",
                            order.id,
                            vehicle.id,
                            detail="unreachable on the configured road graph",
                        )
                    )
                    continue
                vehicle.in_transit = True
                order.transition_to(OrderStatus.IN_TRANSIT)
                self.events.append(SimulationEvent(self.env.now, "OrderInTransit", order.id, vehicle.id))
                point = yield from self._move_graph_path(
                    first_path, (latitude, longitude), (warehouse.latitude, warehouse.longitude), order, vehicle, "warehouse"
                )
                if point is None or order.vehicle_id != vehicle.id or order.status != OrderStatus.IN_TRANSIT:
                    return
                latitude, longitude = point
                point = yield from self._move_graph_path(
                    second_path,
                    (latitude, longitude),
                    (location.latitude, location.longitude),
                    order,
                    vehicle,
                    "delivery",
                )
                if point is None or order.vehicle_id != vehicle.id or order.status != OrderStatus.IN_TRANSIT:
                    return
                latitude, longitude = point
                order.transition_to(OrderStatus.DELIVERED)
                vehicle.load_kg -= order.weight_kg
                vehicle.in_transit = False
                self.events.append(SimulationEvent(self.env.now, "DeliveryCompleted", order.id, vehicle.id))
                continue

            vehicle.in_transit = True
            order.transition_to(OrderStatus.IN_TRANSIT)
            self.events.append(SimulationEvent(self.env.now, "OrderInTransit", order.id, vehicle.id))
            for target_lat, target_lon, label in (
                (warehouse.latitude, warehouse.longitude, "warehouse"),
                (location.latitude, location.longitude, "delivery"),
            ):
                duration = _distance_m(latitude, longitude, target_lat, target_lon) / self.average_speed_mps
                if duration > 0:
                    yield self.env.timeout(duration)
                if order.vehicle_id != vehicle.id or order.status != OrderStatus.IN_TRANSIT or not vehicle.available:
                    return
                latitude, longitude = target_lat, target_lon
                self.events.append(
                    SimulationEvent(
                        self.env.now,
                        "VehicleMoved",
                        order.id,
                        vehicle.id,
                        latitude,
                        longitude,
                        label,
                    )
                )
            if order.vehicle_id != vehicle.id or order.status != OrderStatus.IN_TRANSIT or not vehicle.available:
                return
            order.transition_to(OrderStatus.DELIVERED)
            vehicle.load_kg -= order.weight_kg
            vehicle.in_transit = False
            self.events.append(SimulationEvent(self.env.now, "DeliveryCompleted", order.id, vehicle.id))

    def _move_graph_path(
        self,
        path,
        start: tuple[float, float],
        destination: tuple[float, float],
        order: Order,
        vehicle: Vehicle,
        leg_name: str,
    ):
        graph = self.road_graph.graph
        current = start
        first_node = path.node_ids[0]
        first_data = graph.nodes[first_node]
        first_point = (first_data["latitude"], first_data["longitude"])
        access_time = path.start_access_time_s
        if access_time > 0:
            yield self.env.timeout(access_time)
            if order.vehicle_id != vehicle.id or order.status != OrderStatus.IN_TRANSIT or not vehicle.available:
                return None
            current = first_point
            vehicle.latitude, vehicle.longitude = current
            self.events.append(
                SimulationEvent(self.env.now, "VehicleMoved", order.id, vehicle.id, *current, f"{leg_name}_road_access")
            )
        for start_node, end_node in zip(path.node_ids, path.node_ids[1:]):
            edge = graph.edges[start_node, end_node]
            yield self.env.timeout(edge["travel_time_s"])
            if order.vehicle_id != vehicle.id or order.status != OrderStatus.IN_TRANSIT or not vehicle.available:
                return None
            if edge.get("closed", False):
                revised = self.road_graph.shortest_path(current, destination)
                if revised is None:
                    return None
                return (yield from self._move_graph_path(revised, current, destination, order, vehicle, leg_name))
            node = graph.nodes[end_node]
            current = (node["latitude"], node["longitude"])
            vehicle.latitude, vehicle.longitude = current
            self.events.append(
                SimulationEvent(self.env.now, "VehicleMoved", order.id, vehicle.id, *current, leg_name)
            )
        access_time = path.end_access_time_s
        if access_time > 0:
            yield self.env.timeout(access_time)
            if order.vehicle_id != vehicle.id or order.status != OrderStatus.IN_TRANSIT or not vehicle.available:
                return None
            vehicle.latitude, vehicle.longitude = destination
            self.events.append(
                SimulationEvent(
                    self.env.now,
                    "VehicleMoved",
                    order.id,
                    vehicle.id,
                    *destination,
                    f"{leg_name}_destination_access",
                )
            )
        return destination
