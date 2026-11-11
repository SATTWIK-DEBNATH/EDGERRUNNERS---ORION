"""Bounded, graph-version-aware travel matrix cache for solver inputs."""

from collections import OrderedDict
from dataclasses import dataclass
from math import ceil

from app.graph.road_graph import RoadGraph

UNREACHABLE_SECONDS = 1_000_000_000


@dataclass(frozen=True)
class GraphLocation:
    id: str
    latitude: float
    longitude: float


@dataclass(frozen=True)
class TravelMatrix:
    node_ids: tuple[str, ...]
    travel_times_s: tuple[tuple[int, ...], ...]
    distances_m: tuple[tuple[int | None, ...], ...]
    graph_source: str


class TravelMatrixBuilder:
    def __init__(self, max_entries: int = 4) -> None:
        if max_entries <= 0:
            raise ValueError("matrix cache must retain at least one entry")
        self.max_entries = max_entries
        self._cache: OrderedDict[tuple, TravelMatrix] = OrderedDict()

    def build(self, graph: RoadGraph, locations: tuple[GraphLocation, ...]) -> TravelMatrix:
        if not locations or len({location.id for location in locations}) != len(locations):
            raise ValueError("travel matrix needs unique location ids")
        key = (self._graph_signature(graph), tuple((p.id, p.latitude, p.longitude) for p in locations))
        cached = self._cache.get(key)
        if cached is not None:
            self._cache.move_to_end(key)
            return cached

        time_rows: list[tuple[int, ...]] = []
        distance_rows: list[tuple[int | None, ...]] = []
        for origin_index, origin in enumerate(locations):
            times: list[int] = []
            distances: list[int | None] = []
            for destination_index, destination in enumerate(locations):
                if origin_index == destination_index:
                    times.append(0)
                    distances.append(0)
                    continue
                path = graph.shortest_path(
                    (origin.latitude, origin.longitude),
                    (destination.latitude, destination.longitude),
                )
                if path is None:
                    times.append(UNREACHABLE_SECONDS)
                    distances.append(None)
                else:
                    times.append(max(1, ceil(path.travel_time_s)))
                    distances.append(round(path.distance_m))
            time_rows.append(tuple(times))
            distance_rows.append(tuple(distances))
        matrix = TravelMatrix(
            tuple(location.id for location in locations),
            tuple(time_rows),
            tuple(distance_rows),
            graph.source,
        )
        self._cache[key] = matrix
        self._cache.move_to_end(key)
        while len(self._cache) > self.max_entries:
            self._cache.popitem(last=False)
        return matrix

    @staticmethod
    def _graph_signature(graph: RoadGraph) -> tuple:
        nodes = tuple(
            sorted(
                (str(node), data["latitude"], data["longitude"])
                for node, data in graph.graph.nodes(data=True)
            )
        )
        edges = tuple(
            sorted(
                (
                    str(start),
                    str(end),
                    data["distance_m"],
                    data["travel_time_s"],
                    data.get("closed", False),
                )
                for start, end, data in graph.graph.edges(data=True)
            )
        )
        return graph.source, nodes, edges
