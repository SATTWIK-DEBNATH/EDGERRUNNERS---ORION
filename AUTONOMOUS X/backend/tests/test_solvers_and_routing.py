"""Unit tests for Timefold Open Source client and Valhalla routing client with fallbacks."""

import asyncio
import unittest

from app.graph.valhalla_client import ValhallaClient
from app.optimization.timefold_client import (
    TimefoldClient,
    TimefoldOrder,
    TimefoldSolverRequest,
    TimefoldVehicle,
)


class TestSolversAndRouting(unittest.TestCase):
    def test_timefold_ortools_fallback(self) -> None:
        async def run_test() -> None:
            # Timefold service is offline; should seamlessly fall back to OR-Tools
            client = TimefoldClient(base_url="http://localhost:9999")  # Non-existent port
            vehicles = [
                TimefoldVehicle(id="v1", depot_lat=12.97, depot_lon=77.59, capacity_kg=50.0),
                TimefoldVehicle(id="v2", depot_lat=12.97, depot_lon=77.59, capacity_kg=50.0),
            ]
            orders = [
                TimefoldOrder(id="o1", delivery_lat=12.98, delivery_lon=77.60, weight_kg=10.0),
                TimefoldOrder(id="o2", delivery_lat=12.96, delivery_lon=77.58, weight_kg=15.0),
            ]
            # 4x4 matrix: 2 depots + 2 orders
            matrix = [
                [0, 500, 300, 400],
                [500, 0, 400, 350],
                [300, 400, 0, 450],
                [400, 350, 450, 0],
            ]
            request = TimefoldSolverRequest(
                vehicles=vehicles,
                orders=orders,
                time_matrix=matrix,
                time_limit_s=1,
            )
            response = await client.solve_sync(request)
            self.assertEqual(response.status, "FEASIBLE")
            self.assertEqual(response.solver, "ortools_fallback")
            self.assertGreater(len(response.routes), 0)
            assigned_orders = [stop.order_id for r in response.routes for stop in r.stops]
            self.assertIn("o1", assigned_orders)
            self.assertIn("o2", assigned_orders)

        asyncio.run(run_test())

    def test_valhalla_client_fallback_and_penalties(self) -> None:
        async def run_test() -> None:
            client = ValhallaClient(base_url="http://localhost:9999")
            self.assertFalse(await client.is_available())

            # Test edge penalty registry
            client.apply_edge_penalty(osm_way_id=123456, penalty_multiplier=999.0)
            self.assertEqual(client._edge_penalties.get(123456), 999.0)
            client.remove_edge_penalty(osm_way_id=123456)
            self.assertNotIn(123456, client._edge_penalties)

            # Test matrix fallback
            sources = [(12.97, 77.59)]
            targets = [(12.98, 77.60)]
            matrix = await client.get_matrix(sources, targets)
            self.assertEqual(len(matrix), 1)
            self.assertEqual(len(matrix[0]), 1)
            self.assertGreater(matrix[0][0], 0.0)

        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()

