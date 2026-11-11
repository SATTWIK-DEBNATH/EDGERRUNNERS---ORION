"""Synchronous in-process event bus with an explicit pending queue bound."""

from collections import deque
from collections.abc import Callable

from app.events.contracts import LogisticsEvent


class EventBus:
    def __init__(self, max_pending: int = 256) -> None:
        if max_pending <= 0:
            raise ValueError("event bus capacity must be positive")
        self.max_pending = max_pending
        self._pending: deque[LogisticsEvent] = deque()
        self._seen_ids: set[tuple[str, str]] = set()
        self._subscribers: dict[str, list[Callable[[LogisticsEvent], None]]] = {}

    @property
    def pending_count(self) -> int:
        return len(self._pending)

    def subscribe(self, event_type: str, handler: Callable[[LogisticsEvent], None]) -> None:
        if not event_type:
            raise ValueError("subscription event type is required")
        self._subscribers.setdefault(event_type, []).append(handler)

    def publish(self, event: LogisticsEvent) -> bool:
        event_key = (event.simulation_run_id, event.event_id)
        if event_key in self._seen_ids:
            return False
        if len(self._pending) >= self.max_pending:
            raise OverflowError(f"event bus pending capacity ({self.max_pending}) reached")
        self._pending.append(event)
        self._seen_ids.add(event_key)
        return True

    def dispatch_next(self) -> LogisticsEvent | None:
        if not self._pending:
            return None
        event = self._pending.popleft()
        for handler in self._subscribers.get(event.event_type, ()):
            handler(event)
        return event

    def drain(self, max_events: int | None = None) -> int:
        if max_events is not None and max_events < 0:
            raise ValueError("max_events must be nonnegative")
        processed = 0
        while self._pending and (max_events is None or processed < max_events):
            self.dispatch_next()
            processed += 1
        return processed
