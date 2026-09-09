"""
Scenario Benchmark Test: Stationary Cow Blockage with Lateral Nudge.
"""

import pytest
from backend.engine import NavrasaAutonomyEngine


def test_cow_blockage_lateral_nudge_scenario():
    engine = NavrasaAutonomyEngine()
    engine.load_scenario("cow_blockage_lateral_nudge")

    # Run for 5.0 seconds
    for _ in range(100):
        bundle = engine.step(dt=0.05)

    # Verify vehicle successfully progressed past x=30.0 without collision
    assert bundle.ego_state.position.x > 25.0
