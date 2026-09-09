"""
Unit tests for 5D Unscented Kalman Filter with CTRV model.
"""

import math
import numpy as np
import pytest
from tracking.ukf import UnscentedKalmanFilter


def test_ukf_circular_motion():
    # True motion: radius R=20m, speed v=10m/s -> yaw_rate = v/R = 0.5 rad/s
    R = 20.0
    v = 10.0
    yaw_rate = v / R
    dt = 0.05

    ukf = UnscentedKalmanFilter(init_x=0.0, init_y=0.0, init_v=v, init_yaw=0.0, init_yaw_rate=0.0)

    true_x = 0.0
    true_y = 0.0
    true_yaw = 0.0

    for step in range(50):
        true_yaw += yaw_rate * dt
        true_x += v * math.cos(true_yaw) * dt
        true_y += v * math.sin(true_yaw) * dt

        ukf.predict(dt)
        # Add noisy measurements
        z_x = true_x + np.random.normal(0, 0.15)
        z_y = true_y + np.random.normal(0, 0.15)
        ukf.update_position(z_x, z_y)

    est_x, est_y = ukf.position
    assert math.isclose(est_x, true_x, abs_tol=1.0)
    assert math.isclose(est_y, true_y, abs_tol=1.0)
    assert math.isclose(ukf.speed, v, abs_tol=1.5)
    assert math.isclose(ukf.yaw_rate, yaw_rate, abs_tol=0.3)
