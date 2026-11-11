"""Routing proposals backed by the directed road graph."""

from app.agents.contracts import RouteAssessment
from app.domain.models import DeliveryLocation, Vehicle, Warehouse
from app.graph.road_graph import RoadGraph


class RoutingAgent:
    def __init__(self, road_graph: RoadGraph) -> None:
        self.road_graph = road_graph

    def assess(
        self, vehicle: Vehicle, warehouse: Warehouse, location: DeliveryLocation
    ) -> RouteAssessment:
        to_warehouse = self.road_graph.shortest_path(
            (vehicle.latitude, vehicle.longitude), (warehouse.latitude, warehouse.longitude)
        )
        to_customer = self.road_graph.shortest_path(
            (warehouse.latitude, warehouse.longitude), (location.latitude, location.longitude)
        )
        if to_warehouse is None or to_customer is None:
            return RouteAssessment(
                warehouse.id,
                vehicle.id,
                False,
                None,
                reason="one or more route legs are unreachable",
            )
        return RouteAssessment(
            warehouse.id,
            vehicle.id,
            True,
            to_warehouse.travel_time_s + to_customer.travel_time_s,
            (to_warehouse, to_customer),
        )
