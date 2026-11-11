"""Fleet availability and capacity proposals; does not mutate vehicle load."""

from app.agents.contracts import FleetCandidate, FleetProposal
from app.domain.models import Order, Vehicle


class FleetAgent:
    def propose(self, order: Order, vehicles: tuple[Vehicle, ...]) -> FleetProposal:
        candidates = tuple(
            FleetCandidate(vehicle.id, vehicle.capacity_kg - vehicle.load_kg)
            for vehicle in vehicles
            if vehicle.available and not vehicle.in_transit and vehicle.capacity_kg - vehicle.load_kg >= order.weight_kg
        )
        return FleetProposal(
            order.id,
            candidates,
            "available vehicles have sufficient capacity" if candidates else "no available vehicle has sufficient capacity",
        )
