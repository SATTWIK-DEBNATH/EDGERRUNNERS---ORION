"""In-memory adapter used by deterministic local demos and unit tests."""

from app.domain.models import Order, Vehicle, Warehouse


class InMemoryLogisticsStore:
    def __init__(self) -> None:
        self._warehouses: dict[tuple[str, str], Warehouse] = {}
        self._vehicles: dict[tuple[str, str], Vehicle] = {}
        self._orders: dict[tuple[str, str], Order] = {}
        self._events: dict[tuple[str, str], object] = {}

    def add_warehouse(self, run_id: str, warehouse: Warehouse) -> None:
        self._insert(self._warehouses, run_id, warehouse.id, warehouse)

    def add_vehicle(self, run_id: str, vehicle: Vehicle) -> None:
        self._insert(self._vehicles, run_id, vehicle.id, vehicle)

    def add_order(self, run_id: str, order: Order) -> None:
        self._insert(self._orders, run_id, order.id, order)

    @staticmethod
    def _insert(target: dict, run_id: str, entity_id: str, entity: object) -> None:
        key = (run_id, entity_id)
        if not run_id or key in target:
            raise ValueError("run id must be present and entity ids must be unique within a run")
        target[key] = entity

    def get_warehouse(self, run_id: str, warehouse_id: str) -> Warehouse | None:
        return self._warehouses.get((run_id, warehouse_id))

    def get_vehicle(self, run_id: str, vehicle_id: str) -> Vehicle | None:
        return self._vehicles.get((run_id, vehicle_id))

    def get_order(self, run_id: str, order_id: str) -> Order | None:
        return self._orders.get((run_id, order_id))

    def reserve_stock(self, run_id: str, warehouse_id: str, item_id: str, quantity: int) -> None:
        warehouse = self.get_warehouse(run_id, warehouse_id)
        if warehouse is None:
            raise KeyError(f"warehouse {warehouse_id} not found in run {run_id}")
        warehouse.reserve(item_id, quantity)

    def append_event(self, run_id: str, event_id: str, event: object) -> bool:
        key = (run_id, event_id)
        if key in self._events:
            return False
        self._events[key] = event
        return True
