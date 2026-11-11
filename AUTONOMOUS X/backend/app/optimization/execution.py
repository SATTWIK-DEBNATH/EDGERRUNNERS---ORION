"""Validate and apply one initial OR-Tools dispatch before SimPy starts."""

from math import ceil
from typing import Protocol

from app.domain.models import OrderStatus, Scenario
from app.graph.road_graph import RoadGraph
from app.optimization.models import VehicleRoutingInput, VehicleRoutingSolution
from app.optimization.ortools_solver import UNREACHABLE_COST, validate_solution


class RoutingSolver(Protocol):
    def solve(self, problem: VehicleRoutingInput) -> VehicleRoutingSolution: ...


def build_initial_execution_input(scenario: Scenario, graph: RoadGraph) -> VehicleRoutingInput:
    """Build costs for assigned orders, including each order's reserved warehouse pickup."""
    orders = tuple(order for order in scenario.orders if order.status == OrderStatus.ASSIGNED)
    warehouses = {warehouse.id: warehouse for warehouse in scenario.warehouses}
    locations = {location.id: location for location in scenario.locations}
    vehicles = scenario.vehicles
    vehicle_count = len(vehicles)
    node_count = vehicle_count + len(orders)
    if not vehicle_count:
        raise ValueError("initial routing requires at least one vehicle")

    def leg_time(start: tuple[float, float], end: tuple[float, float]) -> int:
        path = graph.shortest_path(start, end)
        return UNREACHABLE_COST if path is None else max(0, ceil(path.travel_time_s))

    start_coordinates = [(vehicle.latitude, vehicle.longitude) for vehicle in vehicles]
    order_coordinates: dict[str, tuple[float, float]] = {}
    pickup_coordinates: dict[str, tuple[float, float]] = {}
    order_demands: dict[str, int] = {}
    for order in orders:
        location = locations.get(order.location_id)
        warehouse = warehouses.get(order.warehouse_id or "")
        if location is None or warehouse is None:
            raise ValueError(f"assigned order {order.id} references a missing location or warehouse")
        order_coordinates[order.id] = (location.latitude, location.longitude)
        pickup_coordinates[order.id] = (warehouse.latitude, warehouse.longitude)
        order_demands[order.id] = ceil(order.weight_kg * 1000)

    matrix = [[0 for _ in range(node_count)] for _ in range(node_count)]
    for vehicle_index, start in enumerate(start_coordinates):
        for order_index, order in enumerate(orders):
            node = vehicle_count + order_index
            matrix[vehicle_index][node] = leg_time(start, pickup_coordinates[order.id]) + leg_time(
                pickup_coordinates[order.id], order_coordinates[order.id]
            )
    for origin_index, origin_order in enumerate(orders):
        from_node = vehicle_count + origin_index
        for destination_index, destination_order in enumerate(orders):
            to_node = vehicle_count + destination_index
            if origin_index != destination_index:
                matrix[from_node][to_node] = leg_time(
                    order_coordinates[origin_order.id], pickup_coordinates[destination_order.id]
                ) + leg_time(pickup_coordinates[destination_order.id], order_coordinates[destination_order.id])

    demands = [0] * node_count
    for index, order in enumerate(orders):
        demands[vehicle_count + index] = order_demands[order.id]
    assigned_weight_by_vehicle = {
        vehicle.id: sum(order.weight_kg for order in orders if order.vehicle_id == vehicle.id)
        for vehicle in vehicles
    }
    base_loads = {
        vehicle.id: vehicle.load_kg - assigned_weight_by_vehicle[vehicle.id] for vehicle in vehicles
    }
    if any(load < -1e-9 for load in base_loads.values()):
        raise ValueError("vehicle load is inconsistent with its assigned orders")

    return VehicleRoutingInput(
        time_matrix=tuple(tuple(row) for row in matrix),
        order_node_indices=tuple(vehicle_count + index for index in range(len(orders))),
        order_ids=tuple(order.id for order in orders),
        demands=tuple(demands),
        vehicle_capacities=tuple(
            max(0, ceil((vehicle.capacity_kg - max(0.0, base_loads[vehicle.id])) * 1000))
            for vehicle in vehicles
        ),
        vehicle_starts=tuple(range(vehicle_count)),
        vehicle_ends=tuple(range(vehicle_count)),
        vehicle_available=tuple(vehicle.available for vehicle in vehicles),
        order_priorities=tuple(order.priority for order in orders),
    )


