"""WebSocket bridge connecting Kafka event streams to browser dashboard clients."""

from datetime import datetime, timezone
import json
import logging
from typing import Any
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class WebSocketBridge:
    """Manages active browser WebSocket connections and broadcasts live operational events."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []
        self._event_buffer: list[dict[str, Any]] = []
        self._max_buffer: int = 100
        self._events_processed_count: int = 0
        self._start_time: datetime = datetime.now(timezone.utc)

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("Browser dashboard client connected (total active: %d)", len(self.active_connections))
        # Send initial welcome and recent buffered events
        try:
            await websocket.send_text(
                json.dumps({
                    "type": "connection.ack",
                    "status": "connected",
                    "recent_events": self._event_buffer[-20:],
                })
            )
        except Exception:
            pass

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("Browser dashboard client disconnected (remaining: %d)", len(self.active_connections))

    async def broadcast(self, event_type: str, payload: dict[str, Any]) -> None:
        """Broadcast an operational event to all connected dashboard clients."""
        self._events_processed_count += 1
        message = {
            "type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }

        # Maintain recent event buffer for new connections and monitoring
        self._event_buffer.append(message)
        if len(self._event_buffer) > self._max_buffer:
            self._event_buffer.pop(0)

        if not self.active_connections:
            return

        dead_connections: list[WebSocket] = []
        message_json = json.dumps(message, default=str)

        for connection in self.active_connections:
            try:
                await connection.send_text(message_json)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

    @property
    def recent_events(self) -> list[dict[str, Any]]:
        return list(self._event_buffer)

    @property
    def metrics(self) -> dict[str, Any]:
        uptime_s = max(1.0, (datetime.now(timezone.utc) - self._start_time).total_seconds())
        return {
            "active_clients": len(self.active_connections),
            "total_events_broadcast": self._events_processed_count,
            "events_per_second": round(self._events_processed_count / uptime_s, 2),
            "buffer_size": len(self._event_buffer),
        }


# Global singleton bridge instance
ws_bridge = WebSocketBridge()

