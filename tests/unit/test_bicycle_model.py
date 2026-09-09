"""
Unit tests for Kinematic Bicycle Model.
"""

import math
import pytest
from control.bicycle_model import KinematicBicycleModel


def test_bicycle_straight_motion():
    model = KinematicBicycleModel(wheelbase=2.8)
    # x=0, y=0, psi=0, v=10, accel=0, steer=0, dt=0.1
    nx, ny, npsi, nv = model.step(0.0, 0.0, 0.0, 10.0, 0.0, 0.0, dt=0.1)

    assert math.isclose(nx, 1.0, abs_tol=1e-5)
    assert math.isclose(ny, 0.0, abs_tol=1e-5)
    assert math.isclose(npsi, 0.0, abs_tol=1e-5)
    assert math.isclose(nv, 10.0, abs_tol=1e-5)


def test_bicycle_turning_motion():
    model = KinematicBicycleModel(wheelbase=2.8)
    # Turning left with steer = 0.2 rad
    nx, ny, npsi, nv = model.step(0.0, 0.0, 0.0, 10.0, 0.0, 0.2, dt=0.1)

    assert nx > 0.0
    assert npsi > 0.0  # Heading increases to the left
