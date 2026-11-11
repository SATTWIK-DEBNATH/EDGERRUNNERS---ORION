import unittest

from app.api.service import LogisticsService
from app.optimization.models import VehicleRoute, VehicleRoutingSolution


class RouteExecutionTests(unittest.TestCase):
    @staticmethod
    def _route_to_vehicle(problem, vehicle_index, order_ids=None):
        order_ids = order_ids or problem.order_ids
        node_by_id = dict(zip(problem.order_ids, problem.order_node_indices))
        nodes = [problem.vehicle_starts[vehicle_index]]
        for order_id in order_ids:
            nodes.append(node_by_id[order_id])
        nodes.append(problem.vehicle_ends[vehicle_index])
        arrivals = [0]
        for start, end in zip(nodes, nodes[1:]):
            arrivals.append(arrivals[-1] + problem.time_matrix[start][end])
        demand_by_id = dict(zip(problem.order_ids, (problem.demands[n] for n in problem.order_node_indices)))
        route_ids = tuple(order_ids)
        return VehicleRoute(
            vehicle_index=vehicle_index,
            node_indices=tuple(nodes),
            order_ids=route_ids,
            total_time_s=arrivals[-1],
            total_load=sum(demand_by_id[order_id] for order_id in order_ids),
            arrival_times_s=tuple(arrivals),
        )

    class DifferentVehicleSolver:
        def solve(self, problem):
            route = RouteExecutionTests._route_to_vehicle(problem, 1)
            return VehicleRoutingSolution("TEST_SOLUTION", (route,), (), 0, 1, True)

    class ReorderedVehicleSolver:
        def solve(self, problem):
            route = RouteExecutionTests._route_to_vehicle(problem, 1, tuple(reversed(problem.order_ids)))
            return VehicleRoutingSolution("TEST_REORDERED", (route,), (), 0, 1, True)

    class RaisingSolver:
        def solve(self, _problem):
            raise RuntimeError("solver unavailable")

    class DuplicateSolver:
        def solve(self, problem):
            first = RouteExecutionTests._route_to_vehicle(problem, 0)
            second = RouteExecutionTests._route_to_vehicle(problem, 1)
            return VehicleRoutingSolution("TEST_INVALID", (first, second), (), 0, 1, True)

    class OverCapacitySolver:
        def solve(self, problem):
            route = RouteExecutionTests._route_to_vehicle(problem, 1)
            route = VehicleRoute(
                route.vehicle_index, route.node_indices, route.order_ids,
                route.total_time_s, problem.vehicle_capacities[1] + 1,
                route.arrival_times_s,
            )
            return VehicleRoutingSolution("TEST_INVALID", (route,), (), 0, 1, True)

    class InfeasibleSolver:
        def solve(self, problem):
            return VehicleRoutingSolution(
                "INFEASIBLE", (), problem.order_ids, None, 1, False, "no feasible route"
            )

    class TimedOutSolver:
        def solve(self, problem):
            route = RouteExecutionTests._route_to_vehicle(problem, 1)
            return VehicleRoutingSolution(
                "ROUTING_PARTIAL_SUCCESS_LOCAL_OPTIMUM_NOT_REACHED", (route,), (), 0, 1000, True
            )

    def test_ortools_initial_route_is_the_route_simpy_executes(self):
        service = LogisticsService(route_strategy="ortools", route_optimizer=self.DifferentVehicleSolver())
        session = service.create_simulation(1, 1, 2, 1, "route-test")
        order = session.scenario.orders[0]

        self.assertEqual(order.vehicle_id, "veh-2")
        self.assertEqual(session.engine.route_strategy, "ortools")
        session.engine.start()
        self.assertEqual([task[0].id for task in session.engine._vehicle_orders["veh-2"]], [order.id])
        self.assertEqual(session.engine._vehicle_orders["veh-1"], [])
        result = session.engine.run()
        self.assertEqual(result.delivered_order_ids, (order.id,))
        in_transit = [event for event in result.events if event.event_type == "OrderInTransit"]
        self.assertEqual([(event.order_id, event.vehicle_id) for event in in_transit], [(order.id, "veh-2")])
        self.assertEqual(session.scenario.vehicles[1].load_kg, 0)
        self.assertEqual(result.route_strategy, "ortools")

    def test_baseline_strategy_keeps_coordinator_initial_assignment(self):
        session = LogisticsService(route_strategy="baseline").create_simulation(1, 1, 2, 1, "baseline-test")
        self.assertEqual(session.engine.route_strategy, "baseline")
        self.assertEqual(session.scenario.orders[0].vehicle_id, "veh-1")

    def test_optimizer_stop_order_becomes_the_simpy_vehicle_queue_order(self):
        session = LogisticsService(
            route_strategy="ortools", route_optimizer=self.ReorderedVehicleSolver()
        ).create_simulation(1, 1, 2, 2, "reorder-test")
        expected = [order.id for order in reversed(session.scenario.orders)]

        session.engine.start()

        self.assertEqual([task[0].id for task in session.engine._vehicle_orders["veh-2"]], expected)
        self.assertEqual(session.engine._vehicle_orders["veh-1"], [])

    def test_optimizer_exception_falls_back_to_baseline(self):
        session = LogisticsService(route_strategy="ortools", route_optimizer=self.RaisingSolver()).create_simulation(
            1, 1, 2, 1, "failure-test"
        )
        self.assertEqual(session.scenario.orders[0].vehicle_id, "veh-1")
        self.assertEqual(session.engine.route_strategy, "baseline_fallback")
        self.assertIn("solver unavailable", session.engine.route_strategy_reason)

    def test_duplicate_optimizer_assignments_are_rejected_and_fall_back(self):
        session = LogisticsService(route_strategy="ortools", route_optimizer=self.DuplicateSolver()).create_simulation(
            1, 1, 2, 1, "duplicate-test"
        )
        self.assertEqual(session.scenario.orders[0].vehicle_id, "veh-1")
        self.assertEqual(session.engine.route_strategy, "baseline_fallback")

    def test_capacity_violating_optimizer_route_is_rejected_and_falls_back(self):
        session = LogisticsService(route_strategy="ortools", route_optimizer=self.OverCapacitySolver()).create_simulation(
            1, 1, 2, 1, "capacity-test"
        )
        self.assertEqual(session.scenario.orders[0].vehicle_id, "veh-1")
        self.assertEqual(session.engine.route_strategy, "baseline_fallback")

    def test_infeasible_optimizer_result_falls_back_without_losing_the_order(self):
        session = LogisticsService(route_strategy="ortools", route_optimizer=self.InfeasibleSolver()).create_simulation(
            1, 1, 2, 1, "infeasible-test"
        )
        self.assertEqual(session.scenario.orders[0].vehicle_id, "veh-1")
        self.assertEqual(session.engine.route_strategy, "baseline_fallback")
        session.engine.start()
        queued_ids = [task[0].id for queue in session.engine._vehicle_orders.values() for task in queue]
        self.assertEqual(queued_ids, [session.scenario.orders[0].id])

    def test_optimizer_timeout_uses_baseline_even_if_it_returns_an_incumbent(self):
        session = LogisticsService(route_strategy="ortools", route_optimizer=self.TimedOutSolver()).create_simulation(
            1, 1, 2, 1, "timeout-test"
        )
        self.assertEqual(session.scenario.orders[0].vehicle_id, "veh-1")
        self.assertEqual(session.engine.route_strategy, "baseline_fallback")
        self.assertIn("time limit", session.engine.route_strategy_reason)

    def test_api_overview_reports_selected_execution_strategy(self):
        service = LogisticsService(route_strategy="ortools", route_optimizer=self.RaisingSolver())
        session = service.create_simulation(1, 1, 2, 1, "report-test")
        self.assertEqual(session.engine.result().route_strategy, "baseline_fallback")
        self.assertEqual(service.overview("report-test")["simulation"]["route_strategy"], "baseline_fallback")

    def test_seeded_optimized_assignments_are_deterministic(self):
        first = LogisticsService(route_strategy="ortools").create_simulation(17, 2, 3, 5, "seed-a")
        second = LogisticsService(route_strategy="ortools").create_simulation(17, 2, 3, 5, "seed-b")
        first_assignments = tuple((o.id, o.warehouse_id, o.vehicle_id) for o in first.scenario.orders)
        second_assignments = tuple((o.id, o.warehouse_id, o.vehicle_id) for o in second.scenario.orders)
        self.assertEqual(first_assignments, second_assignments)


if __name__ == "__main__":
    unittest.main()
