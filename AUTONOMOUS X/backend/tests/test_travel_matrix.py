import unittest

from app.graph.road_graph import RoadEdge, RoadGraph
from app.graph.travel_matrix import GraphLocation, TravelMatrixBuilder, UNREACHABLE_SECONDS


class TravelMatrixTests(unittest.TestCase):
    def setUp(self):
        nodes = {"a": (12.0, 77.0), "b": (12.0, 77.01), "c": (12.01, 77.01)}
        edges = [RoadEdge("a", "b", 100, 12), RoadEdge("b", "c", 100, 13)]
        self.graph = RoadGraph.from_edges(nodes, edges, source="test")
        self.points = (
            GraphLocation("origin", 12.0, 77.0),
            GraphLocation("destination", 12.01, 77.01),
        )

    def test_matrix_contains_graph_time_and_explicit_unreachable(self):
        matrix = TravelMatrixBuilder().build(self.graph, self.points)
        self.assertEqual(matrix.travel_times_s[0][1], 25)
        self.assertEqual(matrix.travel_times_s[1][0], UNREACHABLE_SECONDS)
        self.assertEqual(matrix.distances_m[0][1], 200)

    def test_matrix_cache_reuses_and_invalidates_after_dynamic_change(self):
        builder = TravelMatrixBuilder()
        first = builder.build(self.graph, self.points)
        again = builder.build(self.graph, self.points)
        self.assertIs(first, again)
        self.graph.set_edge_cost("a", "b", 4)
        changed = builder.build(self.graph, self.points)
        self.assertIsNot(first, changed)
        self.assertEqual(changed.travel_times_s[0][1], 17)

    def test_snap_connectors_add_approximate_access_distance_and_time(self):
        points = (
            GraphLocation("origin", 12.0001, 77.0),
            GraphLocation("destination", 12.01, 77.0101),
        )
        matrix = TravelMatrixBuilder().build(self.graph, points)
        self.assertGreater(matrix.travel_times_s[0][1], 25)
        self.assertGreater(matrix.distances_m[0][1], 200)


if __name__ == "__main__":
    unittest.main()
