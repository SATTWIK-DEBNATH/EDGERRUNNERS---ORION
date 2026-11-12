"""Unit tests for Kafka envelope, producer, and consumer framework."""

import asyncio
import unittest

from app.events.kafka.consumer import IdempotencyCache, KafkaConsumerBase
from app.events.kafka.producer import KafkaEventProducer
from app.events.kafka.schemas import KafkaEventEnvelope, OrderCreatedPayload
from app.events.kafka.topics import ORDERS_NEW


class TestKafkaFramework(unittest.TestCase):
    def test_idempotency_cache(self) -> None:
        cache = IdempotencyCache(capacity=5)
        self.assertFalse(cache.seen("key-1"))
        self.assertTrue(cache.seen("key-1"))  # Already seen
        self.assertFalse(cache.seen("key-2"))

        # Test capacity eviction
        for i in range(3, 10):
            cache.seen(f"key-{i}")
        # key-1 should have been evicted
        self.assertFalse(cache.seen("key-1"))

    def test_envelope_serialization(self) -> None:
        payload = OrderCreatedPayload(
            order_id="ord-101",
            location_id="loc-5",
            item_id="medical",
            quantity=2,
            weight_kg=3.5,
            urgent=True,
        )
        envelope = KafkaEventEnvelope(
            event_type="order.created",
            entity_id=payload.order_id,
            idempotency_key="idemp-ord-101",
            payload=payload.model_dump(),
        )
        data = envelope.model_dump(mode="json")
        self.assertEqual(data["event_type"], "order.created")
        self.assertEqual(data["payload"]["item_id"], "medical")

        # Round-trip parse
        parsed = KafkaEventEnvelope.model_validate(data)
        self.assertEqual(parsed.event_id, envelope.event_id)
        self.assertEqual(parsed.payload["quantity"], 2)

    def test_in_memory_producer_consumer(self) -> None:
        async def run_test() -> None:
            received: list[KafkaEventEnvelope] = []
            producer = KafkaEventProducer()
            await producer.start()

            class TestConsumer(KafkaConsumerBase):
                async def process(self, envelope: KafkaEventEnvelope) -> None:
                    received.append(envelope)

            consumer = TestConsumer(topics=[ORDERS_NEW], group_id="test-grp", producer=producer)
            producer.subscribe_in_memory(ORDERS_NEW, consumer.handle_message)

            envelope = KafkaEventEnvelope(
                event_type="order.created",
                entity_id="ord-1",
                idempotency_key="unique-1",
                payload={"order_id": "ord-1"},
            )
            await producer.produce(ORDERS_NEW, envelope)
            self.assertEqual(len(received), 1)
            self.assertEqual(received[0].entity_id, "ord-1")

            # Duplicate should be ignored
            await producer.produce(ORDERS_NEW, envelope)
            self.assertEqual(len(received), 1)

            await producer.stop()

        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()

