"""
NAVRASA Sensor Models and Coordinate Frames.

Provides forward and inverse measurement functions for:
- LiDAR: Cartesian range/bearing measurements [x, y, z]
- Radar: Polar range, azimuth angle, and Doppler radial velocity [rho, phi, rho_dot]
- Camera: 2D bounding boxes with pinhole projection and depth uncertainty.
"""

from __future__ import annotations
import math
from typing import Tuple
import numpy as np
from backend.core.math_utils import wrap_to_pi


def polar_to_cartesian(rho: float, phi: float, rho_dot: float) -> Tuple[float, float, float, float]:
    """
    Converts Radar polar measurements (range, azimuth, Doppler rate) to Cartesian 2D (x, y, vx, vy).
    """
    x = rho * math.cos(phi)
    y = rho * math.sin(phi)
    vx = rho_dot * math.cos(phi)
    vy = rho_dot * math.sin(phi)
    return x, y, vx, vy


def cartesian_to_polar(x: float, y: float, vx: float, vy: float) -> Tuple[float, float, float]:
    """
    Converts Cartesian state (x, y, vx, vy) to Radar measurement space (rho, phi, rho_dot).
    """
    rho = math.hypot(x, y)
    if rho < 1e-4:
        return 0.0, 0.0, 0.0
    phi = math.atan2(y, x)
    rho_dot = (x * vx + y * vy) / rho
    return rho, wrap_to_pi(phi), rho_dot


def transform_sensor_to_ego(
    sensor_x: float,
    sensor_y: float,
    sensor_offset_x: float,
    sensor_offset_y: float,
    sensor_yaw: float
) -> Tuple[float, float]:
    """Transforms sensor-frame 2D coordinates to ego-body frame."""
    c = math.cos(sensor_yaw)
    s = math.sin(sensor_yaw)
    ego_x = sensor_x * c - sensor_y * s + sensor_offset_x
    ego_y = sensor_x * s + sensor_y * c + sensor_offset_y
    return ego_x, ego_y
