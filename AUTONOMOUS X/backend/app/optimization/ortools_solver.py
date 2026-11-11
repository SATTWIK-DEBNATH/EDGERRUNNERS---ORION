"""Google OR-Tools CVRP adapter with deterministic feasibility validation."""

from time import perf_counter

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from app.optimization.models import VehicleRoute, VehicleRoutingInput, VehicleRoutingSolution

UNREACHABLE_COST = 1_000_000_000


class OrToolsRoutingSolver:
    def __init__(self, time_limit_s: int = 1) -> None:
        if time_limit_s <= 0:
            raise ValueError("solver time limit must be positive")
        self.time_limit_s = time_limit_s

    def solve(self, problem: VehicleRoutingInput) -> VehicleRoutingSolution:
        started = perf_counter()
        if not problem.order_ids:
            return VehicleRoutingSolution("NO_ORDERS", (), (), 0, 0, True)
        available = tuple(index for index, can_drive in enumerate(problem.vehicle_available) if can_drive)
        if not available:
            return VehicleRoutingSolution(
                "NO_AVAILABLE_VEHICLES", (), problem.order_ids, None, 0, True, "all vehicles are unavailable"
            )

        manager = pywrapcp.RoutingIndexManager(
            len(problem.time_matrix),
            len(problem.vehicle_capacities),
            list(problem.vehicle_starts),
            list(problem.vehicle_ends),
        )
        routing = pywrapcp.RoutingModel(manager)

        def time_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return min(problem.time_matrix[from_node][to_node], UNREACHABLE_COST)

        time_callback_index = routing.RegisterTransitCallback(time_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(time_callback_index)

        def demand_callback(index: int) -> int:
            return problem.demands[manager.IndexToNode(index)]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        capacities = [
            problem.vehicle_capacities[index] if problem.vehicle_available[index] else 0
            for index in range(len(problem.vehicle_capacities))
        ]
        routing.AddDimensionWithVehicleCapacity(demand_callback_index, 0, capacities, True, "Capacity")

        routing.AddDimension(
            time_callback_index,
            problem.max_route_duration_s,
            problem.max_route_duration_s,
            False,
            "Time",
        )
        time_dimension = routing.GetDimensionOrDie("Time")
        for vehicle_index in range(len(problem.vehicle_capacities)):
            time_dimension.SetSpanUpperBoundForVehicle(problem.max_route_duration_s, vehicle_index)
            if problem.time_windows is not None:
                start_node = problem.vehicle_starts[vehicle_index]
                end_node = problem.vehicle_ends[vehicle_index]
                start_var = time_dimension.CumulVar(routing.Start(vehicle_index))
                end_var = time_dimension.CumulVar(routing.End(vehicle_index))
                start_var.SetRange(*problem.time_windows[start_node])
                end_var.SetRange(*problem.time_windows[end_node])

        order_id_by_node = dict(zip(problem.order_node_indices, problem.order_ids))
        for order_index, node_index in enumerate(problem.order_node_indices):
            routing_index = manager.NodeToIndex(node_index)
            routing.AddDisjunction(
                [routing_index], problem.unassigned_penalty * problem.order_priorities[order_index]
            )
            if problem.time_windows is not None:
                time_dimension.CumulVar(routing_index).SetRange(*problem.time_windows[node_index])

        search = pywrapcp.DefaultRoutingSearchParameters()
        search.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        search.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        search.time_limit.seconds = self.time_limit_s
        assignment = routing.SolveWithParameters(search)
        status = self._status_name(routing.status())
        if assignment is None:
            return VehicleRoutingSolution(
                status,
                (),
                problem.order_ids,
                None,
                round((perf_counter() - started) * 1000),
                False,
                "OR-Tools did not find a feasible assignment",
            )

        routes: list[VehicleRoute] = []
        time_dimension = routing.GetDimensionOrDie("Time")
        for vehicle_index in range(len(problem.vehicle_capacities)):
            index = routing.Start(vehicle_index)
            route_nodes: list[int] = []
            route_orders: list[str] = []
            arrival_times: list[int] = []
            route_load = 0
            while True:
                node = manager.IndexToNode(index)
                route_nodes.append(node)
                arrival_times.append(assignment.Value(time_dimension.CumulVar(index)))
                if node in order_id_by_node:
                    route_orders.append(order_id_by_node[node])
                    route_load += problem.demands[node]
                if routing.IsEnd(index):
                    break
                index = assignment.Value(routing.NextVar(index))
            if route_orders:
                routes.append(
                    VehicleRoute(
                        vehicle_index=vehicle_index,
                        node_indices=tuple(route_nodes),
                        order_ids=tuple(route_orders),
                        total_time_s=arrival_times[-1] - arrival_times[0],
                        total_load=route_load,
                        arrival_times_s=tuple(arrival_times),
                    )
                )

        assigned_nodes = {node for route in routes for node in route.node_indices[1:-1]}
        unassigned = tuple(
            order_id
            for node, order_id in order_id_by_node.items()
            if node not in assigned_nodes
        )
        solution = VehicleRoutingSolution(
            solver_status=status,
            routes=tuple(routes),
            unassigned_order_ids=unassigned,
            objective_value=assignment.ObjectiveValue(),
            runtime_ms=round((perf_counter() - started) * 1000),
            feasible=True,
        )
        validate_solution(problem, solution)
        return solution

    @staticmethod
    def _status_name(status: int) -> str:
        descriptor = routing_enums_pb2._ROUTINGSEARCHSTATUS_VALUE.values_by_number.get(status)
        return descriptor.name if descriptor is not None else f"UNKNOWN_{status}"


def validate_solution(problem: VehicleRoutingInput, solution: VehicleRoutingSolution) -> None:
    """Reject malformed solver output before any route can be committed."""
    if not solution.feasible:
        raise ValueError("cannot validate a solver failure as a feasible solution")
    expected = set(problem.order_ids)
    assigned = list(solution.assigned_order_ids)
    if len(assigned) != len(set(assigned)):
        raise ValueError("an order appears in multiple routes")
    if set(assigned) | set(solution.unassigned_order_ids) != expected:
        raise ValueError("solution does not account for every order")
    if set(assigned).intersection(solution.unassigned_order_ids):
        raise ValueError("an order is both assigned and unassigned")
    demand_by_id = dict(zip(problem.order_ids, (problem.demands[node] for node in problem.order_node_indices)))
    node_by_id = dict(zip(problem.order_ids, problem.order_node_indices))
    used_vehicles: set[int] = set()
    for route in solution.routes:
        vehicle_index = route.vehicle_index
        if vehicle_index in used_vehicles or not 0 <= vehicle_index < len(problem.vehicle_capacities):
            raise ValueError("invalid or duplicate vehicle route")
        used_vehicles.add(vehicle_index)
        if not problem.vehicle_available[vehicle_index]:
            raise ValueError("unavailable vehicle received a route")
        if route.node_indices[0] != problem.vehicle_starts[vehicle_index] or route.node_indices[-1] != problem.vehicle_ends[vehicle_index]:
            raise ValueError("route does not use the vehicle's configured depots")
        if route.total_load > problem.vehicle_capacities[vehicle_index]:
            raise ValueError("vehicle capacity exceeded")
        if route.total_time_s > problem.max_route_duration_s:
            raise ValueError("maximum route duration exceeded")
        if len(route.node_indices) != len(route.arrival_times_s):
            raise ValueError("arrival times do not match route stops")
        route_ids = tuple(order_id for order_id in route.order_ids)
        expected_ids = tuple(
            next(order_id for order_id, node in node_by_id.items() if node == node_index)
            for node_index in route.node_indices[1:-1]
        )
        if route_ids != expected_ids:
            raise ValueError("route order ids do not match stop nodes")
        if route.total_load != sum(demand_by_id[order_id] for order_id in route_ids):
            raise ValueError("route load does not match order demand")
        for start, end in zip(route.node_indices, route.node_indices[1:]):
            if problem.time_matrix[start][end] >= UNREACHABLE_COST:
                raise ValueError("route contains an unreachable arc")
        if problem.time_windows is not None:
            for node, arrival in zip(route.node_indices, route.arrival_times_s):
                earliest, latest = problem.time_windows[node]
                if not earliest <= arrival <= latest:
                    raise ValueError("route violates a time window")
