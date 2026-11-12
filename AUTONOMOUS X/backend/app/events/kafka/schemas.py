"""Pydantic schemas for the versioned Kafka event envelope and typed payloads."""

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4
from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class KafkaEventEnvelope(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    schema_version: int = 1
    occurred_at: datetime = Field(default_factory=utc_now)
    run_id: str | None = None
    entity_id: str | None = None
    idempotency_key: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class OrderCreatedPayload(BaseModel):
    order_id: str
    location_id: str
    item_id: str
    quantity: int
    weight_kg: float
    priority: int = 3
    urgent: bool = False
    h3_cell_r8: str | None = None


class OrderUpdatedPayload(BaseModel):
    order_id: str
    status: str
    warehouse_id: str | None = None
    vehicle_id: str | None = None
    reason: str | None = None


class VehiclePositionPayload(BaseModel):
    vehicle_id: str
    latitude: float
    longitude: float
    h3_r8: str
    h3_r9: str
    speed_kph: float = 0.0
    heading_deg: float = 0.0
    remaining_capacity_kg: float
    current_load_kg: float
    eta_seconds: float | None = None


class VehicleStatusPayload(BaseModel):
    vehicle_id: str
    status: str  # idle, in_transit, broken_down, maintenance
    available: bool
    current_route_id: str | None = None


class WarehouseStatusPayload(BaseModel):
    warehouse_id: str
    available: bool
    reason: str | None = None


class InventoryUpdatedPayload(BaseModel):
    warehouse_id: str
    item_id: str
    delta: int
    new_quantity: int
    operation: str  # reserve, release, restock


class IncidentCreatedPayload(BaseModel):
    incident_id: str = Field(default_factory=lambda: str(uuid4()))
    kind: str  # traffic, road_closure, vehicle_breakdown, warehouse_outage
    h3_cell: str | None = None
    start_node: str | None = None
    end_node: str | None = None
    entity_id: str | None = None
    severity: float = 1.0
    status: str = "active"


class IncidentCorrelatedPayload(BaseModel):
    incident_id: str
    affected_route_ids: list[str]
    affected_vehicle_ids: list[str]
    affected_order_ids: list[str]
    correlation_rule: str
    detection_latency_s: float


class RouteAssignedPayload(BaseModel):
    route_id: str
    vehicle_id: str
    warehouse_id: str
    order_ids: list[str]
    total_distance_m: float
    total_time_s: float
    solver: str  # timefold_bavet, ortools_fallback, greedy_baseline
    freeze_stops: int = 2
    waypoints: list[dict[str, Any]] = Field(default_factory=list)


class RouteUpdatedPayload(BaseModel):
    route_id: str
    vehicle_id: str
    revised_order_ids: list[str]
    completed_order_ids: list[str]
    solver: str
    reason: str


class DeliveryCompletedPayload(BaseModel):
    order_id: str
    vehicle_id: str
    location_id: str
    completed_at: datetime = Field(default_factory=utc_now)
    on_time: bool = True
    delay_s: float = 0.0


class AgentDecisionPayload(BaseModel):
    agent: str  # coordinator, warehouse, fleet, routing, demand, recovery
    order_id: str | None = None
    action: str
    accepted: bool
    authorized_by_cedar: bool = True
    cedar_decision: str = "ALLOW"
    reason: str
    details: dict[str, Any] = Field(default_factory=dict)


class ForecastUpdatedPayload(BaseModel):
    h3_resolution: int = 8
    model_name: str  # graph_wavenet, random_forest, moving_average
    predictions: dict[str, float]  # h3_cell -> predicted order count
    mae: float
    rmse: float
    prediction_horizon_minutes: int = 60


class MetricsSnapshotPayload(BaseModel):
    total_orders: int
    delivered_orders: int
    pending_orders: int
    unfulfilled_orders: int
    active_vehicles: int
    fleet_utilization: float
    on_time_rate: float
    average_delivery_time_s: float
    total_distance_m: float
    active_incidents: int

