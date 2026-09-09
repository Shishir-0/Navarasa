"""
Comprehensive integration tests for the unified Telemetry Bus,
Decision Timeline Engine, and FastAPI Ingestion Gateway.
"""

import pytest
from fastapi.testclient import TestClient
from backend.telemetry_bus import TelemetryBus, TelemetryEvent, TelemetryTopic, global_telemetry_bus
from backend.decision_timeline import DecisionTimelineEngine, global_decision_timeline
from backend.engine import NavrasaAutonomyEngine
from api.server import create_app


@pytest.fixture
def clean_telemetry_bus():
    bus = TelemetryBus(max_buffer_size=300)
    timeline = DecisionTimelineEngine(bus=bus)
    return bus, timeline


def test_telemetry_bus_pub_sub(clean_telemetry_bus):
    bus, timeline = clean_telemetry_bus
    received_events = []

    def on_tracks(event: TelemetryEvent):
        received_events.append(event)

    bus.subscribe(TelemetryTopic.TRACKS_UPDATED, on_tracks)

    event = TelemetryEvent(
        topic=TelemetryTopic.TRACKS_UPDATED,
        frame_id=1,
        timestamp=0.05,
        payload=[],
        metadata={"test": True}
    )
    bus.publish(TelemetryTopic.TRACKS_UPDATED, event)

    assert len(received_events) == 1
    assert received_events[0].frame_id == 1
    assert received_events[0].metadata["test"] is True


def test_telemetry_bus_rolling_buffer(clean_telemetry_bus):
    bus, timeline = clean_telemetry_bus
    engine = NavrasaAutonomyEngine(bus=bus, db_path=":memory:")

    for _ in range(10):
        engine.step(dt=0.05)

    buffer = bus.get_replay_buffer()
    assert len(buffer) == 10
    assert buffer[-1].frame_id == 10

    # Seek frame
    frame_5 = bus.get_frame_by_id(5)
    assert frame_5 is not None
    assert frame_5.frame_id == 5


def test_decision_timeline_auto_generation(clean_telemetry_bus):
    bus, timeline = clean_telemetry_bus
    engine = NavrasaAutonomyEngine(bus=bus, db_path=":memory:")

    for _ in range(5):
        engine.step(dt=0.05)

    events = timeline.get_timeline(limit=50)
    assert len(events) >= 5
    for evt in events:
        assert evt.frame_id > 0
        assert evt.category in ["nominal", "intent", "planning", "cbf", "critical"]
        assert "actorId" in evt.perception
        assert "algorithm" in evt.planning
        assert "throttle" in evt.control


def test_fastapi_endpoints_with_telemetry_bus():
    bus = TelemetryBus(max_buffer_size=300)
    timeline = DecisionTimelineEngine(bus=bus)
    engine = NavrasaAutonomyEngine(bus=bus, db_path=":memory:")
    
    # Step engine to populate telemetry state
    engine.step(dt=0.05)
    
    app = create_app(bus=bus)
    client = TestClient(app)

    # Health
    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "HEALTHY"
    assert r_health.json()["frame_available"] is True

    # Actors & Tracks
    r_actors = client.get("/actors")
    assert r_actors.status_code == 200
    assert len(r_actors.json()) > 0

    r_tracks = client.get("/tracks")
    assert r_tracks.status_code == 200

    # Graph
    r_graph = client.get("/graph")
    assert r_graph.status_code == 200
    assert "nodes" in r_graph.json()

    # Prediction
    r_pred = client.get("/prediction")
    assert r_pred.status_code == 200
    assert "predictions" in r_pred.json()

    # Risk
    r_risk = client.get("/risk")
    assert r_risk.status_code == 200
    assert "data" in r_risk.json()

    # Planner & Control
    r_plan = client.get("/planner")
    assert r_plan.status_code == 200
    assert "waypoints" in r_plan.json()

    r_ctrl = client.get("/control")
    assert r_ctrl.status_code == 200
    assert "steering_angle" in r_ctrl.json()

    # Timeline & Replay
    r_timeline = client.get("/timeline")
    assert r_timeline.status_code == 200

    r_replay = client.get("/replay/frames")
    assert r_replay.status_code == 200
    assert len(r_replay.json()) == 1

    # Ingest Simulation Frame
    r_ingest = client.post("/simulation/ingest", json={
        "frame_id": 100,
        "timestamp": 5.0,
        "scenario": "test_scenario"
    })
    assert r_ingest.status_code == 200
    assert r_ingest.json()["status"] == "ACCEPTED"
