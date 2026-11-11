import unittest

from app.events.bus import EventBus
from app.events.contracts import LogisticsEvent


class EventBusTests(unittest.TestCase):
    def make_event(self, event_id: str) -> LogisticsEvent:
        return LogisticsEvent(event_id, "OrderCreated", "run-1", 0.0, {"order_id": "ord-1"})

    def test_event_is_dispatched_to_subscriber(self):
        bus = EventBus(max_pending=2)
        received = []
        bus.subscribe("OrderCreated", received.append)
        bus.publish(self.make_event("evt-1"))
        self.assertEqual(bus.drain(), 1)
        self.assertEqual(received, [self.make_event("evt-1")])

    def test_event_bus_deduplicates_ids(self):
        bus = EventBus()
        received = []
        bus.subscribe("OrderCreated", received.append)
        event = self.make_event("evt-1")
        self.assertTrue(bus.publish(event))
        self.assertFalse(bus.publish(event))
        bus.drain()
        self.assertEqual(len(received), 1)

    def test_event_bus_enforces_capacity(self):
        bus = EventBus(max_pending=1)
        bus.publish(self.make_event("evt-1"))
        with self.assertRaises(OverflowError):
            bus.publish(self.make_event("evt-2"))
        self.assertEqual(bus.pending_count, 1)


if __name__ == "__main__":
    unittest.main()
