"""Solver boundary models; no solver-specific object escapes this module."""

from dataclasses import dataclass


@dataclass(frozen=True)
class VehicleRoutingInput:
    time_matrix: tuple[tuple[int, ...], ...]
    order_node_indices: tuple[int, ...]
    order_ids: tuple[str, ...]
    demands: tuple[int, ...]
    vehicle_capacities: tuple[int, ...]
    vehicle_starts: tuple[int, ...]
    vehicle_ends: tuple[int, ...]
    vehicle_available: tuple[bool, ...] = ()
    order_priorities: tuple[int, ...] = ()
    time_windows: tuple[tuple[int, int], ...] | None = None
    max_route_duration_s: int = 86_400
    unassigned_penalty: int = 1_000_000

    def __post_init__(self) -> None:
        node_count = len(self.time_matrix)
        if node_count == 0 or any(len(row) != node_count for row in self.time_matrix):
            raise ValueError("travel-time matrix must be nonempty and square")
        if any(not isinstance(value, int) or value < 0 for row in self.time_matrix for value in row):
            raise ValueError("travel-time matrix entries must be nonnegative integer seconds")
        if len(self.order_node_indices) != len(self.order_ids) or len(set(self.order_ids)) != len(self.order_ids):
            raise ValueError("order node indices and unique order ids must have equal lengths")
        if len(set(self.order_node_indices)) != len(self.order_node_indices):
            raise ValueError("each order must have its own matrix node")
        if len(self.demands) != node_count or any(demand < 0 for demand in self.demands):
            raise ValueError("demands must be nonnegative and match the matrix")
        vehicle_count = len(self.vehicle_capacities)
        if vehicle_count == 0 or len(self.vehicle_starts) != vehicle_count or len(self.vehicle_ends) != vehicle_count:
            raise ValueError("capacities, starts, and ends must define the same nonzero vehicle count")
        if any(capacity < 0 for capacity in self.vehicle_capacities):
            raise ValueError("vehicle capacities must be nonnegative")
        for node in (*self.order_node_indices, *self.vehicle_starts, *self.vehicle_ends):
            if not 0 <= node < node_count:
                raise ValueError(f"matrix node index out of range: {node}")
        depot_nodes = set(self.vehicle_starts) | set(self.vehicle_ends)
        if depot_nodes.intersection(self.order_node_indices):
            raise ValueError("delivery order nodes must be distinct from depot nodes")
        if any(self.demands[node] for node in depot_nodes):
            raise ValueError("depot nodes must have zero demand")
        if self.vehicle_available and len(self.vehicle_available) != vehicle_count:
            raise ValueError("vehicle availability must have one value per vehicle")
        if not self.vehicle_available:
            object.__setattr__(self, "vehicle_available", tuple(True for _ in range(vehicle_count)))
        if self.order_priorities and (
            len(self.order_priorities) != len(self.order_ids)
            or any(not 1 <= priority <= 5 for priority in self.order_priorities)
        ):
            raise ValueError("order priorities must contain one value from 1 to 5 per order")
        if not self.order_priorities:
            object.__setattr__(self, "order_priorities", tuple(3 for _ in self.order_ids))
        if self.time_windows is not None:
            if len(self.time_windows) != node_count or any(
                start < 0 or end < start for start, end in self.time_windows
            ):
                raise ValueError("time windows must be valid nonnegative ranges for every matrix node")
        if self.max_route_duration_s <= 0 or self.unassigned_penalty <= 0:
            raise ValueError("route duration and unassigned penalty must be positive")


@dataclass(frozen=True)
class VehicleRoute:
    vehicle_index: int
    node_indices: tuple[int, ...]
    order_ids: tuple[str, ...]
    total_time_s: int
    total_load: int
    arrival_times_s: tuple[int, ...]


@dataclass(frozen=True)
class VehicleRoutingSolution:
    solver_status: str
    routes: tuple[VehicleRoute, ...]
    unassigned_order_ids: tuple[str, ...]
    objective_value: int | None
    runtime_ms: int
    feasible: bool
    reason: str | None = None

    @property
    def assigned_order_ids(self) -> tuple[str, ...]:
        return tuple(order_id for route in self.routes for order_id in route.order_ids)
