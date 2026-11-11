"""Directed weighted road graph independent of API and database models."""

from dataclasses import dataclass
from math import asin, cos, radians, sin, sqrt
from typing import Any

import networkx as nx


@dataclass(frozen=True)
class RoadEdge:
    start: str
    end: str
    distance_m: float
    travel_time_s: float
    road_type: str = "road"

    def __post_init__(self) -> None:
        if self.distance_m < 0 or self.travel_time_s <= 0:
            raise ValueError("edge distance must be nonnegative and travel time positive")


@dataclass(frozen=True)
class RoadPath:
    node_ids: tuple[str, ...]
    distance_m: float
    travel_time_s: float
    source: str
    start_access_time_s: float
    end_access_time_s: float


def _haversine_m(point_a: tuple[float, float], point_b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(radians, (*point_a, *point_b))
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 6_371_000 * 2 * asin(sqrt(a))


class RoadGraph:
    def __init__(self, graph: nx.DiGraph, source: str, fallback_reason: str | None = None) -> None:
        self.graph = graph
        self.source = source
        self.fallback_reason = fallback_reason
        if not graph.is_directed():
            raise ValueError("road graph must be directed")

    @classmethod
    def from_edges(
        cls,
        nodes: dict[str, tuple[float, float]],
        edges: list[RoadEdge] | tuple[RoadEdge, ...],
        source: str = "synthetic_fallback",
    ) -> "RoadGraph":
        graph = nx.DiGraph()
        for node_id, (latitude, longitude) in nodes.items():
            if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
                raise ValueError(f"invalid coordinates for graph node {node_id}")
            graph.add_node(node_id, latitude=latitude, longitude=longitude)
        for edge in edges:
            if edge.start not in graph or edge.end not in graph:
                raise ValueError(f"edge references missing node: {edge.start}->{edge.end}")
            graph.add_edge(
                edge.start,
                edge.end,
                distance_m=float(edge.distance_m),
                travel_time_s=float(edge.travel_time_s),
                road_type=edge.road_type,
                closed=False,
            )
        if not graph:
            raise ValueError("road graph must contain at least one node")
        return cls(graph, source)

    @classmethod
    def from_networkx(cls, graph: Any, source: str) -> "RoadGraph":
        """Normalize OSMnx graphs to a simple directed graph, keeping fastest parallel edge."""
        normalized = nx.DiGraph()
        for node_id, data in graph.nodes(data=True):
            normalized.add_node(node_id, latitude=float(data["y"]), longitude=float(data["x"]))
        for start, end, data in graph.edges(data=True):
            best = normalized.get_edge_data(start, end)
            distance = float(data.get("length", 0.0))
            speed = float(data.get("speed_kph", 25.0) or 25.0)
            travel_time = float(data.get("travel_time", distance / max(speed / 3.6, 0.1)))
            if best is None or travel_time < best["travel_time_s"]:
                normalized.add_edge(
                    start,
                    end,
                    distance_m=distance,
                    travel_time_s=max(travel_time, 0.001),
                    road_type=str(data.get("highway", "road")),
                    closed=False,
                )
        return cls(normalized, source)

    def nearest_node(self, point: tuple[float, float]) -> str:
        if not self.graph:
            raise ValueError("road graph contains no nodes")
        return min(
            self.graph.nodes,
            key=lambda node: _haversine_m(
                point,
                (self.graph.nodes[node]["latitude"], self.graph.nodes[node]["longitude"]),
            ),
        )

    def shortest_path(self, start: tuple[float, float], end: tuple[float, float]) -> RoadPath | None:
        start_node, end_node = self.nearest_node(start), self.nearest_node(end)

        def cost(_u: str, _v: str, data: dict[str, Any]) -> float | None:
            return None if data.get("closed", False) else float(data["travel_time_s"])

        try:
            duration, node_ids = nx.single_source_dijkstra(
                self.graph, start_node, end_node, weight=cost
            )
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None
        start_coordinates = (
            self.graph.nodes[start_node]["latitude"],
            self.graph.nodes[start_node]["longitude"],
        )
        end_coordinates = (
            self.graph.nodes[end_node]["latitude"],
            self.graph.nodes[end_node]["longitude"],
        )
        start_access_m = _haversine_m(start, start_coordinates)
        end_access_m = _haversine_m(end_coordinates, end)
        access_speed_mps = 20_000 / 3600
        start_access_s = start_access_m / access_speed_mps
        end_access_s = end_access_m / access_speed_mps
        distance = sum(self.graph.edges[u, v]["distance_m"] for u, v in zip(node_ids, node_ids[1:]))
        distance += start_access_m + end_access_m
        return RoadPath(
            tuple(node_ids),
            float(distance),
            float(duration + start_access_s + end_access_s),
            self.source,
            start_access_s,
            end_access_s,
        )

    def close_edge(self, start: str, end: str) -> None:
        if not self.graph.has_edge(start, end):
            raise KeyError(f"road edge {start}->{end} does not exist")
        self.graph.edges[start, end]["closed"] = True

    def set_edge_cost(self, start: str, end: str, travel_time_s: float) -> None:
        if not self.graph.has_edge(start, end):
            raise KeyError(f"road edge {start}->{end} does not exist")
        if travel_time_s <= 0:
            raise ValueError("travel time must be positive")
        self.graph.edges[start, end]["travel_time_s"] = float(travel_time_s)
        self.graph.edges[start, end]["closed"] = False
