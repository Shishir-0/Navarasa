"""
Tests for shared/frame_schema.json data contract validation.
"""

import os
import json
import pytest
from backend.core.types import (
    ActorType,
    ActorState,
    Vector2D,
    BoundingBox3D,
    FrameBundle,
    SystemMetrics,
    RoadIntentGraphState,
    PredictionState
)
from simulation.synthetic_world import SyntheticWorld


def test_frame_schema_json_exists_and_parses():
    schema_path = os.path.join(os.path.dirname(__file__), "..", "..", "shared", "frame_schema.json")
    assert os.path.exists(schema_path), "shared/frame_schema.json must exist"

    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)

    assert schema.get("title") == "NavrasaFrameBundle"
    assert schema.get("version") == "1.0.0"
    assert "properties" in schema
    assert "ego" in schema["properties"]
    assert "actors" in schema["properties"]
    assert "lidar" in schema["properties"]


def test_synthetic_world_produces_contract_compliant_state():
    world = SyntheticWorld()
    ego = world.get_ego_state()
    assert ego.actor_id == "ego"
    assert ego.actor_type == ActorType.EGO
    assert isinstance(ego.position, Vector2D)
    assert isinstance(ego.bbox, BoundingBox3D)

    detections = world.generate_sensor_detections()
    assert isinstance(detections, list)
    for det in detections:
        assert det.sensor_type in ["CAMERA", "LIDAR", "RADAR"]
        assert 0.0 <= det.confidence <= 1.0
