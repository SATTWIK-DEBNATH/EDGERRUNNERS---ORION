import unittest

from app.optimization.models import VehicleRoutingInput
from app.optimization.ortools_solver import OrToolsRoutingSolver, UNREACHABLE_COST
from app.optimization.baseline import greedy_baseline


class OrToolsSolverTests(unittest.TestCase):
    def test_capacity_violation_is_reported_unassigned(self):
        problem = VehicleRoutingInput(
            time_matrix=((0, 10, 10), (10, 0, 10), (10, 10, 0)),
            order_node_indices=(1, 2),
            order_ids=("o-1", "o-2"),
            demands=(0, 6, 6),
            vehicle_capacities=(10,),
            vehicle_starts=(0,),
            vehicle_ends=(0,),
        )
        solution = OrToolsRoutingSolver().solve(problem)
        self.assertTrue(solution.feasible)
        self.assertEqual(len(solution.unassigned_order_ids), 1)
        self.assertEqual(sum(len(route.order_ids) for route in solution.routes), 1)

    def test_multiple_depots_use_vehicle_specific_start_and_end(self):
        large = 1000
        matrix = (
            (0, large, 10, large),
            (large, 0, large, 10),
            (10, large, 0, large),
            (large, 10, large, 0),
        )
        problem = VehicleRoutingInput(
            time_matrix=matrix,
            order_node_indices=(2, 3),
            order_ids=("north", "south"),
            demands=(0, 0, 1, 1),
            vehicle_capacities=(2, 2),
            vehicle_starts=(0, 1),
            vehicle_ends=(0, 1),
        )
        solution = OrToolsRoutingSolver().solve(problem)
        self.assertTrue(solution.feasible)
        routes = {route.vehicle_index: route for route in solution.routes}
        self.assertEqual(routes[0].node_indices[0], 0)
        self.assertEqual(routes[0].node_indices[-1], 0)
        self.assertEqual(routes[1].node_indices[0], 1)
        self.assertEqual(routes[1].node_indices[-1], 1)
        self.assertEqual(set(solution.assigned_order_ids), {"north", "south"})

    def test_unavailable_vehicle_cannot_receive_orders(self):
        problem = VehicleRoutingInput(
            time_matrix=((0, 10), (10, 0)),
            order_node_indices=(1,),
            order_ids=("o-1",),
            demands=(0, 1),
            vehicle_capacities=(10,),
            vehicle_starts=(0,),
            vehicle_ends=(0,),
            vehicle_available=(False,),
        )
        solution = OrToolsRoutingSolver().solve(problem)
        self.assertEqual(solution.unassigned_order_ids, ("o-1",))

    def test_time_window_is_respected(self):
        problem = VehicleRoutingInput(
            time_matrix=((0, 10), (10, 0)),
            order_node_indices=(1,),
            order_ids=("o-1",),
            demands=(0, 1),
            vehicle_capacities=(2,),
            vehicle_starts=(0,),
            vehicle_ends=(0,),
            time_windows=((0, 100), (20, 40)),
        )
        solution = OrToolsRoutingSolver().solve(problem)
        self.assertTrue(solution.feasible)
        self.assertIn("o-1", solution.assigned_order_ids)
        self.assertGreaterEqual(solution.routes[0].arrival_times_s[1], 20)

    def test_higher_priority_order_wins_when_capacity_is_limited(self):
        problem = VehicleRoutingInput(
            time_matrix=((0, 1, 1), (1, 0, 1), (1, 1, 0)),
            order_node_indices=(1, 2),
            order_ids=("low", "urgent"),
            demands=(0, 1, 1),
            vehicle_capacities=(1,),
            vehicle_starts=(0,),
            vehicle_ends=(0,),
            order_priorities=(1, 5),
        )
        solution = OrToolsRoutingSolver().solve(problem)
        self.assertEqual(solution.assigned_order_ids, ("urgent",))
        self.assertEqual(solution.unassigned_order_ids, ("low",))

    def test_unreachable_order_is_reported_unassigned(self):
        problem = VehicleRoutingInput(
            time_matrix=((0, UNREACHABLE_COST), (UNREACHABLE_COST, 0)),
            order_node_indices=(1,),
            order_ids=("isolated",),
            demands=(0, 1),
            vehicle_capacities=(2,),
            vehicle_starts=(0,),
            vehicle_ends=(0,),
        )
        solution = OrToolsRoutingSolver().solve(problem)
        self.assertTrue(solution.feasible)
        self.assertEqual(solution.unassigned_order_ids, ("isolated",))

    def test_invalid_matrix_is_rejected(self):
        with self.assertRaises(ValueError):
            VehicleRoutingInput(
                time_matrix=((0, 1),),
                order_node_indices=(1,),
                order_ids=("o-1",),
                demands=(0, 1),
                vehicle_capacities=(2,),
                vehicle_starts=(0,),
                vehicle_ends=(0,),
            )

    def test_greedy_baseline_respects_capacity_and_reports_unassigned(self):
        problem = VehicleRoutingInput(
            time_matrix=((0, 10, 15), (10, 0, 8), (15, 8, 0)),
            order_node_indices=(1, 2),
            order_ids=("small", "too-heavy"),
            demands=(0, 2, 11),
            vehicle_capacities=(10,),
            vehicle_starts=(0,),
            vehicle_ends=(0,),
        )
        baseline = greedy_baseline(problem)
        self.assertEqual(baseline.assignments, (("small", 0),))
        self.assertEqual(baseline.unassigned_order_ids, ("too-heavy",))
        self.assertEqual(baseline.total_time_s, 20)


if __name__ == "__main__":
    unittest.main()
