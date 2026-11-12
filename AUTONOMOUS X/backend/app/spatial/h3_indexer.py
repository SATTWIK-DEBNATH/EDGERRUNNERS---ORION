"""In-memory H3 spatial index for real-time fleet, warehouse, and demand queries."""

from collections import defaultdict
from typing import Sequence

from app.domain.models import DeliveryLocation, Vehicle, Warehouse
from app.spatial.h3_utils import (
    RESOLUTION_REGIONAL,
    RESOLUTION_URBAN,
    decode_h3,
    encode_h3,
    get_h3_coverage,
    get_k_ring,
    haversine_distance_m,
)


class H3SpatialIndex:
    """Fast in-memory spatial index powered by Uber H3."""

    def __init__(self, resolution: int = RESOLUTION_URBAN) -> None:
        self.resolution = resolution
        self._warehouses_by_cell: dict[str, list[Warehouse]] = defaultdict(list)
        self._vehicles_by_cell: dict[str, list[Vehicle]] = defaultdict(list)
        self._locations_by_cell: dict[str, list[DeliveryLocation]] = defaultdict(list)
        self._all_warehouses: list[Warehouse] = []
        self._all_vehicles: list[Vehicle] = []

    def index_warehouses(self, warehouses: Sequence[Warehouse]) -> None:
        self._warehouses_by_cell.clear()
        self._all_warehouses = list(warehouses)
        for wh in warehouses:
            cell = encode_h3(wh.latitude, wh.longitude, RESOLUTION_REGIONAL)
            self._warehouses_by_cell[cell].append(wh)

    def index_vehicles(self, vehicles: Sequence[Vehicle]) -> None:
        self._vehicles_by_cell.clear()
        self._all_vehicles = list(vehicles)
        for v in vehicles:
            cell = encode_h3(v.latitude, v.longitude, self.resolution)
            self._vehicles_by_cell[cell].append(v)

    def nearest_warehouses(
        self,
        latitude: float,
        longitude: float,
        k: int = 3,
    ) -> list[Warehouse]:
        """Find the k nearest warehouses using H3 distance ranking."""
        if not self._all_warehouses:
            return []
        ranked = sorted(
            self._all_warehouses,
            key=lambda wh: haversine_distance_m(latitude, longitude, wh.latitude, wh.longitude),
        )
        return ranked[:k]

    def vehicles_in_k_ring(
        self,
        latitude: float,
        longitude: float,
        k: int = 2,
    ) -> list[Vehicle]:
        """Return all vehicles currently positioned within k rings of given coordinates."""
        center_cell = encode_h3(latitude, longitude, self.resolution)
        cells = get_k_ring(center_cell, k)
        found: list[Vehicle] = []
        for cell in cells:
            found.extend(self._vehicles_by_cell.get(cell, []))
        return found

    def compute_warehouse_coverage(
        self,
        warehouses: Sequence[Warehouse],
        radius_km: float = 5.0,
    ) -> dict[str, list[str]]:
        """Return H3 coverage cells per warehouse."""
        coverage: dict[str, list[str]] = {}
        for wh in warehouses:
            cells = get_h3_coverage(wh.latitude, wh.longitude, radius_km, self.resolution)
            coverage[wh.id] = sorted(cells)
        return coverage

    def density_heatmap(self) -> list[dict[str, object]]:
        """Return entity density across all active H3 cells for Deck.gl visualization."""
        counts: dict[str, int] = defaultdict(int)
        for cell, vehicles in self._vehicles_by_cell.items():
            counts[cell] += len(vehicles)
        return [{"h3_index": cell, "count": count} for cell, count in counts.items()]

