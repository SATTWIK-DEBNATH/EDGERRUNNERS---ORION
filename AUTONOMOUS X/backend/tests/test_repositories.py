import unittest

from app.domain.models import Order, Warehouse
from app.repositories.memory import InMemoryLogisticsStore


class InMemoryRepositoryTests(unittest.TestCase):
    def test_duplicate_order_id_is_rejected_within_run(self):
        store = InMemoryLogisticsStore()
        order = Order("ord-1", "loc-1", "parcel", 1, 1)
        store.add_order("run-1", order)
        with self.assertRaises(ValueError):
            store.add_order("run-1", order)

    def test_stock_reservation_is_atomic_and_nonnegative(self):
        store = InMemoryLogisticsStore()
        store.add_warehouse("run-1", Warehouse("wh-1", "Hub", 12.9, 77.6, {"parcel": 2}))
        with self.assertRaises(ValueError):
            store.reserve_stock("run-1", "wh-1", "parcel", 3)
        self.assertEqual(store.get_warehouse("run-1", "wh-1").inventory["parcel"], 2)

    def test_order_lookup_is_scoped_to_run(self):
        store = InMemoryLogisticsStore()
        store.add_order("run-1", Order("ord-1", "loc-1", "parcel", 1, 1))
        self.assertIsNone(store.get_order("run-2", "ord-1"))


if __name__ == "__main__":
    unittest.main()
