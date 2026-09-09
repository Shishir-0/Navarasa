"""
Scenario Benchmark Test: Autorickshaw Cut-in with Blindspot Pedestrian.
"""

import pytest
from backend.engine import NavrasaAutonomyEngine


def test_autorickshaw_cutin_scenario_execution():
    engine = NavrasaAutonomyEngine()
    engine.load_scenario("autorickshaw_cutin_blindspot")

    # Run for 4.0 seconds of simulation (80 frames at dt=0.05)
    collision_occurred = False

    for frame in range(80):
        bundle = engine.step(dt=0.05)

        # Check collision safety distance to any tracked actor
        ego_pos = bundle.ego_state.position
        for t in bundle.tracks:
            dist = ((t.position.x - ego_pos.x)**2 + (t.position.y - ego_pos.y)**2)**0.5
            # Safety violation if center distance drops below 1.5m
            if dist < 1.5:
                collision_occurred = True

    assert collision_occurred is False
    assert bundle.ego_state.position.x > 15.0
