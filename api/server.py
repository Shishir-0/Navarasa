"""
NAVRASA FastAPI Server and Real-Time JSON Streaming Hub.

Exposes RESTful endpoints and high-throughput WebSockets for telemetry,
active tracks, intent graph, future predictions, risk field, planner output,
CBF/MPC controls, and frame-by-frame explainability logs.
"""

from __future__ import annotations
import asyncio
import json
import logging
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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

logger = logging.getLogger("NAVRASA.API")

# Global in-memory pipeline state cache (updated at each step)
_latest_frame: Optional[FrameBundle] = None
_timeline_history: List[Dict[str, Any]] = []
_active_websockets: List[WebSocket] = []


def create_app(config: Optional[NavrasaConfig] = None) -> FastAPI:
    cfg = config or load_config()

    app = FastAPI(
        title="NAVRASA Autonomous Systems API",
        description="REST and WebSocket Streaming Gateway for Neural Adaptive Vehicular Reasoning",
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
        return {
            "status": "HEALTHY",
            "system": "NAVRASA",
            "version": "1.0.0",
            "frame_available": _latest_frame is not None
        }

    @app.get("/actors", response_model=List[ActorState])
    async def get_actors():
        if not _latest_frame:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        # Return ego plus raw detected / simulated actors
        return [_latest_frame.ego_state]

    @app.get("/tracks", response_model=List[TrackState])
    async def get_tracks():
        if not _latest_frame:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return _latest_frame.tracks

    @app.get("/graph", response_model=RoadIntentGraphState)
    async def get_graph():
        if not _latest_frame:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return _latest_frame.intent_graph

    @app.get("/prediction", response_model=PredictionState)
    async def get_prediction():
        if not _latest_frame:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return _latest_frame.predictions

    @app.get("/risk", response_model=Optional[RiskGridMap])
    async def get_risk():
        if not _latest_frame:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return _latest_frame.risk_map

    @app.get("/planner", response_model=Optional[PlanState])
    async def get_planner():
        if not _latest_frame:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return _latest_frame.planned_trajectory

    @app.get("/control", response_model=Optional[ControlCommand])
    async def get_control():
        if not _latest_frame:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return _latest_frame.control_command

    @app.get("/timeline")
    async def get_timeline(limit: int = 50):
        return _timeline_history[-limit:]

    @app.get("/metrics", response_model=SystemMetrics)
    async def get_metrics():
        if not _latest_frame:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
        return _latest_frame.metrics

    @app.websocket("/ws/stream")
    async def websocket_stream(websocket: WebSocket):
        """Streams real-time serialized FrameBundle payloads to connected frontends."""
        await websocket.accept()
        _active_websockets.append(websocket)
        logger.info(f"WebSocket client connected: {websocket.client}")
        try:
            while True:
                # Keepalive / receive ping
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
    global _latest_frame, _timeline_history
    _latest_frame = frame

    _timeline_history.append({
        "frame_id": frame.frame_id,
        "timestamp": frame.timestamp,
        "narrative": frame.decision_narrative,
        "cbf_active": frame.control_command.cbf_active if frame.control_command else False,
        "active_tracks": len(frame.tracks)
    })
    if len(_timeline_history) > 500:
        _timeline_history.pop(0)

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
    global _latest_frame, _timeline_history
    _latest_frame = frame
    _timeline_history.append({
        "frame_id": frame.frame_id,
        "timestamp": frame.timestamp,
        "narrative": frame.decision_narrative,
        "cbf_active": frame.control_command.cbf_active if frame.control_command else False,
        "active_tracks": len(frame.tracks)
    })
    if len(_timeline_history) > 500:
        _timeline_history.pop(0)


app = create_app()
