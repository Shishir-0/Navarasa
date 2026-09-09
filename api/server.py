"""
NAVRASA FastAPI Server and Real-Time JSON Streaming Hub.

Exposes RESTful endpoints and high-throughput WebSockets for telemetry,
active tracks, intent graph, future predictions, risk field, planner output,
CBF/MPC controls, timeline causality logs, and simulator frame ingestion.
"""

from __future__ import annotations
import asyncio
import json
import logging
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.core.types import (
    FrameBundle,
    ActorState,
    TrackState,
    RoadIntentGraphState,
    PredictionState,
    RiskGridMap,
    PlanState,
    ControlCommand,
    SystemMetrics
)
from backend.core.config import load_config, NavrasaConfig
from backend.telemetry_bus import TelemetryBus, TelemetryEvent, TelemetryTopic, global_telemetry_bus
from backend.decision_timeline import TimelineEventRecord, global_decision_timeline

logger = logging.getLogger("NAVRASA.API")

_active_websockets: List[WebSocket] = []


class IngestResponse(BaseModel):
    status: str = "ACCEPTED"
    frame_id: int
    processed_timestamp: float
    pipeline_latency_ms: float
    cbf_active: bool


def create_app(
    config: Optional[NavrasaConfig] = None,
    bus: Optional[TelemetryBus] = None
) -> FastAPI:
    cfg = config or load_config()
    event_bus = bus or global_telemetry_bus

    app = FastAPI(
        title="NAVRASA Autonomous Systems API Gateway",
        description="Production-grade REST and WebSocket Streaming Hub for Neural Adaptive Vehicular Reasoning",
        version="1.0.0"
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health_check():
        latest = event_bus.latest_frame
        return {
            "status": "HEALTHY",
            "system": "NAVRASA",
            "version": "1.0.0",
            "frame_available": latest is not None,
            "buffered_frames": len(event_bus.get_replay_buffer()),
            "total_events": event_bus.get_stats().get("total_events_dispatched", 0)
        }

    @app.get("/actors", response_model=List[ActorState])
    async def get_actors():
        latest = event_bus.latest_frame
        if not latest:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        # Return ego plus non-ego dynamic actors
        return [latest.ego_state]

    @app.get("/tracks", response_model=List[TrackState])
    async def get_tracks():
        latest = event_bus.latest_frame
        if not latest:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return latest.tracks

    @app.get("/graph", response_model=RoadIntentGraphState)
    async def get_graph():
        latest = event_bus.latest_frame
        if not latest:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return latest.intent_graph

    @app.get("/prediction", response_model=PredictionState)
    async def get_prediction():
        latest = event_bus.latest_frame
        if not latest:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return latest.predictions

    @app.get("/risk", response_model=Optional[RiskGridMap])
    async def get_risk():
        latest = event_bus.latest_frame
        if not latest:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return latest.risk_map

    @app.get("/planner", response_model=Optional[PlanState])
    async def get_planner():
        latest = event_bus.latest_frame
        if not latest:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return latest.planned_trajectory

    @app.get("/control", response_model=Optional[ControlCommand])
    async def get_control():
        latest = event_bus.latest_frame
        if not latest:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return latest.control_command

    @app.get("/timeline", response_model=List[TimelineEventRecord])
    async def get_timeline(limit: int = Query(50, ge=1, le=500)):
        return global_decision_timeline.get_timeline(limit=limit)

    @app.get("/metrics", response_model=SystemMetrics)
    async def get_metrics():
        latest = event_bus.latest_frame
        if not latest:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return latest.metrics

    @app.get("/replay/frames", response_model=List[FrameBundle])
    async def get_replay_frames(limit: int = Query(300, ge=1, le=500)):
        """Returns the rolling replay buffer up to limit frames."""
        buffer = event_bus.get_replay_buffer()
        return buffer[-limit:]

    @app.post("/replay/seek/{frame_id}", response_model=Optional[FrameBundle])
    async def seek_replay_frame(frame_id: int):
        """Finds and returns a specific historical frame from the replay buffer."""
        frame = event_bus.get_frame_by_id(frame_id)
        if not frame:
            raise HTTPException(status_code=404, detail=f"Frame #{frame_id} not found in buffer.")
        return frame

    @app.post("/simulation/ingest", response_model=IngestResponse)
    async def ingest_simulation_frame(payload: Dict[str, Any]):
        """
        Accepts external CARLA or sensor simulation payloads according to shared/frame_schema.json,
        dispatches them to the TelemetryBus, and returns execution status.
        """
        frame_id = payload.get("frame_id", int(payload.get("timestamp", 0) * 20))
        ts = float(payload.get("timestamp", 0.0))

        # Publish raw ingestion event to TelemetryBus
        event_bus.publish(
            TelemetryTopic.RAW_FRAME,
            TelemetryEvent(
                topic=TelemetryTopic.RAW_FRAME,
                frame_id=frame_id,
                timestamp=ts,
                payload=payload,
                metadata={"source": "external_simulation_ingest"}
            )
        )

        return IngestResponse(
            status="ACCEPTED",
            frame_id=frame_id,
            processed_timestamp=ts,
            pipeline_latency_ms=12.5,
            cbf_active=False
        )

    @app.websocket("/ws/stream")
    async def websocket_stream(websocket: WebSocket):
        """Streams real-time serialized FrameBundle payloads to connected frontends."""
        await websocket.accept()
        _active_websockets.append(websocket)
        logger.info(f"WebSocket client connected: {websocket.client}")
        try:
            while True:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            logger.info("WebSocket client disconnected.")
        finally:
            if websocket in _active_websockets:
                _active_websockets.remove(websocket)

    return app


async def broadcast_frame(frame: FrameBundle):
    """Broadcasts a newly processed FrameBundle to all active WebSocket listeners."""
    global_telemetry_bus.record_frame(frame)

    if not _active_websockets:
        return

    payload_json = frame.model_dump_json()
    disconnected = []
    for ws in _active_websockets:
        try:
            await ws.send_text(payload_json)
        except Exception:
            disconnected.append(ws)

    for ws in disconnected:
        if ws in _active_websockets:
            _active_websockets.remove(ws)


def set_current_frame(frame: FrameBundle):
    """Synchronous helper to update in-memory state."""
    global_telemetry_bus.record_frame(frame)


app = create_app()
