"""
Unit tests for D* Lite Incremental Replanner.
"""

import pytest
from planning.d_star_lite import DStarLite


def test_d_star_lite_replanning():
    planner = DStarLite(resolution=0.5)
    start = (0.0, 0.0)
    goal = (10.0, 0.0)

    # 1. Initial Plan
    planner.initialize(start, goal)
    path1 = planner.extract_path()
    assert len(path1) > 0
    assert path1[-1] == (10.0, 0.0)

    # 2. Dynamically block direct path at (5.0, 0.0)
    planner.update_obstacle((5.0, 0.0), is_obstacle=True)
    path2 = planner.extract_path()

    assert len(path2) > 0
    assert path2[-1] == (10.0, 0.0)
    # The new path must navigate around (5.0, 0.0)
    assert (5.0, 0.0) not in path2
