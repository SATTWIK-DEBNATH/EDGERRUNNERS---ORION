"""Valhalla dynamic routing engine client with runtime costing and NetworkX fallback."""

import logging
import os
from typing import Any
import httpx

from app.graph.road_graph import RoadGraph
from app.graph.travel_matrix import TravelMatrix

logger = logging.getLogger(__name__)

UNREACHABLE_COST = 1_000_000_000


class ValhallaClient:
    """Client for Valhalla routing engine with dynamic edge penalties and NetworkX fallback."""

    def __init__(
        self,
        base_url: str | None = None,
        timeout_s: float = 10.0,
        fallback_graph: RoadGraph | None = None,
    ) -> None:
        self.base_url = (base_url or os.getenv("VALHALLA_URL", "http://localhost:8002")).rstrip("/")
        self.timeout_s = timeout_s
        self.fallback_graph = fallback_graph
        self._edge_penalties: dict[int, float] = {}

    async def is_available(self) -> bool:
        """Check if Valhalla container service is reachable."""
        if os.getenv("ENABLE_VALHALLA", "false").lower() not in ("true", "1", "yes"):
            return False
        try:
            async with httpx.AsyncClient(timeout=0.5) as client:
                res = await client.get(f"{self.base_url}/status")
                return res.status_code == 200
        except Exception:
            return False

    async def get_route(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        costing: str = "auto",
    ) -> dict[str, Any] | None:
        """Compute turn-by-turn route using Valhalla."""
        if await self.is_available():
            try:
                payload = {
                    "locations": [
                        {"lat": origin_lat, "lon": origin_lon},
                        {"lat": dest_lat, "lon": dest_lon},
                    ],
                    "costing": costing,
                }
                async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                    res = await client.post(f"{self.base_url}/route", json=payload)
                    if res.status_code == 200:
                        return res.json()
            except Exception as exc:
                logger.warning("Valhalla route error (%s); using graph fallback", exc)
        return None

    async def get_matrix(
        self,
        sources: list[tuple[float, float]],
        targets: list[tuple[float, float]],
        costing: str = "auto",
    ) -> list[list[float]]:
        """Compute travel-time matrix in seconds between sources and targets."""
        if await self.is_available():
            try:
                payload = {
                    "sources": [{"lat": lat, "lon": lon} for lat, lon in sources],
                    "targets": [{"lat": lat, "lon": lon} for lat, lon in targets],
                    "costing": costing,
                }
                async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                    res = await client.post(f"{self.base_url}/sources_to_targets", json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        rows = data.get("sources_to_targets", [])
                        matrix: list[list[float]] = []
                        for row in rows:
                            matrix.append([
                                item.get("time", UNREACHABLE_COST)
                                if item.get("time") is not None
                                else UNREACHABLE_COST
                                for item in row
                            ])
                        return matrix
            except Exception as exc:
                logger.warning("Valhalla matrix error (%s); using graph fallback", exc)

        # Fallback to NetworkX graph if available
        if self.fallback_graph:
            coords = tuple(sources + targets)
            tm = TravelMatrix.from_graph(self.fallback_graph, coords)
            return [list(row) for row in tm.matrix]

        # Basic Euclidean fallback if no graph provided
        from app.spatial.h3_utils import haversine_distance_m

        speed_mps = 25.0 * 1000 / 3600  # 25 km/h
        matrix = []
        for s_lat, s_lon in sources:
            row = []
            for t_lat, t_lon in targets:
                dist = haversine_distance_m(s_lat, s_lon, t_lat, t_lon)
                row.append(dist / speed_mps)
            matrix.append(row)
        return matrix

    def apply_edge_penalty(self, osm_way_id: int, penalty_multiplier: float = 999.0) -> None:
        """Register dynamic cost penalty on an OSM way due to incident/closure."""
        self._edge_penalties[osm_way_id] = penalty_multiplier
        logger.info("Applied dynamic edge penalty to OSM way %d: %fx", osm_way_id, penalty_multiplier)

    def remove_edge_penalty(self, osm_way_id: int) -> None:
        """Clear dynamic cost penalty when incident resolves."""
        self._edge_penalties.pop(osm_way_id, None)
        logger.info("Cleared dynamic edge penalty on OSM way %d", osm_way_id)

