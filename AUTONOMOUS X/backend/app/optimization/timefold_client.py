"""Timefold Solver Open Source (Apache 2.0) REST client for CVRPTW with Bavet engine."""

import logging
import os
from time import perf_counter
from typing import Any
import httpx
from pydantic import BaseModel, Field

from app.optimization.models import (
    VehicleRoute as OrToolsVehicleRoute,
    VehicleRoutingInput,
    VehicleRoutingSolution,
)
from app.optimization.ortools_solver import OrToolsRoutingSolver

logger = logging.getLogger(__name__)


class TimefoldVehicle(BaseModel):
    id: str
    depot_lat: float
    depot_lon: float
    capacity_kg: float
    available: bool = True


class TimefoldOrder(BaseModel):
    id: str
    delivery_lat: float
    delivery_lon: float
    weight_kg: float
    priority: int = 3
    latest_arrival_s: float = 86400.0


class TimefoldSolverRequest(BaseModel):
    solve_id: str | None = None
    vehicles: list[TimefoldVehicle]
    orders: list[TimefoldOrder]
    time_matrix: list[list[float]]
    freeze_window_stops: int = 2
    time_limit_s: int = 5


class TimefoldRouteStop(BaseModel):
    order_id: str
    sequence: int
    estimated_arrival_s: float = 0.0


class TimefoldVehicleRoute(BaseModel):
    vehicle_id: str
    stops: list[TimefoldRouteStop] = Field(default_factory=list)
    total_time_s: float = 0.0
    total_distance_m: float = 0.0


class TimefoldSolverResponse(BaseModel):
    solve_id: str
    status: str  # FEASIBLE, OPTIMAL, INFEASIBLE, FALLBACK_ORTOOLS
    routes: list[TimefoldVehicleRoute] = Field(default_factory=list)
    unassigned_order_ids: list[str] = Field(default_factory=list)
    score: str = "0hard/0soft"
    solver: str = "timefold_bavet_oss"
    solver_time_s: float = 0.0


class TimefoldClient:
    """Client for Timefold Solver Open Source service with automatic OR-Tools fallback."""

    def __init__(self, base_url: str | None = None, timeout_s: float = 10.0) -> None:
        self.base_url = (base_url or os.getenv("TIMEFOLD_URL", "http://localhost:8080")).rstrip("/")
        self.timeout_s = timeout_s
        self.ortools_fallback = OrToolsRoutingSolver()

    async def is_available(self) -> bool:
        """Check if Timefold Open Source service is reachable."""
        if os.getenv("ENABLE_TIMEFOLD", "false").lower() not in ("true", "1", "yes"):
            return False
        try:
            async with httpx.AsyncClient(timeout=0.5) as client:
                res = await client.get(f"{self.base_url}/actuator/health")
                return res.status_code == 200
        except Exception:
            return False

    async def solve_sync(self, request: TimefoldSolverRequest) -> TimefoldSolverResponse:
        """Solve CVRPTW with Timefold Open Source; fall back to OR-Tools if unavailable."""
        started = perf_counter()

        # Try Timefold service if available
        if await self.is_available():
            try:
                async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                    res = await client.post(
                        f"{self.base_url}/api/cvrptw/solve",
                        json=request.model_dump(mode="json"),
                    )
                    if res.status_code == 200:
                        data = res.json()
                        data["solver_time_s"] = perf_counter() - started
                        data["solver"] = "timefold_bavet_oss"
                        return TimefoldSolverResponse.model_validate(data)
            except Exception as exc:
                logger.warning("Timefold solve request failed (%s); falling back to OR-Tools", exc)

        # OR-Tools Fallback
        logger.info("Solving CVRPTW using Google OR-Tools fallback solver")
        return self._solve_with_ortools(request, started)

    def _solve_with_ortools(self, request: TimefoldSolverRequest, started: float) -> TimefoldSolverResponse:
        """Adapter converting Timefold request to OR-Tools and mapping back."""
        order_ids = tuple(order.id for order in request.orders)
        order_node_indices = tuple(range(len(request.vehicles), len(request.vehicles) + len(request.orders)))
        capacities = tuple(int(v.capacity_kg) for v in request.vehicles)
        demands = (0,) * len(request.vehicles) + tuple(int(o.weight_kg) for o in request.orders)
        available = tuple(v.available for v in request.vehicles)
        starts = tuple(range(len(request.vehicles)))
        ends = tuple(range(len(request.vehicles)))

        # Convert matrix to integers
        int_matrix = tuple(tuple(int(val) for val in row) for row in request.time_matrix)

        problem = VehicleRoutingInput(
            time_matrix=int_matrix,
            order_node_indices=order_node_indices,
            order_ids=order_ids,
            demands=demands,
            vehicle_capacities=capacities,
            vehicle_starts=starts,
            vehicle_ends=ends,
            vehicle_available=available,
            max_route_duration_s=28800,
        )

        solution: VehicleRoutingSolution = self.ortools_fallback.solve(problem)
        elapsed = perf_counter() - started

        routes: list[TimefoldVehicleRoute] = []
        for v_route in solution.routes:
            stops = [
                TimefoldRouteStop(
                    order_id=oid,
                    sequence=seq,
                    estimated_arrival_s=float(v_route.arrival_times_s[seq]) if seq < len(v_route.arrival_times_s) else 0.0,
                )
                for seq, oid in enumerate(v_route.order_ids)
            ]
            routes.append(
                TimefoldVehicleRoute(
                    vehicle_id=request.vehicles[v_route.vehicle_index].id,
                    stops=stops,
                    total_time_s=float(v_route.total_time_s),
                    total_distance_m=float(v_route.total_time_s * 7.0),  # approx at ~25 km/h
                )
            )

        return TimefoldSolverResponse(
            solve_id=request.solve_id or "ortools-fallback",
            status="FEASIBLE" if solution.feasible else "INFEASIBLE",
            routes=routes,
            unassigned_order_ids=list(solution.unassigned_order_ids),
            score=f"{len(solution.unassigned_order_ids)}unassigned/{int(solution.objective_value or 0)}time",
            solver="ortools_fallback",
            solver_time_s=elapsed,
        )

