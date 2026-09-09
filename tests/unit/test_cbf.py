"""
Unit tests for Control Barrier Function Safety Shield.
"""

import math
import pytest
from control.cbf import ControlBarrierFunctionShield
from backend.core.types import ActorState, TrackState, Vector2D, BoundingBox3D, ActorType, TrackStatus


def test_cbf_intervention_on_collision_course():
    shield = ControlBarrierFunctionShield()
    bbox = BoundingBox3D(length=4.8, width=2.0, height=1.5)

    # Ego vehicle moving directly towards obstacle at x=8.0 with speed 10 m/s
    ego = ActorState(
        actor_id="ego",
        actor_type=ActorType.EGO,
        position=Vector2D(x=0.0, y=0.0),
        heading=0.0,
        velocity=Vector2D(x=10.0, y=0.0),
        speed=10.0,
        bbox=bbox
    )

    obstacle = TrackState(
        track_id="obs_01",
        actor_type=ActorType.STATIC_OBSTACLE,
        status=TrackStatus.CONFIRMED,
        state_vector=[8.0, 0.0, 0.0, 0.0],
        covariance_matrix=[[0.1, 0.0], [0.0, 0.1]],
        position=Vector2D(x=8.0, y=0.0),
        velocity=Vector2D(x=0.0, y=0.0),
        speed=0.0,
        heading=0.0,
        bbox=bbox
    )

    # Nominal command is full acceleration (unsafe!)
    nom_accel = 2.0
    nom_steer = 0.0

    safe_a, safe_d, cbf_active, slack, min_margin = shield.filter_control(
        ego, [obstacle], nom_accel, nom_steer
    )

    # CBF must intervene with braking or steering to prevent collision!
    assert cbf_active is True
    assert safe_a < nom_accel  # Must decelerate
    assert safe_a < 0.0        # Braking command enforced
