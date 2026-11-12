"""Unit tests for real-time streaming, Cedar audit, and H3 endpoints."""

import unittest
from fastapi.testclient import TestClient

from app.api.main import create_app
from app.api.service import LogisticsService
from app.auth.cedar import CedarRequest, cedar_pep


class TestStreamApi(unittest.TestCase):
    def setUp(self) -> None:
        self.service = LogisticsService()
        self.app = create_app(self.service)
        self.client = TestClient(self.app)

    def test_stream_status_endpoint(self) -> None:
        res = self.client.get("/api/stream/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "active")
        self.assertIn("kafka", data)
        self.assertIn("flink", data)
        self.assertIn("timefold", data)
        self.assertIn("Timefold Solver Open Source", data["timefold"]["version"])
        self.assertIn("valhalla", data)
        self.assertIn("cedar", data)
        self.assertEqual(data["cedar"]["status"], "active")

    def test_stream_events_endpoint(self) -> None:
        res = self.client.get("/api/stream/events")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_cedar_audit_endpoint(self) -> None:
        # Trigger an evaluation
        req = CedarRequest(
            principal="Agent::Coordinator",
            action="Action::test_action",
            resource="System::Test",
        )
        cedar_pep.evaluate(req)

        res = self.client.get("/api/cedar/audit")
        self.assertEqual(res.status_code, 200)
        log = res.json()
        self.assertGreater(len(log), 0)
        self.assertEqual(log[-1]["action"], "Action::test_action")

    def test_h3_heatmap_endpoint(self) -> None:
        sim = self.service.create_simulation(seed=7, warehouse_count=3, vehicle_count=5, order_count=10)
        res = self.client.get(f"/api/h3/heatmap?simulation_id={sim.id}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("geojson", data)
        self.assertIn("cells", data)
        self.assertEqual(data["geojson"]["type"], "FeatureCollection")
        self.assertIsInstance(data["cells"], list)
        if data["cells"]:
            self.assertIn("h3_index", data["cells"][0])
            self.assertIn("count", data["cells"][0])


if __name__ == "__main__":
    unittest.main()
