import unittest

from app.graph.road_graph import RoadEdge, RoadGraph


class RoadGraphTests(unittest.TestCase):
    def make_graph(self):
        nodes = {"a": (12.0, 77.0), "b": (12.0, 77.01), "c": (12.01, 77.01), "d": (12.01, 77.0)}
        edges = [
            RoadEdge("a", "b", 100, 10),
            RoadEdge("b", "c", 100, 10),
            RoadEdge("a", "d", 120, 12),
            RoadEdge("d", "c", 120, 12),
        ]
        return RoadGraph.from_edges(nodes, edges, source="test")

    def test_shortest_path_uses_lowest_travel_time(self):
        path = self.make_graph().shortest_path((12.0, 77.0), (12.01, 77.01))
        self.assertEqual(path.node_ids, ("a", "b", "c"))
        self.assertEqual(path.distance_m, 200)
        self.assertEqual(path.travel_time_s, 20)

    def test_one_way_edge_is_not_reversible(self):
        graph = RoadGraph.from_edges(
            {"a": (12.0, 77.0), "b": (12.0, 77.01)}, [RoadEdge("a", "b", 100, 10)]
        )
        self.assertIsNone(graph.shortest_path((12.0, 77.01), (12.0, 77.0)))

    def test_closed_edge_uses_open_alternative(self):
        graph = self.make_graph()
        graph.close_edge("a", "b")
        path = graph.shortest_path((12.0, 77.0), (12.01, 77.01))
        self.assertEqual(path.node_ids, ("a", "d", "c"))

    def test_unreachable_destination_is_explicit(self):
        graph = RoadGraph.from_edges(
            {"a": (12.0, 77.0), "b": (12.0, 77.01)}, [RoadEdge("a", "b", 100, 10)]
        )
        self.assertIsNone(graph.shortest_path((12.0, 77.01), (12.0, 77.0)))

    def test_dynamic_edge_cost_changes_selected_path(self):
        graph = self.make_graph()
        graph.set_edge_cost("a", "b", 5)
        path = graph.shortest_path((12.0, 77.0), (12.01, 77.01))
        self.assertEqual(path.node_ids, ("a", "b", "c"))
        self.assertEqual(path.travel_time_s, 15)


if __name__ == "__main__":
    unittest.main()
