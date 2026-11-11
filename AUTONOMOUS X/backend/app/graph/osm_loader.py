"""OSMnx adapter with local GraphML caching and an explicit synthetic fallback."""

from pathlib import Path

from app.graph.road_graph import RoadEdge, RoadGraph


def create_synthetic_bengaluru_graph(rows: int = 5, columns: int = 5) -> RoadGraph:
    """Create a small directed grid approximation inside central Bengaluru."""
    if rows < 2 or columns < 2:
        raise ValueError("synthetic graph needs at least two rows and columns")
    nodes: dict[str, tuple[float, float]] = {}
    edges: list[RoadEdge] = []
    lat0, lon0, spacing = 12.965, 77.585, 0.006
    for row in range(rows):
        for column in range(columns):
            node_id = f"n-{row}-{column}"
            nodes[node_id] = (lat0 + row * spacing, lon0 + column * spacing)
    for row in range(rows):
        for column in range(columns):
            here = f"n-{row}-{column}"
            for dr, dc in ((0, 1), (1, 0)):
                nr, nc = row + dr, column + dc
                if nr >= rows or nc >= columns:
                    continue
                there = f"n-{nr}-{nc}"
                edges.append(RoadEdge(here, there, 650, 105, "synthetic_local"))
                edges.append(RoadEdge(there, here, 650, 110, "synthetic_local"))
    return RoadGraph.from_edges(nodes, edges, source="synthetic_fallback")


def load_road_graph(
    bbox: tuple[float, float, float, float] = (77.55, 12.92, 77.66, 13.02),
    cache_path: str | Path = "data/cache/bengaluru.graphml",
    enable_download: bool = False,
) -> RoadGraph:
    """Load cached OSM data, optionally download a small area, or return synthetic roads.

    `bbox` is `(west, south, east, north)` in WGS84, matching OSMnx. OpenStreetMap contributors
    data must be attributed in any display or exported documentation.
    """
    west, south, east, north = bbox
    if not (-90 <= south < north <= 90 and -180 <= west < east <= 180):
        raise ValueError("bbox must be (west, south, east, north) in valid WGS84 order")
    path = Path(cache_path)
    if not path.exists() and not enable_download:
        fallback = create_synthetic_bengaluru_graph()
        fallback.fallback_reason = "OSM download disabled and no cached graph found"
        return fallback
    try:
        import osmnx as ox

        if path.exists():
            raw_graph = ox.load_graphml(filepath=path)
            return RoadGraph.from_networkx(raw_graph, source="openstreetmap_cached")
        if enable_download:
            raw_graph = ox.graph_from_bbox(bbox=bbox, network_type="drive", simplify=True)
            raw_graph = ox.add_edge_speeds(raw_graph)
            raw_graph = ox.add_edge_travel_times(raw_graph)
            path.parent.mkdir(parents=True, exist_ok=True)
            ox.save_graphml(raw_graph, filepath=path)
            return RoadGraph.from_networkx(raw_graph, source="openstreetmap_osmnx")
        reason = "OSM download disabled and no cached graph found"
    except Exception as exc:
        reason = f"OSM graph unavailable: {type(exc).__name__}: {exc}"
    fallback = create_synthetic_bengaluru_graph()
    fallback.fallback_reason = reason
    return fallback
