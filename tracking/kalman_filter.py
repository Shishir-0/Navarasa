"""
NAVRASA 4D Linear Kalman Filter (Constant Velocity Model).

Mathematical Foundation:
------------------------
State: x = [x, y, vx, vy]^T in R^4
Prediction:
  x_{k|k-1} = F * x_{k-1|k-1}
  P_{k|k-1} = F * P_{k-1|k-1} * F^T + Q
Update:
  y = z - H * x_{k|k-1}
  S = H * P_{k|k-1} * H^T + R
  K = P_{k|k-1} * H^T * S^{-1}
  x_{k|k} = x_{k|k-1} + K * y
  P_{k|k} = (I - K * H) * P_{k|k-1} * (I - K * H)^T + K * R * K^T   (Joseph Form)

Complexity:
  Time: O(d^3) where d = state dim (4) -> O(1) constant time ~ 5 microseconds
  Space: O(d^2) -> O(1)
"""

from __future__ import annotations
import numpy as np
from typing import Tuple, Optional


class LinearKalmanFilter:
    """4D Linear Kalman Filter for 2D position and velocity estimation."""

    def __init__(
        self,
        init_x: float,
        init_y: float,
        init_vx: float = 0.0,
        init_vy: float = 0.0,
        pos_noise_std: float = 0.5,
        vel_noise_std: float = 2.0,
        accel_noise_std: float = 1.0
    ):
        # State vector: [x, y, vx, vy]
        self.x = np.array([init_x, init_y, init_vx, init_vy], dtype=np.float64)

        # Initial state covariance matrix P
        self.P = np.diag([
            pos_noise_std ** 2,
            pos_noise_std ** 2,
            vel_noise_std ** 2,
            vel_noise_std ** 2
        ]).astype(np.float64)

        self.accel_noise_std = accel_noise_std
        self.dim = 4

    def predict(self, dt: float):
        """Advances state and covariance by time step dt."""
        if dt <= 0.0:
            return

        # State transition matrix F
        F = np.array([
            [1.0, 0.0, dt,  0.0],
            [0.0, 1.0, 0.0, dt ],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0]
        ], dtype=np.float64)

        # Continuous white noise acceleration process covariance Q
        dt2 = dt * dt
        dt3 = dt2 * dt
        dt4 = dt3 * dt
        q_var = self.accel_noise_std ** 2

        Q = q_var * np.array([
            [dt4 / 4.0, 0.0,       dt3 / 2.0, 0.0      ],
            [0.0,       dt4 / 4.0, 0.0,       dt3 / 2.0],
            [dt3 / 2.0, 0.0,       dt2,       0.0      ],
            [0.0,       dt3 / 2.0, 0.0,       dt2      ]
        ], dtype=np.float64)

        self.x = F @ self.x
        self.P = F @ self.P @ F.T + Q

    def update_position(self, z_x: float, z_y: float, R_matrix: Optional[np.ndarray] = None) -> float:
        """
        Updates state using a 2D position observation z = [z_x, z_y].

        Returns:
            Normalized innovation squared (Mahalanobis distance squared d_M^2).
        """
        z = np.array([z_x, z_y], dtype=np.float64)
        H = np.array([
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0]
        ], dtype=np.float64)

        if R_matrix is None:
            R = np.diag([0.25, 0.25]).astype(np.float64)
        else:
            R = np.array(R_matrix, dtype=np.float64)

        # Innovation
        y = z - H @ self.x
        S = H @ self.P @ H.T + R
        S_inv = np.linalg.inv(S)

        # Mahalanobis distance squared
        d_m2 = float(y.T @ S_inv @ y)

        # Kalman gain
        K = self.P @ H.T @ S_inv

        # State update
        self.x = self.x + K @ y

        # Joseph form covariance update for numerical stability
        I = np.eye(self.dim, dtype=np.float64)
        I_KH = I - K @ H
        self.P = I_KH @ self.P @ I_KH.T + K @ R @ K.T

        return d_m2

    @property
    def position(self) -> Tuple[float, float]:
        return float(self.x[0]), float(self.x[1])

    @property
    def velocity(self) -> Tuple[float, float]:
        return float(self.x[2]), float(self.x[3])

    @property
    def speed(self) -> float:
        return float(np.hypot(self.x[2], self.x[3]))

    @property
    def heading(self) -> float:
        return float(np.arctan2(self.x[3], self.x[2]))
