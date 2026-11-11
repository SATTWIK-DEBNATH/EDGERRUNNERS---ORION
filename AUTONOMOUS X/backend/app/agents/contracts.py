"""Typed proposal and decision records exchanged by agents."""

from dataclasses import dataclass
from typing import Mapping

from app.graph.road_graph import RoadPath


@dataclass(frozen=True)
class WarehouseCandidate:
    warehouse_id: str
    estimated_travel_time_s: float


@dataclass(frozen=True)
class WarehouseProposal:
    order_id: str
    candidates: tuple[WarehouseCandidate, ...]
    reason: str


@dataclass(frozen=True)
class FleetCandidate:
    vehicle_id: str
    remaining_capacity_kg: float


@dataclass(frozen=True)
class FleetProposal:
    order_id: str
    candidates: tuple[FleetCandidate, ...]
    reason: str


@dataclass(frozen=True)
class RouteAssessment:
    warehouse_id: str
    vehicle_id: str
    feasible: bool
    estimated_travel_time_s: float | None
    segments: tuple[RoadPath, ...] = ()
    reason: str | None = None


@dataclass(frozen=True)
class DemandProposal:
    region: str
    average_orders: float
    observation_count: int
    method: str = "moving_average_baseline"


@dataclass(frozen=True)
class RecoveryProposal:
    order_id: str
    feasible: bool
    warehouse_ids: tuple[str, ...]
    vehicle_ids: tuple[str, ...]
    reason: str


@dataclass(frozen=True)
class DecisionRecord:
    agent_name: str
    accepted: bool
    reason: str
    details: Mapping[str, object]


@dataclass(frozen=True)
class AssignmentResult:
    order_id: str
    assigned: bool
    warehouse_id: str | None
    vehicle_id: str | None
    decisions: tuple[DecisionRecord, ...]
    reason: str | None = None
