"""
NAVRASA Central Telemetry Bus & Event Dispatcher.

Acts as the single unified message backbone for the entire autonomy platform.
All autonomy subsystems (Tracking, Road Intent Graph, GNN Reasoner,
Future Road Composer, Dynamic Risk Field, Hybrid A* Planner, MPC/CBF Control Shield,
and Decision Timeline) communicate strictly via publish-subscribe over this bus.
"""

from __future__ import annotations
import asyncio
import collections
import enum
import logging
import threading
import time
from typing import Any, Callable, Dict, List, Optional, Set, Union
from pydantic import BaseModel, Field

from backend.core.types import (
    FrameBundle,
    TrackState,
    RoadIntentGraphState,
    PredictionState,
    RiskGridMap,
    PlanState,
    ControlCommand,
    SystemMetrics
)

logger = logging.getLogger("NAVRASA.TelemetryBus")


class TelemetryTopic(str, enum.Enum):
    """Event topics supported across the NAVRASA telemetry backbone."""
    RAW_FRAME = "RAW_FRAME"
    TRACKS_UPDATED = "TRACKS_UPDATED"
    GRAPH_UPDATED = "GRAPH_UPDATED"
    GNN_REASONED = "GNN_REASONED"
    PREDICTIONS_COMPLETED = "PREDICTIONS_COMPLETED"
    RISK_FIELD_GENERATED = "RISK_FIELD_GENERATED"
    PLAN_REPLANNED = "PLAN_REPLANNED"
    CONTROL_SHIELDED = "CONTROL_SHIELDED"
    SAFETY_OVERRIDE = "SAFETY_OVERRIDE"
    TIMELINE_EVENT = "TIMELINE_EVENT"
    METRICS_UPDATED = "METRICS_UPDATED"


class TelemetryEvent(BaseModel):
    """Standardized event packet broadcast over the bus."""
    topic: TelemetryTopic
    frame_id: int
    timestamp: float
    payload: Any = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TelemetryBus:
    """
    High-throughput, thread-safe publish/subscribe telemetry bus
    with an integrated 300-frame rolling replay buffer.
    """

    def __init__(self, max_buffer_size: int = 300):
        self.max_buffer_size = max_buffer_size
        self._subscribers: Dict[TelemetryTopic, List[Callable[[TelemetryEvent], None]]] = {
            topic: [] for topic in TelemetryTopic
        }
        self._async_subscribers: Dict[TelemetryTopic, List[Callable[[TelemetryEvent], Any]]] = {
            topic: [] for topic in TelemetryTopic
        }
        self._buffer: collections.deque[FrameBundle] = collections.deque(maxlen=max_buffer_size)
        self._lock = threading.RLock()
        self._latest_frame: Optional[FrameBundle] = None
        self._event_history: collections.deque[TelemetryEvent] = collections.deque(maxlen=1000)

        # Performance monitoring
        self._event_counts: Dict[str, int] = {topic.value: 0 for topic in TelemetryTopic}
        self._last_event_time: float = time.time()

    def subscribe(self, topic: TelemetryTopic, handler: Callable[[TelemetryEvent], None]) -> None:
        """Registers a synchronous callback for a specific event topic."""
        with self._lock:
            if handler not in self._subscribers[topic]:
                self._subscribers[topic].append(handler)
                logger.debug(f"Subscribed {handler} to {topic.value}")

    def subscribe_async(self, topic: TelemetryTopic, handler: Callable[[TelemetryEvent], Any]) -> None:
        """Registers an asynchronous coroutine callback for an event topic."""
        with self._lock:
            if handler not in self._async_subscribers[topic]:
                self._async_subscribers[topic].append(handler)
                logger.debug(f"Subscribed async {handler} to {topic.value}")

    def unsubscribe(self, topic: TelemetryTopic, handler: Callable) -> None:
        """Removes a registered callback."""
        with self._lock:
            if handler in self._subscribers[topic]:
                self._subscribers[topic].remove(handler)
            if handler in self._async_subscribers[topic]:
                self._async_subscribers[topic].remove(handler)

    def publish(self, topic: TelemetryTopic, event: TelemetryEvent) -> None:
        """
        Dispatches an event synchronously to all registered listeners.
        Guarantees deterministic execution order across the pipeline.
        """
        with self._lock:
            self._event_counts[topic.value] = self._event_counts.get(topic.value, 0) + 1
            self._event_history.append(event)
            handlers = list(self._subscribers[topic])

        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"Error in handler {handler} on topic {topic.value}: {e}", exc_info=True)

    def record_frame(self, frame: FrameBundle) -> None:
        """Appends a completed FrameBundle to the rolling replay buffer."""
        with self._lock:
            self._latest_frame = frame
            self._buffer.append(frame)

    @property
    def latest_frame(self) -> Optional[FrameBundle]:
        with self._lock:
            return self._latest_frame

    def get_replay_buffer(self) -> List[FrameBundle]:
        """Returns a snapshot copy of the rolling replay buffer."""
        with self._lock:
            return list(self._buffer)

    def get_frame_by_id(self, frame_id: int) -> Optional[FrameBundle]:
        """Finds a frame in the rolling replay buffer by frame_id."""
        with self._lock:
            for frame in self._buffer:
                if frame.frame_id == frame_id:
                    return frame
        return None

    def clear(self) -> None:
        """Resets the replay buffer and event history."""
        with self._lock:
            self._buffer.clear()
            self._latest_frame = None
            self._event_history.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Returns telemetry bus throughput and buffer utilization metrics."""
        with self._lock:
            return {
                "buffered_frames": len(self._buffer),
                "max_buffer_size": self.max_buffer_size,
                "event_counts": dict(self._event_counts),
                "total_events_dispatched": sum(self._event_counts.values())
            }


# Global singleton instance for platform-wide event routing
global_telemetry_bus = TelemetryBus()
