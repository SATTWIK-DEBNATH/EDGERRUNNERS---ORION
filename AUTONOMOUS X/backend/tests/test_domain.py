import unittest

from app.domain.models import DeliveryLocation, Order, OrderStatus, Warehouse, Vehicle


class DomainModelTests(unittest.TestCase):
    def test_reserve_rejects_insufficient_stock_without_mutation(self):
        warehouse = Warehouse(id="w-1", name="Central", latitude=12.97, longitude=77.59, inventory={"box": 2})

        with self.assertRaises(ValueError):
            warehouse.reserve("box", 3)

        self.assertEqual(warehouse.inventory["box"], 2)

    def test_inventory_can_be_reserved_and_released(self):
        warehouse = Warehouse(id="w-1", name="Central", latitude=12.97, longitude=77.59, inventory={"box": 4})
        warehouse.reserve("box", 3)
        warehouse.release("box", 2)
        self.assertEqual(warehouse.inventory["box"], 3)

    def test_order_lifecycle_rejects_skipped_states(self):
        order = Order(id="o-1", location_id="l-1", item_id="box", quantity=1, weight_kg=1.0)
        with self.assertRaises(ValueError):
            order.transition_to(OrderStatus.DELIVERED)
        order.transition_to(OrderStatus.ASSIGNED)
        order.transition_to(OrderStatus.IN_TRANSIT)
        order.transition_to(OrderStatus.DELIVERED)
        self.assertEqual(order.status, OrderStatus.DELIVERED)

    def test_domain_rejects_invalid_capacity_and_coordinates(self):
        with self.assertRaises(ValueError):
            Vehicle(id="v-1", capacity_kg=0, latitude=12.0, longitude=77.0)
        with self.assertRaises(ValueError):
            DeliveryLocation(id="l-1", latitude=91, longitude=77)


if __name__ == "__main__":
    unittest.main()
