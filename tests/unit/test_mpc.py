"""
Unit tests for Model Predictive Controller.
"""

import math
import pytest
from control.mpc import ModelPredictiveController
from backend.core.types import ActorState, PlanState, TrajectoryPoint, Vector2D, BoundingBox3D, ActorType


def test_mpc_tracking_straight():
    mpc = ModelPredictiveController()
    bbox = BoundingBox3D(length=4.8, width=2.0, height=1.5)

    ego = ActorState(
        actor_id="ego",
        actor_type=ActorType.EGO,
        position=Vector2D(x=0.0, y=0.5),  # Slightly offset lateral error +0.5m
        heading=0.0,
        speed=10.0,
        bbox=bbox
    )

    # Reference trajectory is straight down y=0 at 10 m/s
    ref_points = [
        TrajectoryPoint(x=float(i), y=0.0, v=10.0, yaw=0.0, time=i * 0.1)
        for i in range(30)
    ]
    ref_plan = PlanState(
        timestamp=0.0,
        planner_type="HYBRID_A_STAR",
        waypoints=ref_points,
        planning_time_ms=5.0,
        path_length=30.0,
        max_curvature=0.0,
        max_jerk=0.0,
        cost=0.0,
        success=True
    )

    accel, steer, solve_time = mpc.solve(ego, ref_plan)

    # To correct +0.5m lateral offset, steering must be negative (steer right)
    assert steer < 0.0
    assert abs(accel) <= 3.0
    assert solve_time < 100.0  # Real-time requirement
