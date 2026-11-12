"""Tests for LLaMA 3.1 8B Dispatch & Geopolitical Tech Engine."""

import unittest
from app.intelligence.llama_client import llama_engine
from app.api.schemas import AIDispatchAnalysisRequest
from app.api.main import create_app
from fastapi.testclient import TestClient


class TestLlamaEngine(unittest.IsolatedAsyncioTestCase):
    async def test_dispatch_prediction_analytical(self):
        result = await llama_engine.analyze_shipping_order(
            origin="Mumbai Port JNPT, India",
            destination="Jaipur Special Economic Zone, India",
            item_name="Automotive Powertrain Units",
            quantity=5,
            weight_kg=600.0,
            priority="Express",
        )

        self.assertIn("order_id", result)
        self.assertIn("transit_time_prediction", result)
        self.assertGreater(result["transit_time_prediction"]["estimated_days"], 0)
        self.assertGreater(result["transit_time_prediction"]["distance_km"], 500)

        # Geopolitical uncertainty
        geo = result["geopolitical_uncertainty_analysis"]
        self.assertIn("risk_score", geo)
        self.assertIn("risk_level", geo)
        self.assertTrue(len(geo["active_factors"]) > 0)

        # Route change
        reroute = result["route_rerouting_strategy"]
        self.assertIn("primary_route", reroute)
        self.assertIn("contingency_reroute", reroute)
        self.assertIn("how_track_changes", reroute)

        # Warehouse selection & capacity
        wh = result["warehouse_selection_and_capacity"]
        self.assertIn("recommended_warehouse_name", wh)
        self.assertGreater(wh["safety_rating"], 80)
        self.assertGreater(wh["available_capacity_pct"], 0)

        # Summary
        self.assertIn("llm_summary", result)

    def test_api_endpoint(self):
        app = create_app()
        client = TestClient(app)
        response = client.post("/api/ai/dispatch-analysis", json={
            "origin": "Delhi Northern Freight Complex, India",
            "destination": "Hamburg Logistics Gateway, Germany",
            "item_name": "Medical Vaccines",
            "quantity": 10,
            "weight_kg": 150.0,
            "priority": "Critical Sovereign",
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("order_id", data)
        self.assertIn("transit_time_prediction", data)
        self.assertIn("geopolitical_uncertainty_analysis", data)
        self.assertIn("warehouse_selection_and_capacity", data)

    def test_connection_endpoint(self):
        app = create_app()
        client = TestClient(app)
        response = client.post("/api/ai/test-local-connection", json={
            "endpoint_url": "http://127.0.0.1:11434"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("message", data)


if __name__ == "__main__":
    unittest.main()
