"""Typed disruption records that can be persisted or replayed."""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Mapping


class IncidentKind(StrEnum):
    TRAFFIC = "traffic"
    ROAD_CLOSURE = "road_closure"
    VEHICLE_BREAKDOWN = "vehicle_breakdown"
    WAREHOUSE_OUTAGE = "warehouse_outage"
    WEATHER = "weather"
    URGENT_ORDER = "urgent_order"


@dataclass(frozen=True)
class Incident:
    id: str
    kind: IncidentKind
    simulation_run_id: str
    occurred_at_s: float
    severity: int = 1
    affected_entity_id: str | None = None
    affected_edge: tuple[str, str] | None = None
    details: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.id or not self.simulation_run_id:
            raise ValueError("incident id and simulation run id are required")
        if self.occurred_at_s < 0 or not 1 <= self.severity <= 5:
            raise ValueError("incident time must be nonnegative and severity must be from 1 to 5")
        if self.kind in {IncidentKind.ROAD_CLOSURE, IncidentKind.TRAFFIC} and self.affected_edge is None:
            raise ValueError("road incidents require an affected directed edge")
