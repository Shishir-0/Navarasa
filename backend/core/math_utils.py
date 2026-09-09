"""
NAVRASA Mathematical Utilities and Geometry Engine.

Provides rigorous SE(2) Lie group transformations, polygon geometry,
Separating Axis Theorem (SAT) collision checking, ray casting,
and angle normalization routines.
"""

from __future__ import annotations
import math
from typing import List, Tuple, Optional
import numpy as np


def wrap_to_pi(angle: float) -> float:
    """
    Normalizes an angular measurement into the interval [-pi, pi).

    Args:
        angle: Input angle in radians.

    Returns:
        Normalized angle in [-pi, pi).
    """
    return (angle + math.pi) % (2.0 * math.pi) - math.pi


def rotation_matrix_2d(theta: float) -> np.ndarray:
    """
    Constructs a 2D SO(2) rotation matrix.

    R(theta) = [[cos(theta), -sin(theta)],
                [sin(theta),  cos(theta)]]
    """
    c = math.cos(theta)
    s = math.sin(theta)
    return np.array([[c, -s], [s, c]], dtype=np.float64)


def se2_transform(x: float, y: float, theta: float) -> np.ndarray:
    """
    Constructs a 3x3 homogeneous transformation matrix in SE(2).

    T = [[cos(theta), -sin(theta), x],
         [sin(theta),  cos(theta), y],
         [0,           0,          1]]
    """
    c = math.cos(theta)
    s = math.sin(theta)
    return np.array([
        [c, -s, x],
        [s,  c, y],
        [0.0, 0.0, 1.0]
    ], dtype=np.float64)


def transform_points(points: np.ndarray, x: float, y: float, theta: float) -> np.ndarray:
    """
    Transforms an Nx2 array of points from local frame to global frame using pose (x, y, theta).
    """
    R = rotation_matrix_2d(theta)
    return (points @ R.T) + np.array([x, y], dtype=np.float64)


def compute_obb_corners(x: float, y: float, theta: float, length: float, width: float) -> np.ndarray:
    """
    Computes the 4 corners of an Oriented Bounding Box (OBB) in global coordinates.

    Order: Front-Left, Front-Right, Rear-Right, Rear-Left.
    """
    hl = length / 2.0
    hw = width / 2.0
    local_corners = np.array([
        [hl, hw],
        [hl, -hw],
        [-hl, -hw],
        [-hl, hw]
    ], dtype=np.float64)
    return transform_points(local_corners, x, y, theta)


def project_polygon(axis: np.ndarray, vertices: np.ndarray) -> Tuple[float, float]:
    """Projects polygon vertices onto a unit axis and returns [min_proj, max_proj]."""
    projections = vertices @ axis
    return float(np.min(projections)), float(np.max(projections))


def check_sat_collision(poly_a: np.ndarray, poly_b: np.ndarray) -> bool:
    """
    Determines whether two convex 2D polygons collide using the Separating Axis Theorem (SAT).

    Args:
        poly_a: Array of shape (N, 2) defining vertices of polygon A.
        poly_b: Array of shape (M, 2) defining vertices of polygon B.

    Returns:
        True if the polygons overlap (collision), False if a separating axis exists.
    """
    for poly in (poly_a, poly_b):
        num_verts = len(poly)
        for i in range(num_verts):
            p1 = poly[i]
            p2 = poly[(i + 1) % num_verts]
            edge = p2 - p1
            # Normal vector perpendicular to edge
            normal = np.array([-edge[1], edge[0]], dtype=np.float64)
            norm = np.linalg.norm(normal)
            if norm < 1e-9:
                continue
            axis = normal / norm

            min_a, max_a = project_polygon(axis, poly_a)
            min_b, max_b = project_polygon(axis, poly_b)

            # Check for separating gap
            if max_a < min_b or max_b < min_a:
                return False

    return True


def point_to_segment_distance(px: float, py: float, x1: float, y1: float, x2: float, y2: float) -> float:
    """Computes Euclidean distance from a point (px, py) to a line segment (x1, y1)-(x2, y2)."""
    dx = x2 - x1
    dy = y2 - y1
    l2 = dx * dx + dy * dy
    if l2 == 0.0:
        return math.hypot(px - x1, py - y1)
    
    t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / l2))
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    return math.hypot(px - proj_x, py - proj_y)


def ray_intersect_segment(
    ray_origin: np.ndarray,
    ray_dir: np.ndarray,
    p1: np.ndarray,
    p2: np.ndarray
) -> Optional[float]:
    """
    Computes ray intersection distance with a 2D line segment p1-p2.

    Returns:
        Distance t along the ray (where t >= 0), or None if no intersection.
    """
    v1 = ray_origin - p1
    v2 = p2 - p1
    v3 = np.array([-ray_dir[1], ray_dir[0]], dtype=np.float64)

    dot = np.dot(v2, v3)
    if abs(dot) < 1e-9:
        return None

    t1 = (v2[0] * v1[1] - v2[1] * v1[0]) / dot
    t2 = np.dot(v1, v3) / dot

    if t1 >= 0.0 and 0.0 <= t2 <= 1.0:
        return float(t1)
    return None


def raycast_polygon(
    ray_origin: np.ndarray,
    ray_direction: np.ndarray,
    polygon_vertices: np.ndarray,
    max_range: float = 80.0
) -> Optional[float]:
    """
    Casts a 2D ray against a polygon and returns the minimum intersection distance.
    """
    num_verts = len(polygon_vertices)
    min_dist: Optional[float] = None

    for i in range(num_verts):
        p1 = polygon_vertices[i]
        p2 = polygon_vertices[(i + 1) % num_verts]
        dist = ray_intersect_segment(ray_origin, ray_direction, p1, p2)
        if dist is not None and 0.0 <= dist <= max_range:
            if min_dist is None or dist < min_dist:
                min_dist = dist

    return min_dist


def calculate_curvature(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """
    Computes curvature kappa along a discrete 2D curve (x, y).

    kappa = (x' * y'' - y' * x'') / (x'^2 + y'^2)^(3/2)
    """
    dx = np.gradient(x)
    dy = np.gradient(y)
    ddx = np.gradient(dx)
    ddy = np.gradient(dy)

    denom = np.power(dx * dx + dy * dy, 1.5)
    denom = np.where(denom < 1e-6, 1e-6, denom)
    kappa = (dx * ddy - dy * ddx) / denom
    return kappa
