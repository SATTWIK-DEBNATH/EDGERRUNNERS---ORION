import unittest

from app.domain.models import DeliveryLocation, Order, Scenario, Vehicle, Warehouse
from app.graph.road_graph import RoadEdge, RoadGraph
from app.graph.travel_matrix import GraphLocation, TravelMatrixBuilder
from app.optimization.ortools_solver import OrToolsRoutingSolver
from app.optimization.problem_builder import build_routing_input


class OptimizationProblemBuilderTests(unittest.TestCase):
    def test_scenario_maps_to_graph_costs_and_ortools_route(self):
        scenario = Scenario(
            seed=2,
            warehouses=(Warehouse("wh-1", "Hub", 12.0, 77.0, {"parcel": 1}),),
            vehicles=(Vehicle("veh-1", 10, 12.0, 77.0),),
            locations=(DeliveryLocation("loc-1", 12.0, 77.01),),
            orders=(Order("ord-1", "loc-1", "parcel", 1, 1),),
        )
        graph = RoadGraph.from_edges(
            {"a": (12.0, 77.0), "b": (12.0, 77.01)},
            [RoadEdge("a", "b", 1000, 100), RoadEdge("b", "a", 1000, 110)],
            source="test",
        )
        matrix_locations = (
            GraphLocation("wh-1", 12.0, 77.0),
            GraphLocation("loc-1", 12.0, 77.01),
        )
        matrix = TravelMatrixBuilder().build(graph, matrix_locations)
        problem = build_routing_input(scenario, matrix)
        solution = OrToolsRoutingSolver().solve(problem)
        self.assertTrue(solution.feasible)
        self.assertEqual(solution.assigned_order_ids, ("ord-1",))
        self.assertEqual(problem.time_matrix[0][1], 100)
        self.assertEqual(problem.demands[1], 1000)
        self.assertEqual(solution.routes[0].total_time_s, 210)


if __name__ == "__main__":
    unittest.main()
