"""Unit tests for H3 spatial utilities and indexer."""

import unittest

from app.domain.models import Vehicle, Warehouse
from app.spatial.h3_indexer import H3SpatialIndex
from app.spatial.h3_utils import (
    RESOLUTION_MACRO,
    RESOLUTION_REGIONAL,
    RESOLUTION_URBAN,
    decode_h3,
    demand_aggregation,
    encode_all_resolutions,
    encode_h3,
    get_h3_coverage,
    get_k_ring,
    h3_distance_m,
    is_pentagon,
    safe_k_ring,
    validate_h3_cell,
)


class TestH3Utils(unittest.TestCase):
    def setUp(self) -> None:
        # Central Bengaluru coordinates
        self.lat = 12.9716
        self.lon = 77.5946

    def test_encode_decode_round_trip(self) -> None:
        cell = encode_h3(self.lat, self.lon, RESOLUTION_URBAN)
        self.assertTrue(validate_h3_cell(cell))
        d_lat, d_lon = decode_h3(cell)
        # Should be within ~300m at resolution 8
        dist = h3_distance_m(cell, encode_h3(d_lat, d_lon, RESOLUTION_URBAN))
        self.assertLess(dist, 100.0)

    def test_encode_all_resolutions(self) -> None:
        cells = encode_all_resolutions(self.lat, self.lon)
        self.assertIn(RESOLUTION_MACRO, cells)
        self.assertIn(RESOLUTION_REGIONAL, cells)
        self.assertIn(RESOLUTION_URBAN, cells)
        for res, cell in cells.items():
            self.assertTrue(validate_h3_cell(cell))

    def test_k_ring_neighbors(self) -> None:
        cell = encode_h3(self.lat, self.lon, RESOLUTION_URBAN)
        ring_1 = get_k_ring(cell, k=1)
        self.assertEqual(len(ring_1), 7)  # Center + 6 neighbors
        self.assertIn(cell, ring_1)

    def test_safe_k_ring_filters_pentagons(self) -> None:
        cell = encode_h3(self.lat, self.lon, RESOLUTION_URBAN)
        safe_ring = safe_k_ring(cell, k=1)
        for c in safe_ring:
            self.assertFalse(is_pentagon(c))

    def test_h3_coverage_radius(self) -> None:
        coverage = get_h3_coverage(self.lat, self.lon, radius_km=2.0, resolution=RESOLUTION_URBAN)
        self.assertGreater(len(coverage), 1)
        center_cell = encode_h3(self.lat, self.lon, RESOLUTION_URBAN)
        self.assertIn(center_cell, coverage)

    def test_demand_aggregation(self) -> None:
        points = [
            (self.lat, self.lon, 5),
            (self.lat + 0.0001, self.lon + 0.0001, 3),  # Same H3 cell
            (self.lat + 0.05, self.lon + 0.05, 2),       # Different cell
        ]
        agg = demand_aggregation(points, RESOLUTION_URBAN)
        self.assertGreaterEqual(len(agg), 2)
        center_cell = encode_h3(self.lat, self.lon, RESOLUTION_URBAN)
        self.assertEqual(agg[center_cell], 8)

    def test_spatial_index_nearest_warehouses(self) -> None:
        wh1 = Warehouse(id="wh-1", name="Central", latitude=12.97, longitude=77.59, inventory={"parcel": 100})
        wh2 = Warehouse(id="wh-2", name="North", latitude=13.05, longitude=77.59, inventory={"parcel": 100})
        indexer = H3SpatialIndex()
        indexer.index_warehouses([wh1, wh2])

        nearest = indexer.nearest_warehouses(12.971, 77.591, k=1)
        self.assertEqual(len(nearest), 1)
        self.assertEqual(nearest[0].id, "wh-1")


if __name__ == "__main__":
    unittest.main()

