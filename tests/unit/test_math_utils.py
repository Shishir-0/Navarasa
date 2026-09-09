"""
Unit tests for mathematical geometry and SE(2) transforms.
"""

import math
import numpy as np
import pytest
from backend.core.math_utils import (
    wrap_to_pi,
    rotation_matrix_2d,
    se2_transform,
    compute_obb_corners,
    check_sat_collision,
    point_to_segment_distance,
    raycast_polygon,
    calculate_curvature
)


def test_wrap_to_pi():
    assert math.isclose(wrap_to_pi(0.0), 0.0)
    assert math.isclose(wrap_to_pi(math.pi), -math.pi, abs_tol=1e-7)
    assert math.isclose(wrap_to_pi(3 * math.pi), -math.pi, abs_tol=1e-7)
    assert math.isclose(wrap_to_pi(-3 * math.pi), -math.pi, abs_tol=1e-7)
    assert math.isclose(wrap_to_pi(math.pi / 2), math.pi / 2, abs_tol=1e-7)


def test_se2_transforms():
    T = se2_transform(5.0, 10.0, math.pi / 2)
    assert math.isclose(T[0, 2], 5.0)
    assert math.isclose(T[1, 2], 10.0)
    # Rotating (1, 0) by 90 deg -> (0, 1) + (5, 10) = (5, 11)
    p_local = np.array([1.0, 0.0, 1.0])
    p_global = T @ p_local
    assert math.isclose(p_global[0], 5.0, abs_tol=1e-7)
    assert math.isclose(p_global[1], 11.0, abs_tol=1e-7)


def test_sat_collision_checking():
    # Box A centered at (0, 0) of size 4x2
    box_a = compute_obb_corners(0.0, 0.0, 0.0, 4.0, 2.0)
    # Box B overlapping at (2.0, 0.5) of size 4x2
    box_b = compute_obb_corners(2.0, 0.5, 0.0, 4.0, 2.0)
    assert check_sat_collision(box_a, box_b) is True

    # Box C clearly separated at (10.0, 10.0)
    box_c = compute_obb_corners(10.0, 10.0, 0.0, 4.0, 2.0)
    assert check_sat_collision(box_a, box_c) is False


def test_raycast_polygon():
    box = compute_obb_corners(10.0, 0.0, 0.0, 4.0, 2.0)
    origin = np.array([0.0, 0.0], dtype=np.float64)
    direction = np.array([1.0, 0.0], dtype=np.float64)
    # Box extends from x=8.0 to x=12.0
    dist = raycast_polygon(origin, direction, box, max_range=50.0)
    assert dist is not None
    assert math.isclose(dist, 8.0, abs_tol=1e-3)


def test_calculate_curvature():
    # Circle of radius R=10: x = 10*cos(t), y = 10*sin(t), kappa = 1/10 = 0.1
    t = np.linspace(0, math.pi / 2, 50)
    x = 10.0 * np.cos(t)
    y = 10.0 * np.sin(t)
    kappa = calculate_curvature(x, y)
    # Interior points should have curvature close to 0.1
    assert np.allclose(kappa[5:-5], 0.1, atol=0.02)
