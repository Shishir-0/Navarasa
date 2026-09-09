"""
Unit tests for PyTorch Relational Graph Neural Network reasoning.
"""

import pytest
import torch
from graph.gnn_reasoning import IntentGNNReasoner
from graph.road_intent_graph import RoadIntentGraph
from backend.core.types import (
    ActorType,
    ActorState,
    TrackState,
    TrackStatus,
    Vector2D,
    BoundingBox3D
)


def test_gnn_forward_dimensions():
    model = IntentGNNReasoner(node_dim=8, edge_dim=4, hidden_dim=64)
    # Batch with 4 nodes, 6 edges
    node_feats = torch.randn(4, 8)
    edge_index = torch.tensor([
        [0, 1, 2, 3, 0, 2],
        [1, 0, 3, 2, 2, 0]
    ], dtype=torch.long)
    edge_feats = torch.randn(6, 4)

    embeds, attns, yield_p, assert_s = model(node_feats, edge_index, edge_feats)

    assert embeds.shape == (4, 64)
    assert attns.shape == (6,)
    assert yield_p.shape == (4,)
    assert assert_s.shape == (4,)
    # Assert probabilities in [0, 1]
    assert (yield_p >= 0.0).all() and (yield_p <= 1.0).all()


def test_gnn_reason_over_graph():
    model = IntentGNNReasoner()
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
        state_vector=[10.0, 2.0, 7.0, 0.0],
        covariance_matrix=[[0.1, 0.0], [0.0, 0.1]],
        position=Vector2D(x=10.0, y=2.0),
        velocity=Vector2D(x=7.0, y=0.0),
        speed=7.0,
        heading=0.0,
        bbox=bbox
    )

    graph_state = rig.build_graph(ego, [track1], timestamp=0.1)
    updated_graph = model.reason_over_graph(graph_state)

    assert "ego" in updated_graph.nodes
    assert "trk_001" in updated_graph.nodes
    assert 0.0 <= updated_graph.nodes["trk_001"].priority_score <= 1.0
