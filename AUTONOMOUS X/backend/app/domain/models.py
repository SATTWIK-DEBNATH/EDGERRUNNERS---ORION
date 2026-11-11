"""Domain entities with explicit validation and lifecycle rules."""

from dataclasses import dataclass, field
from enum import StrEnum


def _validate_coordinates(latitude: float, longitude: float) -> None:
    if not -90 <= latitude <= 90:
        raise ValueError("latitude must be between -90 and 90")
    if not -180 <= longitude <= 180:
        raise ValueError("longitude must be between -180 and 180")


@dataclass
class Warehouse:
    id: str
    name: str
    latitude: float
    longitude: float
    inventory: dict[str, int] = field(default_factory=dict)
    available: bool = True

    def __post_init__(self) -> None:
        _validate_coordinates(self.latitude, self.longitude)
        if not self.id or not self.name:
            raise ValueError("warehouse id and name are required")
        if any(not item_id or quantity < 0 for item_id, quantity in self.inventory.items()):
            raise ValueError("inventory item ids must be non-empty and quantities nonnegative")

    def reserve(self, item_id: str, quantity: int) -> None:
        if quantity <= 0:
            raise ValueError("reservation quantity must be positive")
        available = self.inventory.get(item_id, 0)
        if available < quantity:
            raise ValueError(f"insufficient stock for {item_id}: requested {quantity}, available {available}")
        self.inventory[item_id] = available - quantity

    def release(self, item_id: str, quantity: int) -> None:
        if quantity <= 0:
            raise ValueError("release quantity must be positive")
        self.inventory[item_id] = self.inventory.get(item_id, 0) + quantity


@dataclass
class Vehicle:
    id: str
    capacity_kg: float
    latitude: float
    longitude: float
    available: bool = True
    load_kg: float = 0.0
    in_transit: bool = False

    def __post_init__(self) -> None:
        _validate_coordinates(self.latitude, self.longitude)
        if not self.id or self.capacity_kg <= 0:
            raise ValueError("vehicle id is required and capacity must be positive")
        if self.load_kg < 0 or self.load_kg > self.capacity_kg:
            raise ValueError("vehicle load must be between zero and capacity")


@dataclass(frozen=True)
class DeliveryLocation:
    id: str
    latitude: float
    longitude: float
    region: str = "bengaluru"

    def __post_init__(self) -> None:
        _validate_coordinates(self.latitude, self.longitude)
        if not self.id:
            raise ValueError("location id is required")


class OrderStatus(StrEnum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    UNFULFILLABLE = "unfulfillable"
    CANCELLED = "cancelled"


_ALLOWED_TRANSITIONS = {
    OrderStatus.PENDING: {OrderStatus.ASSIGNED, OrderStatus.UNFULFILLABLE, OrderStatus.CANCELLED},
    OrderStatus.ASSIGNED: {
        OrderStatus.IN_TRANSIT,
        OrderStatus.PENDING,
        OrderStatus.UNFULFILLABLE,
        OrderStatus.CANCELLED,
    },
    OrderStatus.IN_TRANSIT: {OrderStatus.DELIVERED, OrderStatus.PENDING, OrderStatus.CANCELLED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.UNFULFILLABLE: {OrderStatus.PENDING, OrderStatus.CANCELLED},
    OrderStatus.CANCELLED: set(),
}


@dataclass
class Order:
    id: str
    location_id: str
    item_id: str
    quantity: int
    weight_kg: float
    priority: int = 3
    status: OrderStatus = OrderStatus.PENDING
    warehouse_id: str | None = None
    vehicle_id: str | None = None

    def __post_init__(self) -> None:
        if not self.id or not self.location_id or not self.item_id:
            raise ValueError("order, location, and item ids are required")
        if self.quantity <= 0 or self.weight_kg <= 0:
            raise ValueError("order quantity and weight must be positive")
        if not 1 <= self.priority <= 5:
            raise ValueError("priority must be between 1 and 5")

    def transition_to(self, target: OrderStatus) -> None:
        if target not in _ALLOWED_TRANSITIONS[self.status]:
            raise ValueError(f"invalid order transition: {self.status} -> {target}")
        self.status = target


@dataclass(frozen=True)
class Scenario:
    seed: int
    warehouses: tuple[Warehouse, ...]
    vehicles: tuple[Vehicle, ...]
    locations: tuple[DeliveryLocation, ...]
    orders: tuple[Order, ...]
