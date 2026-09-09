"""
Unit tests for Dynamic 2D Spatial Risk Field.
"""

import math
import pytest
import numpy as np
from backend.core.types import (
    ActorType,
    ActorState,
    TrackState,
    TrackStatus,
    Vector2D,
    BoundingBox3D
)
from prediction.risk_field import DynamicRiskField
from prediction.future_composer import FutureRoadComposer


def test_dynamic_risk_field_generation():
    risk_gen = DynamicRiskField()
    frc = FutureRoadComposer()
    bbox = BoundingBox3D(length=4.8, width=2.0, height=1.5)

    ego = ActorState(
        actor_id="ego",
        actor_type=ActorType.EGO,
        position=Vector2D(x=0.0, y=0.0),
        heading=0.0,
        speed=10.0,
        bbox=bbox
    )

    track = TrackState(
        track_id="trk_cow",
        actor_type=ActorType.CATTLE,
        status=TrackStatus.CONFIRMED,
        state_vector=[15.0, 0.0, 0.0, 0.0],
        covariance_matrix=[[0.1, 0.0], [0.0, 0.1]],
        position=Vector2D(x=15.0, y=0.0),
        velocity=Vector2D(x=0.0, y=0.0),
        speed=0.0,
        heading=0.0,
        bbox=bbox
    )

    preds = frc.generate_scene_predictions([track])
    risk_map = risk_gen.generate_risk_map(ego, [track], preds)

    assert risk_map.width > 0
    assert risk_map.height > 0
    assert len(risk_map.data) == risk_map.height

    # Risk at obstacle position should be significantly higher than far away
    risk_at_cow = risk_gen.evaluate_risk_at(risk_map, 15.0, 0.0)
    risk_far_away = risk_gen.evaluate_risk_at(risk_map, -20.0, -20.0)

    assert risk_at_cow > 0.3
    assert risk_at_cow > risk_far_away
    assert risk_map.grad_x is not None
