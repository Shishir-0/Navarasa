"""
Unit tests for Road Intent Graph and spatial relation classification.
"""

import math
import pytest
from backend.core.types import (
    ActorType,
    ActorState,
    TrackState,
    TrackStatus,
    Vector2D,
    BoundingBox3D,
    IntentEdgeType
)
from graph.road_intent_graph import RoadIntentGraph
from graph.spatial_relations import compute_ttc, classify_spatial_relation


def test_compute_ttc():
    # Car A at (0, 0) moving +10 m/s in x
    # Car B at (30, 0) moving -5 m/s in x (Head-on collision)
    pos_a = (0.0, 0.0)
    vel_a = (10.0, 0.0)
    pos_b = (30.0, 0.0)
    vel_b = (-5.0, 0.0)

    # Relative dist = 30, relative closing speed = 15 -> TTC = 30 / 15 = 2.0 s
    ttc = compute_ttc(pos_a, vel_a, pos_b, vel_b)
    assert ttc is not None
    assert math.isclose(ttc, 2.0, abs_tol=1e-3)


def test_classify_spatial_relation_conflict():
    pos_i = (0.0, 0.0)
    vel_i = (10.0, 0.0)
    pos_j = (15.0, 0.0)
    vel_j = (0.0, 0.0)

    # Closing at 10 m/s with 15m distance -> TTC = 1.5s < 4.0s (Conflict!)
    edge_type, weight, ttc = classify_spatial_relation(
        pos_i, vel_i, 0.0, pos_j, vel_j, 0.0
    )
    assert edge_type == IntentEdgeType.CONFLICT
    assert ttc is not None and ttc < 4.0


def test_road_intent_graph_construction():
    rig = RoadIntentGraph()
    bbox = BoundingBox3D(length=4.0, width=1.8, height=1.5)

    ego = ActorState(
        actor_id="ego",
        actor_type=ActorType.EGO,
        position=Vector2D(x=0.0, y=0.0),
        heading=0.0,
        velocity=Vector2D(x=10.0, y=0.0),
        speed=10.0,
        bbox=bbox
    )

    track1 = TrackState(
        track_id="trk_001",
        actor_type=ActorType.AUTORICKSHAW,
        status=TrackStatus.CONFIRMED,
        state_vector=[12.0, 1.0, 8.0, 0.0],
        covariance_matrix=[[0.1, 0.0], [0.0, 0.1]],
        position=Vector2D(x=12.0, y=1.0),
        velocity=Vector2D(x=8.0, y=0.0),
        speed=8.0,
        heading=0.0,
        bbox=bbox
    )

    graph_state = rig.build_graph(ego, [track1], timestamp=0.1)

    assert "ego" in graph_state.nodes
    assert "trk_001" in graph_state.nodes
    assert len(graph_state.edges) >= 2  # Bidirectional directed edges
