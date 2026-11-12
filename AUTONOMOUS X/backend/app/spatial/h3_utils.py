"""H3 spatial indexing utilities for AUTONOMOUS X v3.0."""

from math import asin, cos, radians, sin, sqrt
from typing import Sequence
import h3

RESOLUTION_MACRO = 4       # Regional demand forecasting, interstate freight (~1770 km2)
RESOLUTION_REGIONAL = 7    # Multi-warehouse coordination, inventory balancing (~5.16 km2)
RESOLUTION_URBAN = 8       # Urban vehicle allocation, city traffic modeling (~0.74 km2)
RESOLUTION_MICRO = 9       # Last-mile dynamic route optimization (~0.10 km2)

ALL_RESOLUTIONS: tuple[int, ...] = (
    RESOLUTION_MACRO,
    RESOLUTION_REGIONAL,
    RESOLUTION_URBAN,
    RESOLUTION_MICRO,
)


def encode_h3(latitude: float, longitude: float, resolution: int = RESOLUTION_URBAN) -> str:
    """Encode WGS84 coordinates to an H3 cell index."""
    return h3.latlng_to_cell(latitude, longitude, resolution)


def decode_h3(h3_cell: str) -> tuple[float, float]:
    """Decode an H3 cell index to centroid (latitude, longitude)."""
    return h3.cell_to_latlng(h3_cell)


def validate_h3_cell(h3_cell: str) -> bool:
    """Validate whether the string is a valid H3 cell index."""
    try:
        return h3.is_valid_cell(h3_cell)
    except Exception:
        return False


def is_pentagon(h3_cell: str) -> bool:
    """Check if the given H3 cell is one of the 12 pentagons at this resolution."""
    try:
        return h3.is_pentagon(h3_cell)
    except Exception:
        return False


def get_k_ring(h3_cell: str, k: int = 1) -> set[str]:
    """Get all neighboring H3 cells within k steps."""
    try:
        return set(h3.grid_disk(h3_cell, k))
    except Exception:
        return {h3_cell}


def safe_k_ring(h3_cell: str, k: int = 1) -> set[str]:
    """Get neighboring cells, safely handling pentagonal boundary anomalies."""
    ring = get_k_ring(h3_cell, k)
    return {cell for cell in ring if not is_pentagon(cell)}


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance in meters between two lat/lon pairs."""
    r_lat1, r_lon1, r_lat2, r_lon2 = map(radians, (lat1, lon1, lat2, lon2))
    dlat = r_lat2 - r_lat1
    dlon = r_lon2 - r_lon1
    a = sin(dlat / 2) ** 2 + cos(r_lat1) * cos(r_lat2) * sin(dlon / 2) ** 2
    return 6_371_000 * 2 * asin(sqrt(max(0.0, min(1.0, a))))


def h3_distance_m(cell_a: str, cell_b: str) -> float:
    """Great-circle distance in meters between centroids of two H3 cells."""
    lat_a, lon_a = decode_h3(cell_a)
    lat_b, lon_b = decode_h3(cell_b)
    return haversine_distance_m(lat_a, lon_a, lat_b, lon_b)


def encode_all_resolutions(latitude: float, longitude: float) -> dict[int, str]:
    """Encode coordinates into all standard AUTONOMOUS X resolutions."""
    return {res: encode_h3(latitude, longitude, res) for res in ALL_RESOLUTIONS}


def get_h3_coverage(latitude: float, longitude: float, radius_km: float, resolution: int = RESOLUTION_URBAN) -> set[str]:
    """Return the set of H3 cells covering a circular area."""
    center_cell = encode_h3(latitude, longitude, resolution)
    # Approximate cell edge length in km per resolution
    approx_radii = {4: 22.6, 7: 1.41, 8: 0.53, 9: 0.20}
    cell_radius = approx_radii.get(resolution, 0.53)
    k = max(1, int(radius_km / cell_radius) + 1)
    disk = get_k_ring(center_cell, k)
    radius_m = radius_km * 1000
    return {cell for cell in disk if h3_distance_m(center_cell, cell) <= radius_m * 1.15}


def demand_aggregation(
    locations_with_counts: Sequence[tuple[float, float, int]],
    resolution: int = RESOLUTION_URBAN,
) -> dict[str, int]:
    """Aggregate point demand into H3 hexagonal buckets."""
    aggregated: dict[str, int] = {}
    for lat, lon, count in locations_with_counts:
        cell = encode_h3(lat, lon, resolution)
        aggregated[cell] = aggregated.get(cell, 0) + count
    return aggregated


def h3_heatmap_data(demand_by_cell: dict[str, int]) -> list[dict[str, object]]:
    """Format aggregated H3 demand for Deck.gl H3HexagonLayer."""
    return [{"h3_index": cell, "count": count} for cell, count in demand_by_cell.items()]


def cell_boundary_geojson(h3_cell: str) -> list[list[float]]:
    """Return GeoJSON [lng, lat] coordinate ring for the H3 cell boundary."""
    try:
        boundary = h3.cell_to_boundary(h3_cell)
        coords = [[round(lng, 6), round(lat, 6)] for lat, lng in boundary]
        if coords and coords[0] != coords[-1]:
            coords.append(coords[0])
        return coords
    except Exception:
        return []


def h3_geojson_feature_collection(demand_by_cell: dict[str, int]) -> dict[str, object]:
    """Format aggregated H3 demand as a GeoJSON FeatureCollection with Polygon geometries."""
    features = []
    for cell, count in demand_by_cell.items():
        coords = cell_boundary_geojson(cell)
        if not coords:
            continue
        try:
            lat, lng = decode_h3(cell)
        except Exception:
            lat, lng = 0.0, 0.0
        features.append({
            "type": "Feature",
            "properties": {
                "h3_index": cell,
                "count": count,
                "center_lat": round(lat, 6),
                "center_lng": round(lng, 6),
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords],
            },
        })
    return {
        "type": "FeatureCollection",
        "features": features,
    }


