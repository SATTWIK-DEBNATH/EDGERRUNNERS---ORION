"""Persistence interfaces consumed by application services."""

from typing import Protocol

from app.domain.models import Order, Vehicle, Warehouse


class WarehouseRepository(Protocol):
    def get_warehouse(self, run_id: str, warehouse_id: str) -> Warehouse | None: ...
    def reserve_stock(self, run_id: str, warehouse_id: str, item_id: str, quantity: int) -> None: ...


class VehicleRepository(Protocol):
    def get_vehicle(self, run_id: str, vehicle_id: str) -> Vehicle | None: ...


class OrderRepository(Protocol):
    def add_order(self, run_id: str, order: Order) -> None: ...
    def get_order(self, run_id: str, order_id: str) -> Order | None: ...


class EventRepository(Protocol):
    def append_event(self, run_id: str, event_id: str, event: object) -> bool: ...
