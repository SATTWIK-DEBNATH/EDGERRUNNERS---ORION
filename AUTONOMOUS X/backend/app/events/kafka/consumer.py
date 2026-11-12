"""Base async Kafka consumer with idempotency deduplication and dead-letter routing."""

from abc import ABC, abstractmethod
from collections import OrderedDict
import json
import logging
import os
from typing import Any

from app.events.kafka.producer import KafkaEventProducer
from app.events.kafka.schemas import KafkaEventEnvelope
from app.events.kafka.topics import DLQ

logger = logging.getLogger(__name__)


class IdempotencyCache:
    """Bounded LRU cache for event deduplication."""

    def __init__(self, capacity: int = 10000) -> None:
        self.capacity = capacity
        self._cache: OrderedDict[str, bool] = OrderedDict()

    def seen(self, key: str) -> bool:
        if not key:
            return False
        if key in self._cache:
            self._cache.move_to_end(key)
            return True
        self._cache[key] = True
        if len(self._cache) > self.capacity:
            self._cache.popitem(last=False)
        return False


class KafkaConsumerBase(ABC):
    """Abstract base class for asynchronous Kafka event consumers."""

    def __init__(
        self,
        topics: list[str],
        group_id: str,
        producer: KafkaEventProducer | None = None,
        bootstrap_servers: str | None = None,
        max_retries: int = 3,
    ) -> None:
        self.topics = topics
        self.group_id = group_id
        self.producer = producer or KafkaEventProducer(bootstrap_servers)
        self.bootstrap_servers = bootstrap_servers or os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:29092")
        self.max_retries = max_retries
        self._idempotency = IdempotencyCache()
        self._running = False
        self._consumer: Any = None

    @abstractmethod
    async def process(self, envelope: KafkaEventEnvelope) -> None:
        """Process a single verified event envelope. Must be implemented by subclasses."""

    async def handle_message(self, raw_value: bytes | str | dict) -> None:
        """Deserialize, deduplicate, process with retries, and route to DLQ on repeated failure."""
        try:
            if isinstance(raw_value, KafkaEventEnvelope):
                envelope = raw_value
            elif isinstance(raw_value, (bytes, bytearray)):
                parsed = json.loads(raw_value.decode("utf-8"))
                envelope = KafkaEventEnvelope.model_validate(parsed)
            elif isinstance(raw_value, str):
                parsed = json.loads(raw_value)
                envelope = KafkaEventEnvelope.model_validate(parsed)
            elif isinstance(raw_value, dict):
                envelope = KafkaEventEnvelope.model_validate(raw_value)
            else:
                raise ValueError(f"Unsupported message type: {type(raw_value)}")
        except Exception as parse_err:
            logger.error("Failed to parse Kafka envelope: %s", parse_err)
            await self._send_dlq(raw_value, str(parse_err))
            return

        # Deduplication
        if envelope.idempotency_key and self._idempotency.seen(envelope.idempotency_key):
            logger.debug("Skipping duplicate event with idempotency key: %s", envelope.idempotency_key)
            return

        # Retry loop
        for attempt in range(1, self.max_retries + 1):
            try:
                await self.process(envelope)
                return
            except Exception as proc_err:
                logger.warning(
                    "Error processing event %s (attempt %d/%d): %s",
                    envelope.event_id,
                    attempt,
                    self.max_retries,
                    proc_err,
                )
                if attempt == self.max_retries:
                    logger.error("Event %s failed after %d retries; routing to DLQ", envelope.event_id, self.max_retries)
                    await self._send_dlq(envelope.model_dump(mode="json"), str(proc_err))

    async def _send_dlq(self, raw_payload: Any, error: str) -> None:
        dlq_envelope = KafkaEventEnvelope(
            event_type="dlq.failed_message",
            entity_id=getattr(raw_payload, "entity_id", None) if isinstance(raw_payload, KafkaEventEnvelope) else None,
            payload={"error": error, "original_payload": raw_payload},
        )
        await self.producer.produce(DLQ, dlq_envelope)

    async def start(self) -> None:
        self._running = True
        try:
            from aiokafka import AIOKafkaConsumer

            self._consumer = AIOKafkaConsumer(
                *self.topics,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.group_id,
                auto_offset_reset="earliest",
                enable_auto_commit=True,
            )
            await self._consumer.start()
            logger.info("Kafka consumer %s started for topics %s", self.group_id, self.topics)
            while self._running:
                result = await self._consumer.getmany(timeout_ms=1000)
                for tp, messages in result.items():
                    for msg in messages:
                        await self.handle_message(msg.value)
        except Exception as exc:
            logger.warning("Kafka consumer %s cannot connect to %s (%s); staying idle", self.group_id, self.bootstrap_servers, exc)

    async def stop(self) -> None:
        self._running = False
        if self._consumer:
            try:
                await self._consumer.stop()
            except Exception as exc:
                logger.error("Error stopping Kafka consumer %s: %s", self.group_id, exc)
