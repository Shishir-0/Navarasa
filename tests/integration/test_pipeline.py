"""
Integration tests for the complete NAVRASA autonomy engine.
"""

import pytest
from backend.engine import NavrasaAutonomyEngine
from backend.core.types import FrameBundle


def test_full_pipeline_step():
    engine = NavrasaAutonomyEngine()
    engine.load_scenario("autorickshaw_cutin_blindspot")

    bundle = engine.step(dt=0.05)
    assert isinstance(bundle, FrameBundle)
    assert bundle.frame_id == 1
    assert bundle.ego_state is not None
    assert bundle.intent_graph is not None
    assert bundle.predictions is not None
    assert bundle.risk_map is not None
    assert bundle.planned_trajectory is not None
    assert bundle.control_command is not None
    assert bundle.metrics.fps > 0.0


def test_consecutive_pipeline_execution():
    engine = NavrasaAutonomyEngine()
    engine.load_scenario("cow_blockage_lateral_nudge")

    # Run for 20 frames (1.0 second of simulation)
    for _ in range(20):
        bundle = engine.step(dt=0.05)

    assert bundle.frame_id == 20
    assert bundle.timestamp == pytest.approx(1.0, abs=0.05)
    assert bundle.ego_state.position.x > 0.0  # Vehicle moved forward safely
