"""Real-time vehicle telemetry emitter for continuous GPS streaming in wall-clock time."""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
import logging
from math import atan2, cos, degrees, radians, sin
from typing import Any, Callable

from app.events.kafka.producer import KafkaEventProducer
from app.events.kafka.schemas import (
    DeliveryCompletedPayload,
    KafkaEventEnvelope,
    VehiclePositionPayload,
    VehicleStatusPayload,
)
from app.events.kafka.topics import (
    DELIVERIES_COMPLETED,
    VEHICLES_POSITION,
    VEHICLES_STATUS,
)
from app.spatial.h3_utils import (
    RESOLUTION_MICRO,
    RESOLUTION_URBAN,
    encode_h3,
    haversine_distance_m,
)

logger = logging.getLogger(__name__)


def calculate_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate forward compass heading in degrees from point 1 to point 2."""
    r_lat1, r_lon1, r_lat2, r_lon2 = map(radians, (lat1, lon1, lat2, lon2))
    dlon = r_lon2 - r_lon1
    y = sin(dlon) * cos(r_lat2)
    x = cos(r_lat1) * sin(r_lat2) - sin(r_lat1) * cos(r_lat2) * cos(dlon)
    bearing = degrees(atan2(y, x))
    return (bearing + 360) % 360


@dataclass
class VehicleStop:
    order_id: str
    latitude: float
    longitude: float
    completed: bool = False


@dataclass
class ActiveVehicleTracker:
    vehicle_id: str
    latitude: float
    longitude: float
    capacity_kg: float = 100.0
    current_load_kg: float = 0.0
    speed_kph: float = 30.0
    heading_deg: float = 0.0
    waypoints: list[tuple[float, float]] = field(default_factory=list)
    stops: list[VehicleStop] = field(default_factory=list)
    waypoint_index: int = 0
    in_transit: bool = True

    def advance(self, dt_seconds: float) -> list[str]:
        """Move vehicle along waypoints and check for stop completions."""
        if not self.in_transit or self.waypoint_index >= len(self.waypoints):
            self.in_transit = False
            return []

        completed_order_ids: list[str] = []
        distance_budget_m = (self.speed_kph * 1000 / 3600) * dt_seconds

        while distance_budget_m > 0 and self.waypoint_index < len(self.waypoints):
            target_lat, target_lon = self.waypoints[self.waypoint_index]
            dist_to_next = haversine_distance_m(self.latitude, self.longitude, target_lat, target_lon)

            if dist_to_next <= distance_budget_m:
                # Reached waypoint
                self.latitude = target_lat
                self.longitude = target_lon
                distance_budget_m -= dist_to_next
                self.waypoint_index += 1

                # Check if this waypoint completes any pending stops
                for stop in self.stops:
                    if not stop.completed:
                        stop_dist = haversine_distance_m(self.latitude, self.longitude, stop.latitude, stop.longitude)
                        if stop_dist <= 75.0:  # 75 meter arrival radius
                            stop.completed = True
                            completed_order_ids.append(stop.order_id)
            else:
                # Partial movement towards next waypoint
                ratio = distance_budget_m / dist_to_next if dist_to_next > 0 else 1.0
                self.heading_deg = calculate_bearing_deg(self.latitude, self.longitude, target_lat, target_lon)
                self.latitude += (target_lat - self.latitude) * ratio
                self.longitude += (target_lon - self.longitude) * ratio
                distance_budget_m = 0.0

        # Check for stop completions at current position
        for stop in self.stops:
            if not stop.completed:
                stop_dist = haversine_distance_m(self.latitude, self.longitude, stop.latitude, stop.longitude)
                if stop_dist <= 75.0:  # 75 meter arrival radius
                    stop.completed = True
                    completed_order_ids.append(stop.order_id)

        if self.waypoint_index >= len(self.waypoints):
            self.in_transit = False

        return completed_order_ids


class VehicleTelemetryEmitter:
    """Emits high-frequency telemetry GPS events and delivery completions to Kafka."""

    def __init__(
        self,
        producer: KafkaEventProducer | None = None,
        emit_interval_s: float = 2.0,
        speed_multiplier: float = 1.0,
    ) -> None:
        self.producer = producer or KafkaEventProducer()
        self.emit_interval_s = emit_interval_s
        self.speed_multiplier = speed_multiplier
        self.trackers: dict[str, ActiveVehicleTracker] = {}
        self._running = False
        self._task: asyncio.Task | None = None
        self._delivery_callbacks: list[Callable[[str, str], Any]] = []

    def on_delivery(self, callback: Callable[[str, str], Any]) -> None:
        self._delivery_callbacks.append(callback)

    def register_vehicle_route(
        self,
        vehicle_id: str,
        initial_lat: float,
        initial_lon: float,
        waypoints: list[tuple[float, float]],
        stops: list[dict[str, Any]],
        capacity_kg: float = 100.0,
        current_load_kg: float = 20.0,
        speed_kph: float = 30.0,
    ) -> None:
        """Register or update an active vehicle route for continuous movement."""
        vehicle_stops = [
            VehicleStop(
                order_id=s["order_id"],
                latitude=s["latitude"],
                longitude=s["longitude"],
            )
            for s in stops
        ]
        self.trackers[vehicle_id] = ActiveVehicleTracker(
            vehicle_id=vehicle_id,
            latitude=initial_lat,
            longitude=initial_lon,
            capacity_kg=capacity_kg,
            current_load_kg=current_load_kg,
            speed_kph=speed_kph * self.speed_multiplier,
            waypoints=waypoints,
            stops=vehicle_stops,
            in_transit=True,
        )
        logger.info("Registered telemetry tracker for vehicle %s (%d waypoints, %d stops)", vehicle_id, len(waypoints), len(stops))

    async def start(self) -> None:
        """Start the background telemetry emitter loop."""
        self._running = True
        self._task = asyncio.create_task(self._emitter_loop())
        logger.info("VehicleTelemetryEmitter started (interval: %.1fs, speed: %.1fx)", self.emit_interval_s, self.speed_multiplier)

    async def stop(self) -> None:
        """Stop the background emitter loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("VehicleTelemetryEmitter stopped")

    async def step_once(self) -> list[dict[str, Any]]:
        """Advance all vehicles by one interval, publish telemetry to Kafka, and return position snapshots."""
        positions: list[dict[str, Any]] = []

        for vehicle_id, tracker in list(self.trackers.items()):
            if not tracker.in_transit:
                continue

            completed_orders = tracker.advance(self.emit_interval_s)

            # Compute H3 cells at Urban (res 8) and Micro (res 9)
            h3_r8 = encode_h3(tracker.latitude, tracker.longitude, RESOLUTION_URBAN)
            h3_r9 = encode_h3(tracker.latitude, tracker.longitude, RESOLUTION_MICRO)

            payload = VehiclePositionPayload(
                vehicle_id=vehicle_id,
                latitude=tracker.latitude,
                longitude=tracker.longitude,
                h3_r8=h3_r8,
                h3_r9=h3_r9,
                speed_kph=tracker.speed_kph,
                heading_deg=round(tracker.heading_deg, 1),
                remaining_capacity_kg=tracker.capacity_kg - tracker.current_load_kg,
                current_load_kg=tracker.current_load_kg,
                eta_seconds=max(0, (len(tracker.waypoints) - tracker.waypoint_index) * 20),
            )
            positions.append(payload.model_dump())

            # Produce to Kafka: ax.vehicles.position
            envelope = KafkaEventEnvelope(
                event_type="vehicle.position",
                entity_id=vehicle_id,
                payload=payload.model_dump(),
            )
            await self.producer.produce(VEHICLES_POSITION, envelope)

            # Handle delivery completions
            for order_id in completed_orders:
                deliv_payload = DeliveryCompletedPayload(
                    order_id=order_id,
                    vehicle_id=vehicle_id,
                    location_id=f"loc-{order_id}",
                    on_time=True,
                )
                deliv_env = KafkaEventEnvelope(
                    event_type="delivery.completed",
                    entity_id=order_id,
                    payload=deliv_payload.model_dump(),
                )
                await self.producer.produce(DELIVERIES_COMPLETED, deliv_env)
                for cb in self._delivery_callbacks:
                    try:
                        res = cb(vehicle_id, order_id)
                        if hasattr(res, "__await__"):
                            await res
                    except Exception as cb_err:
                        logger.error("Error in delivery callback: %s", cb_err)

            # Route completion
            if not tracker.in_transit:
                status_payload = VehicleStatusPayload(
                    vehicle_id=vehicle_id,
                    status="idle",
                    available=True,
                )
                status_env = KafkaEventEnvelope(
                    event_type="vehicle.status",
                    entity_id=vehicle_id,
                    payload=status_payload.model_dump(),
                )
                await self.producer.produce(VEHICLES_STATUS, status_env)

        return positions

    async def _emitter_loop(self) -> None:
        while self._running:
            try:
                await self.step_once()
                await asyncio.sleep(self.emit_interval_s)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Error in telemetry emitter loop: %s", exc)
                await asyncio.sleep(self.emit_interval_s)
