"""Recovery feasibility proposals; execution and re-optimization arrive in M4."""

from app.agents.contracts import RecoveryProposal
from app.domain.models import Order, Vehicle, Warehouse


class RecoveryAgent:
    def propose(
        self,
        order: Order,
        warehouses: tuple[Warehouse, ...],
        vehicles: tuple[Vehicle, ...],
        unavailable_warehouse_ids: frozenset[str] = frozenset(),
        unavailable_vehicle_ids: frozenset[str] = frozenset(),
    ) -> RecoveryProposal:
        warehouse_ids = tuple(
            warehouse.id
            for warehouse in warehouses
            if warehouse.id not in unavailable_warehouse_ids
            and warehouse.available
            and warehouse.inventory.get(order.item_id, 0) >= order.quantity
        )
        vehicle_ids = tuple(
            vehicle.id
            for vehicle in vehicles
            if vehicle.id not in unavailable_vehicle_ids
            and vehicle.available
            and not vehicle.in_transit
            and vehicle.capacity_kg - vehicle.load_kg >= order.weight_kg
        )
        feasible = bool(warehouse_ids and vehicle_ids)
        reason = "alternative warehouse and vehicle are available" if feasible else "no feasible recovery pair"
        return RecoveryProposal(order.id, feasible, warehouse_ids, vehicle_ids, reason)
