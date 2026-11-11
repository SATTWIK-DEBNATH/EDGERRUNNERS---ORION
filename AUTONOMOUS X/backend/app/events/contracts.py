"""Versioned event envelope shared by simulation and coordination modules."""

from dataclasses import dataclass
from typing import Mapping


@dataclass(frozen=True)
class LogisticsEvent:
    event_id: str
    event_type: str
    simulation_run_id: str
    occurred_at_s: float
    payload: Mapping[str, object]
    schema_version: int = 1

    def __post_init__(self) -> None:
        if not self.event_id or not self.event_type or not self.simulation_run_id:
            raise ValueError("event id, type, and simulation run id are required")
        if self.occurred_at_s < 0 or self.schema_version <= 0:
            raise ValueError("event time must be nonnegative and schema version positive")
