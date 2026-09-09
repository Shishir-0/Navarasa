"""
Unit tests for Kinodynamic Hybrid A* Planner.
"""

import math
import pytest
from planning.hybrid_a_star import KinodynamicHybridAStar
from backend.core.types import TrackState, ActorType, TrackStatus, Vector2D, BoundingBox3D


def test_hybrid_a_star_feasibility():
    planner = KinodynamicHybridAStar()
    start = (0.0, 0.0, 0.0)
    goal = (20.0, 0.0, 0.0)

    # Empty road
    plan = planner.plan(start_pose=start, goal_pose=goal, tracks=[])

    assert plan.success is True
    assert len(plan.waypoints) > 2
    assert plan.path_length > 15.0
    assert plan.planning_time_ms < 150.0


def test_hybrid_a_star_obstacle_avoidance():
    planner = KinodynamicHybridAStar()
    start = (0.0, 0.0, 0.0)
    goal = (25.0, 0.0, 0.0)

    # Place a cow directly in lane at (12.0, 0.0)
    bbox = BoundingBox3D(length=2.2, width=1.2, height=1.5)
    cow = TrackState(
        track_id="cow_01",
        actor_type=ActorType.CATTLE,
        status=TrackStatus.CONFIRMED,
        state_vector=[12.0, 0.0, 0.0, 0.0],
        covariance_matrix=[[0.1, 0.0], [0.0, 0.1]],
        position=Vector2D(x=12.0, y=0.0),
        velocity=Vector2D(x=0.0, y=0.0),
        speed=0.0,
        heading=0.0,
        bbox=bbox
    )

    plan = planner.plan(start_pose=start, goal_pose=goal, tracks=[cow])

    assert plan.success is True
    # Verify that no waypoint is inside the cow's footprint
    for wp in plan.waypoints:
        dist_to_cow = math.hypot(wp.x - 12.0, wp.y - 0.0)
        assert dist_to_cow > 1.0  # Must maintain clearance
