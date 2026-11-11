"""Map domain entities and a road travel matrix into OR-Tools input DTOs."""

from math import ceil

from app.domain.models import Scenario
from app.graph.travel_matrix import TravelMatrix
from app.optimization.models import VehicleRoutingInput


def build_routing_input(scenario: Scenario, matrix: TravelMatrix) -> VehicleRoutingInput:
    expected_ids = {warehouse.id for warehouse in scenario.warehouses} | {
        location.id for location in scenario.locations
    }
    if set(matrix.node_ids) != expected_ids:
        raise ValueError("travel matrix nodes must match scenario warehouses and delivery locations")
    node_index = {node_id: index for index, node_id in enumerate(matrix.node_ids)}
    location_by_id = {location.id: location for location in scenario.locations}
    starts: list[int] = []
    for vehicle in scenario.vehicles:
        if not scenario.warehouses:
            raise ValueError("vehicles require at least one warehouse depot")
        depot = min(
            scenario.warehouses,
            key=lambda warehouse: (warehouse.latitude - vehicle.latitude) ** 2
            + (warehouse.longitude - vehicle.longitude) ** 2,
        )
        starts.append(node_index[depot.id])

    order_nodes: list[int] = []
    demands = [0 for _ in matrix.node_ids]
    order_ids: list[str] = []
    for order in scenario.orders:
        location = location_by_id.get(order.location_id)
        if location is None:
            raise ValueError(f"order {order.id} references unknown location {order.location_id}")
        order_nodes.append(node_index[location.id])
        demands[node_index[location.id]] = ceil(order.weight_kg * 1000)
        order_ids.append(order.id)

    return VehicleRoutingInput(
        time_matrix=matrix.travel_times_s,
        order_node_indices=tuple(order_nodes),
        order_ids=tuple(order_ids),
        demands=tuple(demands),
        vehicle_capacities=tuple(ceil(vehicle.capacity_kg * 1000) for vehicle in scenario.vehicles),
        vehicle_starts=tuple(starts),
        vehicle_ends=tuple(starts),
        vehicle_available=tuple(vehicle.available for vehicle in scenario.vehicles),
        order_priorities=tuple(order.priority for order in scenario.orders),
    )
