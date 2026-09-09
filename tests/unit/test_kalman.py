"""
Unit tests for 4D Linear Kalman Filter.
"""

import math
import numpy as np
import pytest
from tracking.kalman_filter import LinearKalmanFilter


def test_kalman_constant_velocity():
    # True motion: starting at x=0, vx=10.0 m/s
    kf = LinearKalmanFilter(init_x=0.0, init_y=0.0, init_vx=0.0, init_vy=0.0)
    dt = 0.1
    true_x = 0.0
    vx = 10.0

    for step in range(30):
        true_x += vx * dt
        kf.predict(dt)
        # Add noisy measurement
        noise = np.random.normal(0, 0.2)
        z_x = true_x + noise
        kf.update_position(z_x, 0.0)

    est_x, est_y = kf.position
    est_vx, est_vy = kf.velocity

    assert math.isclose(est_x, true_x, abs_tol=0.8)
    assert math.isclose(est_vx, vx, abs_tol=1.0)
    assert math.isclose(est_y, 0.0, abs_tol=0.5)


def test_kalman_covariance_reduction():
    kf = LinearKalmanFilter(init_x=0.0, init_y=0.0)
    init_cov_norm = np.linalg.norm(kf.P)

    for _ in range(10):
        kf.predict(0.1)
        kf.update_position(0.0, 0.0)

    final_cov_norm = np.linalg.norm(kf.P)
    assert final_cov_norm < init_cov_norm