def apply_initial_execution_solution(
    scenario: Scenario, problem: VehicleRoutingInput, solution: VehicleRoutingSolution
) -> dict[str, tuple[str, ...]]:
    """Validate a complete plan, then atomically move assigned orders to its vehicle routes."""
    validate_solution(problem, solution)
    if solution.unassigned_order_ids:
        raise ValueError("optimizer left coordinator-assigned orders unassigned")
    if len(solution.unassigned_order_ids) != len(set(solution.unassigned_order_ids)):
        raise ValueError("optimizer returned duplicate unassigned orders")

    vehicles = scenario.vehicles
    orders_by_id = {order.id: order for order in scenario.orders if order.status == OrderStatus.ASSIGNED}
    if set(orders_by_id) != set(problem.order_ids):
        raise ValueError("optimizer input does not match coordinator-assigned orders")
    route_by_vehicle: dict[str, tuple[str, ...]] = {}
    new_vehicle_by_order: dict[str, str] = {}
    route_loads = {vehicle.id: 0.0 for vehicle in vehicles}
    base_loads: dict[str, float] = {}
    for vehicle in vehicles:
        original_assigned_load = sum(
            order.weight_kg for order in orders_by_id.values() if order.vehicle_id == vehicle.id
        )
        base_loads[vehicle.id] = vehicle.load_kg - original_assigned_load

    for route in solution.routes:
        vehicle = vehicles[route.vehicle_index]
        if not vehicle.available:
            raise ValueError("optimizer assigned a route to an unavailable vehicle")
        if vehicle.id in route_by_vehicle:
            raise ValueError("optimizer returned more than one route for a vehicle")
        route_by_vehicle[vehicle.id] = route.order_ids
        for order_id in route.order_ids:
            if order_id not in orders_by_id or order_id in new_vehicle_by_order:
                raise ValueError("optimizer returned an unknown or duplicate order assignment")
            order = orders_by_id[order_id]
            warehouse = next((item for item in scenario.warehouses if item.id == order.warehouse_id), None)
            if warehouse is None or not order.vehicle_id:
                raise ValueError(f"assigned order {order_id} has no valid coordinator assignment")
            new_vehicle_by_order[order_id] = vehicle.id
            route_loads[vehicle.id] += order.weight_kg

    if set(new_vehicle_by_order) != set(orders_by_id):
        raise ValueError("optimizer did not assign every coordinator-approved order")
    for vehicle in vehicles:
        if base_loads[vehicle.id] < -1e-9 or base_loads[vehicle.id] + route_loads[vehicle.id] > vehicle.capacity_kg + 1e-9:
            raise ValueError(f"optimizer route exceeds capacity for vehicle {vehicle.id}")

    # All checks passed; update domain assignment fields and loads together.
    for order_id, vehicle_id in new_vehicle_by_order.items():
        orders_by_id[order_id].vehicle_id = vehicle_id
    for vehicle in vehicles:
        vehicle.load_kg = base_loads[vehicle.id] + route_loads[vehicle.id]
    return route_by_vehicle


def optimize_initial_execution(
    scenario: Scenario, graph: RoadGraph, optimizer: RoutingSolver
) -> dict[str, tuple[str, ...]]:
    """Return validated vehicle queues; callers retain baseline on any failure."""
    if any(order.status == OrderStatus.PENDING for order in scenario.orders):
        raise ValueError("coordinator left pending orders outside the optimizer's initial plan")
    problem = build_initial_execution_input(scenario, graph)
    if not problem.order_ids:
        return {}
    solution = optimizer.solve(problem)
    if not solution.feasible:
        raise ValueError(solution.reason or f"optimizer returned {solution.solver_status}")
    if solution.solver_status in {
        "ROUTING_FAIL_TIMEOUT",
        "ROUTING_PARTIAL_SUCCESS_LOCAL_OPTIMUM_NOT_REACHED",
    }:
        raise ValueError("optimizer reached its time limit before completing the search")
    return apply_initial_execution_solution(scenario, problem, solution)
