import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import networkx as nx
import osmnx as ox

from app.graph.osm_loader import load_road_graph


class OsmLoaderTests(unittest.TestCase):
    def test_disabled_download_uses_labeled_synthetic_fallback(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            graph = load_road_graph(cache_path=Path(temp_dir) / "missing.graphml", enable_download=False)
        self.assertEqual(graph.source, "synthetic_fallback")
        self.assertIn("disabled", graph.fallback_reason)
        path = graph.shortest_path((12.965, 77.585), (12.989, 77.609))
        self.assertIsNotNone(path)
        self.assertEqual(path.source, "synthetic_fallback")

    def test_invalid_bbox_is_rejected(self):
        with self.assertRaises(ValueError):
            load_road_graph(bbox=(77.0, 13.0, 78.0, 12.0), enable_download=False)

    def test_download_passes_osmnx_bbox_as_left_bottom_right_top(self):
        bbox = (77.55, 12.92, 77.66, 13.02)
        graph = nx.MultiDiGraph()
        graph.add_node(1, x=77.60, y=12.97)
        graph.add_node(2, x=77.61, y=12.98)
        graph.add_edge(1, 2, length=100, speed_kph=30, travel_time=12)
        with tempfile.TemporaryDirectory() as temp_dir:
            with (
                patch.object(ox, "graph_from_bbox", return_value=graph) as download,
                patch.object(ox, "add_edge_speeds", side_effect=lambda value: value),
                patch.object(ox, "add_edge_travel_times", side_effect=lambda value: value),
            ):
                result = load_road_graph(bbox=bbox, cache_path=Path(temp_dir) / "test.graphml", enable_download=True)
        download.assert_called_once_with(bbox=bbox, network_type="drive", simplify=True)
        self.assertEqual(result.source, "openstreetmap_osmnx")

    def test_cached_graphml_is_loaded_without_network_access(self):
        graph = nx.MultiDiGraph()
        graph.graph["crs"] = "epsg:4326"
        graph.add_node(1, x=77.60, y=12.97)
        graph.add_node(2, x=77.61, y=12.98)
        graph.add_edge(1, 2, length=100, speed_kph=30, travel_time=12, highway="residential")
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "cached.graphml"
            ox.save_graphml(graph, filepath=path)
            loaded = load_road_graph(cache_path=path, enable_download=False)
        self.assertEqual(loaded.source, "openstreetmap_cached")
        self.assertIsNotNone(loaded.shortest_path((12.97, 77.60), (12.98, 77.61)))


if __name__ == "__main__":
    unittest.main()
