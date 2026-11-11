"""Transparent greedy baseline used only for measured comparisons."""

from dataclasses import dataclass

from app.optimization.models import VehicleRoutingInput
from app.optimization.ortools_solver import UNREACHABLE_COST


@dataclass(frozen=True)
class BaselineSolution:
    assignments: tuple[tuple[str, int], ...]
    unassigned_order_ids: tuple[str, ...]
    total_time_s: int


def greedy_baseline(problem: VehicleRoutingInput) -> BaselineSolution:
    """Append each feasible order to the vehicle route with the smallest time increase."""
    order_node_by_id = dict(zip(problem.order_ids, problem.order_node_indices))
    route_nodes: list[list[int]] = [[start] for start in problem.vehicle_starts]
    route_loads = [0 for _ in problem.vehicle_capacities]
    assignments: list[tuple[str, int]] = []
    unassigned: list[str] = []

    for order_id, node in order_node_by_id.items():
        candidates: list[tuple[int, int]] = []
        for vehicle_index, can_drive in enumerate(problem.vehicle_available):
            if not can_drive or route_loads[vehicle_index] + problem.demands[node] > problem.vehicle_capacities[vehicle_index]:
                continue
            current = route_nodes[vehicle_index][-1]
            end = problem.vehicle_ends[vehicle_index]
            old_arc, to_order, from_order = (
                problem.time_matrix[current][end],
                problem.time_matrix[current][node],
                problem.time_matrix[node][end],
            )
            if max(old_arc, to_order, from_order) >= UNREACHABLE_COST:
                continue
            candidates.append((to_order + from_order - old_arc, vehicle_index))
        if not candidates:
            unassigned.append(order_id)
            continue
        _delta, selected_vehicle = min(candidates)
        route_nodes[selected_vehicle].append(node)
        route_loads[selected_vehicle] += problem.demands[node]
        assignments.append((order_id, selected_vehicle))

    total_time = 0
    for vehicle_index, nodes in enumerate(route_nodes):
        complete_route = [*nodes, problem.vehicle_ends[vehicle_index]]
        total_time += sum(
            problem.time_matrix[start][end] for start, end in zip(complete_route, complete_route[1:])
        )
    return BaselineSolution(tuple(assignments), tuple(unassigned), total_time)
