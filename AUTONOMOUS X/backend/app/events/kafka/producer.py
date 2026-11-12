"""Async Kafka producer with automatic graceful in-memory fallback for local development."""

import json
import logging
import os
from typing import Any, Callable

from app.events.kafka.schemas import KafkaEventEnvelope

logger = logging.getLogger(__name__)


class KafkaEventProducer:
    """Async event producer publishing KafkaEventEnvelope to Kafka or in-memory fallback."""

    def __init__(self, bootstrap_servers: str | None = None) -> None:
        self.bootstrap_servers = bootstrap_servers or os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:29092")
        self._producer: Any = None
        self._connected: bool = False
        self._fallback_listeners: dict[str, list[Callable[[KafkaEventEnvelope], Any]]] = {}

    async def start(self) -> None:
        if not os.getenv("ENABLE_KAFKA", "true").lower() in ("true", "1", "yes"):
            logger.info("Kafka disabled via ENABLE_KAFKA=false; using in-memory bus")
            self._connected = False
            return

        try:
            import asyncio
            from aiokafka import AIOKafkaProducer

            self._producer = AIOKafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
                request_timeout_ms=2000,
            )
            await asyncio.wait_for(self._producer.start(), timeout=2.5)
            self._connected = True
            logger.info("Connected to Kafka at %s", self.bootstrap_servers)
        except Exception as exc:
            self._connected = False
            self._producer = None
            logger.warning("Kafka unavailable (%s); using in-memory event bus", exc)

    async def stop(self) -> None:
        if self._connected and self._producer:
            try:
                await self._producer.stop()
            except Exception as exc:
                logger.error("Error stopping Kafka producer: %s", exc)
        self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected

    def subscribe_in_memory(self, topic: str, handler: Callable[[KafkaEventEnvelope], Any]) -> None:
        """Register in-memory listeners when operating without a live Kafka broker."""
        self._fallback_listeners.setdefault(topic, []).append(handler)

    async def produce(self, topic: str, envelope: KafkaEventEnvelope) -> bool:
        """Produce an envelope to Kafka, falling back to in-memory dispatch."""
        data = envelope.model_dump(mode="json")
        key = envelope.entity_id or envelope.event_id

        if self._connected and self._producer:
            try:
                await self._producer.send_and_wait(topic, value=data, key=key)
                return True
            except Exception as exc:
                logger.error("Failed to produce to Kafka topic %s: %s", topic, exc)

        # In-memory dispatch
        handlers = self._fallback_listeners.get(topic, [])
        for handler in handlers:
            try:
                res = handler(envelope)
                if hasattr(res, "__await__"):
                    await res
            except Exception as handler_err:
                logger.error("In-memory handler error on topic %s: %s", topic, handler_err)
        return True
