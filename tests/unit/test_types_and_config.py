"""
Unit tests for NAVRASA types and configuration loader.
"""

import pytest
from backend.core.types import (
    ActorType,
    TrackStatus,
    Vector2D,
    BoundingBox3D,
    ActorState,
    SensorDetection,
    TrackState,
    IntentNode,
    IntentNodeType,
    IntentEdge,
    IntentEdgeType,
    RoadIntentGraphState,
    TrajectoryPoint,
    TrajectoryHypothesis,
    ActorPrediction,
    PredictionState,
    RiskGridMap,
    PlanState,
    ControlCommand,
    SystemMetrics,
    FrameBundle
)
from backend.core.config import load_config, NavrasaConfig


def test_core_types_serialization():
    ego = ActorState(
        actor_id="ego",
        actor_type=ActorType.EGO,
        position=Vector2D(x=0.0, y=0.0),
        heading=0.0,
        speed=10.0,
        bbox=BoundingBox3D(length=4.8, width=2.0, height=1.5)
    )
    assert ego.position.x == 0.0
    assert ego.actor_type == ActorType.EGO
    data = ego.model_dump()
    assert data["actor_id"] == "ego"
    assert data["speed"] == 10.0


def test_frame_bundle_integrity():
    ego = ActorState(
        actor_id="ego",
        actor_type=ActorType.EGO,
        position=Vector2D(x=0.0, y=0.0),
        heading=0.0,
        speed=10.0,
        bbox=BoundingBox3D(length=4.8, width=2.0, height=1.5)
    )
    node = IntentNode(
        node_id="ego",
        node_type=IntentNodeType.EGO,
        position=Vector2D(x=0.0, y=0.0),
        velocity=Vector2D(x=10.0, y=0.0),
        heading=0.0,
        speed=10.0
    )
    graph = RoadIntentGraphState(timestamp=0.0, nodes={"ego": node}, edges=[])
    preds = PredictionState(timestamp=0.0, predictions={})
    metrics = SystemMetrics(
        fps=20.0,
        total_pipeline_latency_ms=12.5,
        tracking_latency_ms=2.1,
        graph_latency_ms=1.5,
        prediction_latency_ms=3.2,
        risk_latency_ms=1.8,
        planning_latency_ms=2.5,
        control_latency_ms=1.4,
        active_tracks_count=1,
        cbf_interventions_total=0
    )

    bundle = FrameBundle(
        frame_id=1,
        timestamp=0.05,
        ego_state=ego,
        raw_detections=[],
        tracks=[],
        intent_graph=graph,
        predictions=preds,
        metrics=metrics,
        decision_narrative="Cruising in lane without obstacles."
    )

    assert bundle.frame_id == 1
    json_str = bundle.model_dump_json()
    assert "Cruising" in json_str


def test_config_loader():
    cfg = load_config("configs/default_config.yaml")
    assert isinstance(cfg, NavrasaConfig)
    assert cfg.vehicle.wheelbase == 2.8
    assert cfg.planning.primary_planner == "HYBRID_A_STAR"
    assert cfg.control.cbf_gamma == 0.8
