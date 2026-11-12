"""Unit tests for real-time vehicle telemetry emitter and stop completion."""

import asyncio
import unittest

from app.events.kafka.producer import KafkaEventProducer
from app.events.kafka.schemas import KafkaEventEnvelope
from app.events.kafka.topics import DELIVERIES_COMPLETED, VEHICLES_POSITION
from app.telemetry.vehicle_emitter import (
    ActiveVehicleTracker,
    VehicleStop,
    VehicleTelemetryEmitter,
    calculate_bearing_deg,
)


class TestVehicleEmitter(unittest.TestCase):
    def test_calculate_bearing(self) -> None:
        # Moving north: lat increases, lon constant -> heading 0 deg
        heading_north = calculate_bearing_deg(12.0, 77.0, 13.0, 77.0)
        self.assertAlmostEqual(heading_north, 0.0, delta=0.5)

        # Moving east: lat constant, lon increases -> heading ~90 deg
        heading_east = calculate_bearing_deg(12.0, 77.0, 12.0, 78.0)
        self.assertAlmostEqual(heading_east, 90.0, delta=0.5)

    def test_tracker_movement_and_stop_completion(self) -> None:
        waypoints = [
            (12.9705, 77.5905),
            (12.9710, 77.5910),
        ]
        stop = VehicleStop(order_id="ord-99", latitude=12.9705, longitude=77.5905)
        tracker = ActiveVehicleTracker(
            vehicle_id="veh-1",
            latitude=12.9700,
            longitude=77.5900,
            speed_kph=60.0,
            waypoints=waypoints,
            stops=[stop],
        )

        # 60 km/h for 15s = 250m budget, enough to reach (12.9705, 77.5905) which is ~75m away
        completed = tracker.advance(15.0)
        self.assertIn("ord-99", completed)
        self.assertTrue(stop.completed)

    def test_telemetry_emitter_step_once(self) -> None:
        async def run_test() -> None:
            emitted_positions: list[KafkaEventEnvelope] = []
            emitted_deliveries: list[KafkaEventEnvelope] = []

            producer = KafkaEventProducer()
            producer.subscribe_in_memory(VEHICLES_POSITION, lambda env: emitted_positions.append(env))
            producer.subscribe_in_memory(DELIVERIES_COMPLETED, lambda env: emitted_deliveries.append(env))

            # Stop placed right at the first waypoint (50m away)
            emitter = VehicleTelemetryEmitter(producer=producer, emit_interval_s=5.0)
            emitter.register_vehicle_route(
                vehicle_id="v-test",
                initial_lat=12.9700,
                initial_lon=77.5900,
                waypoints=[(12.9703, 77.5903), (12.9708, 77.5908)],
                stops=[{"order_id": "ord-1", "latitude": 12.9703, "longitude": 77.5903}],
                speed_kph=60.0,
            )

            positions = await emitter.step_once()
            self.assertEqual(len(positions), 1)
            self.assertEqual(positions[0]["vehicle_id"], "v-test")
            self.assertTrue(positions[0]["h3_r8"].startswith("88"))

            self.assertGreater(len(emitted_positions), 0)
            self.assertGreater(len(emitted_deliveries), 0)

        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()
