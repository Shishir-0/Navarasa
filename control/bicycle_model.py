"""
NAVRASA Vehicle Kinematic & Dynamic Bicycle Models.

Mathematical Foundation:
------------------------
Non-linear Kinematic Bicycle Equations:
  x_{k+1}   = x_k + v_k * cos(psi_k) * dt
  y_{k+1}   = y_k + v_k * sin(psi_k) * dt
  psi_{k+1} = psi_k + (v_k / L) * tan(delta_k) * dt
  v_{k+1}   = v_k + a_k * dt

Linearized Error Dynamics around Reference Trajectory (x_r, u_r):
  A_k = df/dx, B_k = df/du
"""

from __future__ import annotations
import math
from typing import Tuple
import numpy as np
from backend.core.math_utils import wrap_to_pi


class KinematicBicycleModel:
    """Non-linear Kinematic Bicycle model for MPC prediction and state propagation."""

    def __init__(self, wheelbase: float = 2.8):
        self.L = wheelbase

    def step(
        self,
        x: float,
        y: float,
        psi: float,
        v: float,
        accel: float,
        steer: float,
        dt: float
    ) -> Tuple[float, float, float, float]:
        """
        Advances the non-linear continuous bicycle model by dt.
        """
        nx = x + v * math.cos(psi) * dt
        ny = y + v * math.sin(psi) * dt
        npsi = wrap_to_pi(psi + (v / self.L) * math.tan(steer) * dt)
        nv = max(0.0, v + accel * dt)
        return nx, ny, npsi, nv

    def linearize(
        self,
        x_r: float,
        y_r: float,
        psi_r: float,
        v_r: float,
        steer_r: float,
        dt: float
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Computes linearized state-space matrices A in R^{4x4} and B in R^{4x2}.
        """
        A = np.eye(4, dtype=np.float64)
        A[0, 2] = -v_r * math.sin(psi_r) * dt
        A[0, 3] = math.cos(psi_r) * dt
        A[1, 2] = v_r * math.cos(psi_r) * dt
        A[1, 3] = math.sin(psi_r) * dt
        A[2, 3] = (math.tan(steer_r) / self.L) * dt

        B = np.zeros((4, 2), dtype=np.float64)
        B[3, 0] = dt  # df4 / da
        cos_steer = math.cos(steer_r)
        cos_steer_sq = max(1e-4, cos_steer * cos_steer)
        B[2, 1] = (v_r * dt) / (self.L * cos_steer_sq)  # df3 / ddelta

        return A, B
