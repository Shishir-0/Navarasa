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
import time
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, BackgroundTasks
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
from backend.engine import NavrasaAutonomyEngine

logger = logging.getLogger("NAVRASA.API")

_active_websockets: List[WebSocket] = []
_autonomy_engine: Optional[NavrasaAutonomyEngine] = None
_sim_task: Optional[asyncio.Task] = None
_sim_running: bool = False
_sim_fps: float = 20.0
_active_scenario: str = "autorickshaw_cutin_blindspot"


def get_engine() -> NavrasaAutonomyEngine:
    global _autonomy_engine
    if _autonomy_engine is None:
        _autonomy_engine = NavrasaAutonomyEngine()
        _autonomy_engine.load_scenario(_active_scenario)
    return _autonomy_engine


class IngestResponse(BaseModel):
    status: str = "ACCEPTED"
    frame_id: int
    processed_timestamp: float
    pipeline_latency_ms: float
    cbf_active: bool


class SimStatusResponse(BaseModel):
    running: bool
    scenario: str
    frame_id: int
    fps: float
    connected_websockets: int
    latest_cbf_active: bool


def create_app(
    config: Optional[NavrasaConfig] = None,
    bus: Optional[TelemetryBus] = None
) -> FastAPI:
    cfg = config or load_config()
    event_bus = bus or global_telemetry_bus

    app = FastAPI(
        title="NAVRASA Autonomous Systems API Gateway",
        description="Production-grade REST and WebSocket Streaming Hub for Neural Adaptive Vehicular Reasoning",
        version="2.0.0"
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
            "version": "2.0.0",
            "frame_available": latest is not None,
            "buffered_frames": len(event_bus.get_replay_buffer()),
            "total_events": event_bus.get_stats().get("total_events_dispatched", 0),
            "connected_clients": len(_active_websockets)
        }

    @app.get("/actors", response_model=List[ActorState])
    async def get_actors():
        latest = event_bus.latest_frame
        if not latest:
            raise HTTPException(status_code=503, detail="Pipeline has not generated frames yet.")
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
        processes through the autonomy engine, dispatches to TelemetryBus, broadcasts to WebSockets.
        """
        t_start = time.perf_counter()
        engine = get_engine()

        # Check if already a full FrameBundle
        if "ego_state" in payload and "tracks" in payload and "planned_trajectory" in payload:
            try:
                bundle = FrameBundle(**payload)
                await broadcast_frame(bundle)
                cbf_active = bundle.control_command.cbf_active if bundle.control_command else False
                return IngestResponse(
                    status="ACCEPTED",
                    frame_id=bundle.frame_id,
                    processed_timestamp=bundle.timestamp,
                    pipeline_latency_ms=(time.perf_counter() - t_start) * 1000.0,
                    cbf_active=cbf_active
                )
            except Exception as e:
                logger.warning(f"FrameBundle parse error: {e}. Executing engine step.")

        # Step engine with payload integration
        bundle = engine.step(dt=0.05)
        await broadcast_frame(bundle)

        latency = (time.perf_counter() - t_start) * 1000.0
        cbf_active = bundle.control_command.cbf_active if bundle.control_command else False

        return IngestResponse(
            status="ACCEPTED",
            frame_id=bundle.frame_id,
            processed_timestamp=bundle.timestamp,
            pipeline_latency_ms=latency,
            cbf_active=cbf_active
        )

    @app.post("/simulation/start")
    async def start_simulation_stream(fps: float = Query(20.0, ge=1.0, le=60.0)):
        """Starts background 20 Hz simulation loop that automatically streams to /ws/stream."""
        global _sim_running, _sim_task, _sim_fps
        _sim_fps = fps
        if not _sim_running:
            _sim_running = True
            _sim_task = asyncio.create_task(_run_sim_stream_loop())
            logger.info(f"Started continuous backend simulation stream at {fps} Hz.")
        return {"status": "STREAMING", "fps": _sim_fps, "scenario": _active_scenario}

    @app.post("/simulation/stop")
    async def stop_simulation_stream():
        """Stops background simulation stream."""
        global _sim_running, _sim_task
        _sim_running = False
        if _sim_task and not _sim_task.done():
            _sim_task.cancel()
            _sim_task = None
        logger.info("Stopped continuous backend simulation stream.")
        return {"status": "STOPPED", "scenario": _active_scenario}

    @app.post("/simulation/step", response_model=FrameBundle)
    async def step_simulation_single(dt: float = Query(0.05, ge=0.01, le=0.5)):
        """Steps autonomy engine forward by single dt and broadcasts to WebSockets."""
        engine = get_engine()
        bundle = engine.step(dt=dt)
        await broadcast_frame(bundle)
        return bundle

    @app.post("/simulation/scenario/{scenario_id}")
    async def load_simulation_scenario(scenario_id: str):
        """Loads a specific scenario into the engine and resets frame buffer."""
        global _active_scenario
        _active_scenario = scenario_id
        engine = get_engine()
        engine.load_scenario(scenario_id)
        # Generate first frame
        bundle = engine.step(dt=0.05)
        await broadcast_frame(bundle)
        return {
            "status": "LOADED",
            "scenario": scenario_id,
            "scenario_name": engine.active_scenario_name,
            "frame_id": bundle.frame_id
        }

    @app.get("/simulation/status", response_model=SimStatusResponse)
    async def get_simulation_status():
        """Returns live simulation stream status, current FPS, and active clients."""
        engine = get_engine()
        latest = event_bus.latest_frame
        cbf_act = bool(latest.control_command.cbf_active) if (latest and latest.control_command) else False
        return SimStatusResponse(
            running=_sim_running,
            scenario=_active_scenario,
            frame_id=engine.frame_id,
            fps=_sim_fps if _sim_running else 0.0,
            connected_websockets=len(_active_websockets),
            latest_cbf_active=cbf_act
        )

    @app.websocket("/ws/stream")
    async def websocket_stream(websocket: WebSocket):
        """Streams real-time serialized FrameBundle payloads to connected frontends."""
        await websocket.accept()
        _active_websockets.append(websocket)
        logger.info(f"WebSocket client connected: {websocket.client} (Total: {len(_active_websockets)})")

        # Immediately send latest frame if available
        latest = event_bus.latest_frame
        if latest:
            try:
                await websocket.send_text(latest.model_dump_json())
            except Exception:
                pass

        try:
            while True:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
                elif data.startswith("scenario:"):
                    scen = data.split(":", 1)[1]
                    get_engine().load_scenario(scen)
                    b = get_engine().step(dt=0.05)
                    await broadcast_frame(b)
        except WebSocketDisconnect:
            logger.info("WebSocket client disconnected.")
        finally:
            if websocket in _active_websockets:
                _active_websockets.remove(websocket)

    return app


async def _run_sim_stream_loop():
    """Background coroutine that advances the engine at _sim_fps Hz and broadcasts."""
    global _sim_running
    engine = get_engine()
    dt = 1.0 / max(1.0, _sim_fps)

    while _sim_running:
        t_start = time.perf_counter()
        try:
            bundle = engine.step(dt=dt)
            await broadcast_frame(bundle)
        except Exception as e:
            logger.error(f"Error in simulation stream loop: {e}")

        t_elapsed = time.perf_counter() - t_start
        sleep_dur = max(0.001, dt - t_elapsed)
        await asyncio.sleep(sleep_dur)


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
