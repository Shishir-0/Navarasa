"""
Unit tests for Baseline 2D A* Planner.
"""

import pytest
from planning.a_star import AStarPlanner


def test_a_star_direct_path():
    planner = AStarPlanner(resolution=0.5)
    path = planner.plan(start_pos=(0.0, 0.0), goal_pos=(10.0, 0.0))
    assert path is not None
    assert len(path) > 0
    assert path[0] == (0.0, 0.0)
    assert path[-1] == (10.0, 0.0)
