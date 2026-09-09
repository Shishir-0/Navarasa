"""
Unit tests for normalized SQLite database and replay.
"""

import os
import pytest
from backend.database import NavrasaDatabase
from backend.core.types import (
    ActorType,
    ActorState,
    Vector2D,
    BoundingBox3D,
    IntentNode,
    IntentNodeType,
    RoadIntentGraphState,
    PredictionState,
    SystemMetrics,
    FrameBundle
)


def test_database_lifecycle(tmp_path):
    db_file = str(tmp_path / "test_replay.db")
    db = NavrasaDatabase(db_path=db_file)

    run_id = "test_run_001"
    db.start_run(run_id, "test_scen", "Test Scenario")

    ego = ActorState(
        actor_id="ego",
        actor_type=ActorType.EGO,
        position=Vector2D(x=5.0, y=0.0),
        heading=0.1,
        speed=10.0,
        bbox=BoundingBox3D(length=4.8, width=2.0, height=1.5)
    )
    node = IntentNode(
        node_id="ego",
        node_type=IntentNodeType.EGO,
        position=Vector2D(x=5.0, y=0.0),
        velocity=Vector2D(x=10.0, y=0.0),
        heading=0.1,
        speed=10.0
    )
    graph = RoadIntentGraphState(timestamp=0.1, nodes={"ego": node}, edges=[])
    preds = PredictionState(timestamp=0.1, predictions={})
    metrics = SystemMetrics(
        fps=20.0,
        total_pipeline_latency_ms=10.0,
        tracking_latency_ms=2.0,
        graph_latency_ms=1.0,
        prediction_latency_ms=2.0,
        risk_latency_ms=1.0,
        planning_latency_ms=2.0,
        control_latency_ms=1.0,
        active_tracks_count=0,
        cbf_interventions_total=0
    )

    bundle = FrameBundle(
        frame_id=1,
        timestamp=0.1,
        ego_state=ego,
        raw_detections=[],
        tracks=[],
        intent_graph=graph,
        predictions=preds,
        metrics=metrics,
        decision_narrative="Normal highway driving."
    )

    db.save_frame(run_id, bundle)
    frames = db.get_run_frames(run_id)
    assert len(frames) == 1
    assert frames[0]["frame_id"] == 1
    assert frames[0]["ego_speed"] == 10.0
