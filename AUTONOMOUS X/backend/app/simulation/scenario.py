"""Deterministic synthetic Bengaluru-area scenario generation."""

import random

from app.domain.models import DeliveryLocation, Order, Scenario, Vehicle, Warehouse


PRODUCTS = ("parcel", "grocery", "medical")
WAREHOUSE_COORDINATES = (
    (12.9716, 77.5946),
    (12.9352, 77.6245),
    (13.0358, 77.5970),
)


def generate_scenario(
    seed: int,
    warehouse_count: int = 3,
    vehicle_count: int = 10,
    order_count: int = 20,
) -> Scenario:
    """Create a repeatable small scenario around central Bengaluru."""
    if min(warehouse_count, vehicle_count, order_count) < 0:
        raise ValueError("scenario sizes must be nonnegative")
    if order_count and (not warehouse_count or not vehicle_count):
        raise ValueError("orders require at least one warehouse and vehicle")

    rng = random.Random(seed)
    warehouses = tuple(
        Warehouse(
            id=f"wh-{index + 1}",
            name=f"Bengaluru Hub {index + 1}",
            latitude=WAREHOUSE_COORDINATES[index % len(WAREHOUSE_COORDINATES)][0],
            longitude=WAREHOUSE_COORDINATES[index % len(WAREHOUSE_COORDINATES)][1],
            inventory={product: 100 for product in PRODUCTS},
        )
        for index in range(warehouse_count)
    )
    vehicles = tuple(
        Vehicle(
            id=f"veh-{index + 1}",
            capacity_kg=(100.0, 250.0, 500.0)[index % 3],
            latitude=warehouses[index % warehouse_count].latitude,
            longitude=warehouses[index % warehouse_count].longitude,
        )
        for index in range(vehicle_count)
    )
    locations = tuple(
        DeliveryLocation(
            id=f"loc-{index + 1}",
            latitude=12.90 + rng.random() * 0.15,
            longitude=77.54 + rng.random() * 0.16,
        )
        for index in range(order_count)
    )
    orders = tuple(
        Order(
            id=f"ord-{index + 1}",
            location_id=locations[index].id,
            item_id=PRODUCTS[rng.randrange(len(PRODUCTS))],
            quantity=rng.randint(1, 3),
            weight_kg=float(rng.choice((1, 2, 5, 10, 20))),
            priority=rng.randint(1, 5),
        )
        for index in range(order_count)
    )
    return Scenario(seed, warehouses, vehicles, locations, orders)
