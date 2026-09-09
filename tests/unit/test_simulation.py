"""
Unit tests for synthetic simulation and scenario loading.
"""

import pytest
from simulation.synthetic_world import SyntheticWorld
from simulation.scenarios import load_all_scenarios, get_scenario_by_id
from backend.core.types import ActorType


def test_scenario_loader():
    scenarios = load_all_scenarios()
    assert len(scenarios) >= 3
    s1 = get_scenario_by_id("autorickshaw_cutin_blindspot")
    assert s1 is not None
    assert s1["ego_start"]["speed"] == 8.0


def test_synthetic_world_stepping():
    world = SyntheticWorld(seed=123)
    s1 = get_scenario_by_id("autorickshaw_cutin_blindspot")
    assert s1 is not None
    world.load_scenario(s1)

    initial_x = world.ego.x
    world.step(ego_steer=0.0, ego_accel=1.0, dt=0.1)

    assert world.ego.x > initial_x
    assert world.ego.speed > 8.0
    states = world.get_all_actor_states()
    assert len(states) == 3


def test_sensor_detections():
    world = SyntheticWorld(seed=42)
    s1 = get_scenario_by_id("autorickshaw_cutin_blindspot")
    assert s1 is not None
    world.load_scenario(s1)

    detections = world.generate_sensor_detections()
    assert len(detections) > 0
    # Must have LiDAR detections
    lidar_dets = [d for d in detections if d.sensor_type == "LIDAR"]
    assert len(lidar_dets) > 0
