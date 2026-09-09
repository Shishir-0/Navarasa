"""
Unit tests for Quintic Polynomial Trajectory Optimization.
"""

import math
import pytest
from planning.polynomial_spline import QuinticPolynomial1D, QuinticTrajectoryOptimizer


def test_quintic_polynomial_boundary_conditions():
    p0, v0, a0 = 0.0, 0.0, 0.0
    p1, v1, a1 = 10.0, 5.0, 0.0
    T = 2.0

    poly = QuinticPolynomial1D(p0, v0, a0, p1, v1, a1, T)

    # Initial condition verification
    assert math.isclose(poly.calc_point(0.0), p0, abs_tol=1e-5)
    assert math.isclose(poly.calc_first_derivative(0.0), v0, abs_tol=1e-5)
    assert math.isclose(poly.calc_second_derivative(0.0), a0, abs_tol=1e-5)

    # Terminal condition verification
    assert math.isclose(poly.calc_point(T), p1, abs_tol=1e-5)
    assert math.isclose(poly.calc_first_derivative(T), v1, abs_tol=1e-5)
    assert math.isclose(poly.calc_second_derivative(T), a1, abs_tol=1e-5)


def test_quintic_trajectory_optimizer_smoothness():
    opt = QuinticTrajectoryOptimizer()
    start = (0.0, 0.0, 5.0, 0.0, 0.0, 0.0)
    goal = (30.0, 3.5, 8.0, 0.0, 0.0, 0.0)

    traj = opt.optimize_path(start, goal, horizon_T=3.0, num_points=30)
    assert len(traj) == 30

    # Start and End points
    assert math.isclose(traj[0].x, 0.0, abs_tol=1e-3)
    assert math.isclose(traj[0].y, 0.0, abs_tol=1e-3)
    assert math.isclose(traj[-1].x, 30.0, abs_tol=1e-3)
    assert math.isclose(traj[-1].y, 3.5, abs_tol=1e-3)

    # Verify finite jerk
    for pt in traj:
        assert not math.isnan(pt.jerk)
        assert not math.isnan(pt.curvature)
