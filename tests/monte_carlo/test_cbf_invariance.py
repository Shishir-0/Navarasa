"""
Monte Carlo Randomized Safety Invariance & CBF Barrier Robustness Test.
"""

import random
import pytest
from control.cbf import ControlBarrierFunctionShield
from backend.core.types import ActorState, TrackState, Vector2D, BoundingBox3D, ActorType, TrackStatus


def test_monte_carlo_cbf_invariance():
    shield = ControlBarrierFunctionShield()
    bbox = BoundingBox3D(length=4.8, width=2.0, height=1.5)
    random.seed(42)

    trials = 50
    safety_violations = 0

    for trial in range(trials):
        # Random initial ego velocity and distance to random obstacle
        obs_x = random.uniform(4.0, 15.0)
        obs_y = random.uniform(-1.5, 1.5)
        ego_speed = random.uniform(5.0, 15.0)

        ego = ActorState(
            actor_id="ego",
            actor_type=ActorType.EGO,
            position=Vector2D(x=0.0, y=0.0),
            heading=0.0,
            velocity=Vector2D(x=ego_speed, y=0.0),
            speed=ego_speed,
            bbox=bbox
        )

        obs = TrackState(
            track_id=f"obs_{trial}",
            actor_type=ActorType.AUTORICKSHAW,
            status=TrackStatus.CONFIRMED,
            state_vector=[obs_x, obs_y, 0.0, 0.0],
            covariance_matrix=[[0.1, 0.0], [0.0, 0.1]],
            position=Vector2D(x=obs_x, y=obs_y),
            velocity=Vector2D(x=0.0, y=0.0),
            speed=0.0,
            heading=0.0,
            bbox=bbox
        )

        # Unsafe aggressive nominal acceleration command
        nom_accel = 3.0
        nom_steer = 0.0

        safe_a, safe_d, cbf_active, slack, min_margin = shield.filter_control(
            ego, [obs], nom_accel, nom_steer
        )

        # If obstacle is within critical stopping distance, CBF MUST decelerate
        if obs_x < 10.0 and abs(obs_y) < 2.0:
            if safe_a > 0.5:
                safety_violations += 1

    assert safety_violations == 0
