import unittest
import httpx
import os
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.api.main import create_app


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(create_app())

    def create_simulation(self):
        response = self.client.post("/api/simulations", json={"seed": 7, "warehouse_count": 2, "vehicle_count": 3, "order_count": 4})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_health_and_overview_report_local_mode(self):
        health = self.client.get("/api/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json()["status"], "ok")
        self.assertEqual(health.json()["mode"], "local")
        self.assertFalse(health.json()["integrations"]["supabase_realtime"])
        self.create_simulation()
        overview = self.client.get("/api/overview").json()
        self.assertEqual(overview["orders"]["total"], 4)
        self.assertGreaterEqual(len(overview["warehouses"]), 1)

    def test_simulation_controls_advance_and_reset_seeded_state(self):
        simulation = self.create_simulation()
        simulation_id = simulation["id"]
        self.assertEqual(self.client.post(f"/api/simulations/{simulation_id}/start").json()["status"], "running")
        self.assertEqual(self.client.post(f"/api/simulations/{simulation_id}/pause").json()["status"], "paused")
        self.assertEqual(self.client.post(f"/api/simulations/{simulation_id}/resume").json()["status"], "running")
        stepped = self.client.post(f"/api/simulations/{simulation_id}/step", json={"seconds": 30}).json()
        self.assertEqual(stepped["simulated_time_s"], 30)
        reset = self.client.post(f"/api/simulations/{simulation_id}/reset").json()
        self.assertEqual(reset["simulated_time_s"], 0)

    def test_order_and_incident_inputs_are_validated_without_unknown_entity_mutation(self):
        simulation = self.create_simulation()
        simulation_id = simulation["id"]
        location_id = simulation["orders"][0]["location_id"]
        bad_order = self.client.post("/api/orders", json={"simulation_id": simulation_id, "location_id": location_id, "item_id": "parcel", "quantity": 0, "weight_kg": 2})
        self.assertEqual(bad_order.status_code, 422)
        before = self.client.get("/api/overview").json()["incidents"]
        bad_incident = self.client.post("/api/incidents", json={"simulation_id": simulation_id, "kind": "vehicle_breakdown", "entity_id": "missing-vehicle"})
        self.assertEqual(bad_incident.status_code, 404)
        self.assertEqual(self.client.get("/api/overview").json()["incidents"], before)

    def test_creates_order_and_schedules_mid_run_traffic_incident(self):
        simulation = self.create_simulation()
        simulation_id = simulation["id"]
        location_id = simulation["orders"][0]["location_id"]
        order = self.client.post("/api/orders", json={"simulation_id": simulation_id, "location_id": location_id, "item_id": "parcel", "quantity": 1, "weight_kg": 1, "priority": 5}).json()
        self.assertEqual(order["priority"], 5)
        edge = self.client.get("/api/overview").json()["road_edges"][0]
        incident = self.client.post("/api/incidents", json={"simulation_id": simulation_id, "kind": "traffic", "start_node": edge["start"], "end_node": edge["end"], "factor": 1.5})
        self.assertEqual(incident.status_code, 201, incident.text)
        self.assertEqual(incident.json()["kind"], "traffic")

    def test_unknown_simulation_returns_404(self):
        self.assertEqual(self.client.get("/api/simulations/missing").status_code, 404)

    def test_assistant_reports_disabled_instead_of_claiming_a_reply(self):
        self.assertEqual(self.client.post("/api/assistant/query", json={"question": "Summarize this run"}).status_code, 503)

    def test_scheduled_incident_is_marked_applied_after_a_simulation_step(self):
        simulation = self.create_simulation()
        simulation_id = simulation["id"]
        edge = self.client.get("/api/overview").json()["road_edges"][0]
        incident = self.client.post("/api/incidents", json={"simulation_id": simulation_id, "kind": "traffic", "start_node": edge["start"], "end_node": edge["end"], "factor": 1.5}).json()
        self.client.post(f"/api/simulations/{simulation_id}/start")
        self.client.post(f"/api/simulations/{simulation_id}/step", json={"seconds": 1})
        observed = next(row for row in self.client.get("/api/incidents").json() if row["id"] == incident["id"])
        self.assertEqual(observed["status"], "applied")

    def test_forecast_endpoint_reports_actual_synthetic_holdout_metrics(self):
        response = self.client.get("/api/forecasts")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["source"], "deterministic_synthetic_history")
        self.assertGreater(response.json()["random_forest_mae"], 0)

    def test_urgent_order_is_visible_as_an_applied_recovery_incident(self):
        simulation = self.create_simulation()
        order = self.client.post("/api/orders", json={
            "simulation_id": simulation["id"], "location_id": simulation["orders"][0]["location_id"],
            "item_id": "parcel", "quantity": 1, "weight_kg": 1, "priority": 5, "urgent": True,
        })
        self.assertEqual(order.status_code, 201)
        incident = self.client.get("/api/incidents").json()[-1]
        self.assertEqual(incident["kind"], "urgent_order")
        self.assertEqual(incident["status"], "applied")

    def test_order_can_be_fetched_by_id(self):
        simulation = self.create_simulation()
        order_id = simulation["orders"][0]["id"]
        response = self.client.get(f"/api/orders/{order_id}?simulation_id={simulation['id']}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], order_id)
        self.assertEqual(self.client.get("/api/orders/missing").status_code, 404)

    def test_configured_but_unavailable_ollama_returns_controlled_502(self):
        class UnavailableClient:
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                return None
            async def post(self, *args, **kwargs):
                raise httpx.ConnectError("model server is unavailable")

        with patch.dict(os.environ, {"ENABLE_LLM": "true", "OLLAMA_BASE_URL": "http://localhost:11434", "OLLAMA_MODEL": "test-model"}):
            with patch("app.api.main.httpx.AsyncClient", return_value=UnavailableClient()):
                response = self.client.post("/api/assistant/query", json={"question": "Explain these results"})
        self.assertEqual(response.status_code, 502)
        self.assertIn("Ollama request failed", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
