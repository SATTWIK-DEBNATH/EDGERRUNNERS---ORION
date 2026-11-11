"""Typed recovery outputs and route stability controls."""

from dataclasses import dataclass

from app.agents.contracts import AssignmentResult
from app.domain.incidents import Incident
from app.graph.road_graph import RoadPath


@dataclass(frozen=True)
class RecoveryAction:
    incident: Incident
    affected_order_ids: tuple[str, ...]
    reassigned_order_ids: tuple[str, ...]
    unresolved_order_ids: tuple[str, ...]
    assignment_results: tuple[AssignmentResult, ...] = ()
    route_updates: tuple[str, ...] = ()


@dataclass(frozen=True)
class RouteStabilityPolicy:
    minimum_improvement_ratio: float = 0.1
    freeze_next_stop: bool = True

    def __post_init__(self) -> None:
        if not 0 <= self.minimum_improvement_ratio < 1:
            raise ValueError("minimum improvement ratio must be in [0, 1)")

    def should_reoptimize(
        self,
        current_cost: float,
        proposed_cost: float,
        *,
        frozen: bool = False,
        force: bool = False,
    ) -> bool:
        if self.freeze_next_stop and frozen:
            return False
        if force:
            return True
        if current_cost <= 0:
            return proposed_cost < current_cost
        return (current_cost - proposed_cost) / current_cost >= self.minimum_improvement_ratio


def path_cost(path: RoadPath, graph) -> float:
    total = path.start_access_time_s + path.end_access_time_s
    for start, end in zip(path.node_ids, path.node_ids[1:]):
        edge = graph.edges[start, end]
        if edge.get("closed", False):
            return float("inf")
        total += edge["travel_time_s"]
    return total
