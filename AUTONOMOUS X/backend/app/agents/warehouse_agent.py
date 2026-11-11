"""Warehouse stock and graph-distance proposals; does not mutate inventory."""

from app.agents.contracts import WarehouseCandidate, WarehouseProposal
from app.domain.models import DeliveryLocation, Order, Warehouse
from app.graph.road_graph import RoadGraph


class WarehouseAgent:
    def __init__(self, road_graph: RoadGraph) -> None:
        self.road_graph = road_graph

    def propose(
        self, order: Order, warehouses: tuple[Warehouse, ...], location: DeliveryLocation
    ) -> WarehouseProposal:
        candidates: list[WarehouseCandidate] = []
        for warehouse in warehouses:
            if not warehouse.available or warehouse.inventory.get(order.item_id, 0) < order.quantity:
                continue
            path = self.road_graph.shortest_path(
                (warehouse.latitude, warehouse.longitude), (location.latitude, location.longitude)
            )
            if path is not None:
                candidates.append(WarehouseCandidate(warehouse.id, path.travel_time_s))
        candidates.sort(key=lambda candidate: (candidate.estimated_travel_time_s, candidate.warehouse_id))
        reason = "feasible stock candidates found" if candidates else "no available warehouse has stock and a reachable route"
        return WarehouseProposal(order.id, tuple(candidates), reason)
