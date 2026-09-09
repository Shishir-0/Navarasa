"""
NAVRASA 5D Unscented Kalman Filter (Constant Turn Rate and Velocity - CTRV Model).

Mathematical Foundation:
------------------------
State vector: x = [x, y, v, psi, psi_dot]^T in R^5
Non-linear Kinematic CTRV model:
  If |psi_dot| > 1e-4:
    x_{k+1}   = x + (v/psi_dot) * (sin(psi + psi_dot*dt) - sin(psi))
    y_{k+1}   = y + (v/psi_dot) * (-cos(psi + psi_dot*dt) + cos(psi))
    v_{k+1}   = v
    psi_{k+1} = psi + psi_dot*dt
    psi_dot_{k+1} = psi_dot
  Else:
    x_{k+1}   = x + v * cos(psi) * dt
    y_{k+1}   = y + v * sin(psi) * dt
    v_{k+1}   = v
    psi_{k+1} = psi
    psi_dot_{k+1} = 0.0

Sigma Point Generation (Merwe Scaled Unscented Transform):
  n = 5, alpha = 1e-3, beta = 2.0, kappa = 0.0
  lambda = alpha^2 * (n + kappa) - n
  chi_0 = x
  chi_i = x + [sqrt((n + lambda) * P)]_i        for i = 1..n
  chi_{i+n} = x - [sqrt((n + lambda) * P)]_i    for i = 1..n

Complexity:
  Time: O(n^3) matrix square root (Cholesky) where n=5 -> ~15 microseconds
  Space: O(n^2) -> O(1)
"""

from __future__ import annotations
import math
from typing import Tuple, Optional, List
import numpy as np
from backend.core.math_utils import wrap_to_pi


class UnscentedKalmanFilter:
    """5D CTRV Unscented Kalman Filter for non-linear state estimation."""

    def __init__(
        self,
        init_x: float,
        init_y: float,
        init_v: float = 0.0,
        init_yaw: float = 0.0,
        init_yaw_rate: float = 0.0,
        alpha: float = 1e-3,
        beta: float = 2.0,
        kappa: float = 0.0,
        std_accel: float = 1.5,
        std_yaw_accel: float = 0.5
    ):
        self.dim_x = 5
        self.x = np.array([init_x, init_y, init_v, wrap_to_pi(init_yaw), init_yaw_rate], dtype=np.float64)

        # Initial covariance P
        self.P = np.diag([0.5, 0.5, 2.0, 0.2, 0.1]).astype(np.float64)

        # Noise parameters
        self.std_accel = std_accel
        self.std_yaw_accel = std_yaw_accel

        # UKF Tuning parameters
        self.alpha = alpha
        self.beta = beta
        self.kappa = kappa
        self.lam = (alpha ** 2) * (self.dim_x + kappa) - self.dim_x

        # Compute weights
        self.num_sigmas = 2 * self.dim_x + 1
        self.wm = np.zeros(self.num_sigmas, dtype=np.float64)
        self.wc = np.zeros(self.num_sigmas, dtype=np.float64)

        c = self.dim_x + self.lam
        self.wm[0] = self.lam / c
        self.wc[0] = self.lam / c + (1.0 - alpha ** 2 + beta)
        for i in range(1, self.num_sigmas):
            self.wm[i] = 1.0 / (2.0 * c)
            self.wc[i] = 1.0 / (2.0 * c)

        self.sigmas_x = np.zeros((self.num_sigmas, self.dim_x), dtype=np.float64)

    def _generate_sigma_points(self) -> np.ndarray:
        """Generates 2n+1 sigma points using Cholesky decomposition."""
        scale = self.dim_x + self.lam
        # Ensure P is symmetric positive definite
        P_sym = 0.5 * (self.P + self.P.T) + 1e-8 * np.eye(self.dim_x)
        try:
            L = np.linalg.cholesky(scale * P_sym)
        except np.linalg.LinAlgError:
            # Fallback eigenvalue regularization if numerical jitter occurs
            eigval, eigvec = np.linalg.eigh(P_sym)
            eigval = np.maximum(eigval, 1e-6)
            P_sym = eigvec @ np.diag(eigval) @ eigvec.T
            L = np.linalg.cholesky(scale * P_sym)

        sigmas = np.zeros((self.num_sigmas, self.dim_x), dtype=np.float64)
        sigmas[0] = self.x
        for i in range(self.dim_x):
            sigmas[i + 1] = self.x + L[:, i]
            sigmas[i + 1 + self.dim_x] = self.x - L[:, i]
            # Wrap yaw in sigma points
            sigmas[i + 1, 3] = wrap_to_pi(sigmas[i + 1, 3])
            sigmas[i + 1 + self.dim_x, 3] = wrap_to_pi(sigmas[i + 1 + self.dim_x, 3])

        return sigmas

    def predict(self, dt: float):
        """Propagates sigma points through non-linear CTRV kinematics and computes mean & covariance."""
        if dt <= 0.0:
            return

        sigmas = self._generate_sigma_points()
        pred_sigmas = np.zeros_like(sigmas)

        for i in range(self.num_sigmas):
            px, py, v, yaw, yaw_d = sigmas[i]

            if abs(yaw_d) > 1e-4:
                px_p = px + (v / yaw_d) * (math.sin(yaw + yaw_d * dt) - math.sin(yaw))
                py_p = py + (v / yaw_d) * (-math.cos(yaw + yaw_d * dt) + math.cos(yaw))
            else:
                px_p = px + v * math.cos(yaw) * dt
                py_p = py + v * math.sin(yaw) * dt

            v_p = v
            yaw_p = wrap_to_pi(yaw + yaw_d * dt)
            yaw_d_p = yaw_d

            # Add continuous process noise influence
            pred_sigmas[i] = [px_p, py_p, v_p, yaw_p, yaw_d_p]

        self.sigmas_x = pred_sigmas

        # Predict State Mean
        x_pred = np.zeros(self.dim_x, dtype=np.float64)
        for i in range(self.num_sigmas):
            x_pred += self.wm[i] * self.sigmas_x[i]

        # Circular mean for yaw
        sin_sum = np.sum(self.wm * np.sin(self.sigmas_x[:, 3]))
        cos_sum = np.sum(self.wm * np.cos(self.sigmas_x[:, 3]))
        x_pred[3] = math.atan2(sin_sum, cos_sum)
        self.x = x_pred

        # Predict State Covariance Matrix
        P_pred = np.zeros((self.dim_x, self.dim_x), dtype=np.float64)
        for i in range(self.num_sigmas):
            diff = self.sigmas_x[i] - self.x
            diff[3] = wrap_to_pi(diff[3])
            P_pred += self.wc[i] * np.outer(diff, diff)

        # Add Process Noise Q (CTRV longitudinal and angular acceleration noise)
        Q = np.diag([
            0.5 * (self.std_accel * dt**2)**2,
            0.5 * (self.std_accel * dt**2)**2,
            (self.std_accel * dt)**2,
            0.5 * (self.std_yaw_accel * dt**2)**2,
            (self.std_yaw_accel * dt)**2
        ]).astype(np.float64)

        self.P = P_pred + Q

    def update_position(self, z_x: float, z_y: float, R_matrix: Optional[np.ndarray] = None) -> float:
        """
        Updates UKF with 2D position observation [z_x, z_y].

        Returns:
            Normalized Mahalanobis distance squared d_M^2.
        """
        dim_z = 2
        z = np.array([z_x, z_y], dtype=np.float64)

        if R_matrix is None:
            R = np.diag([0.15**2, 0.15**2]).astype(np.float64)
        else:
            R = np.array(R_matrix, dtype=np.float64)

        # Transform sigma points into measurement space: h(chi) = [px, py]
        sigmas_z = np.zeros((self.num_sigmas, dim_z), dtype=np.float64)
        for i in range(self.num_sigmas):
            sigmas_z[i, 0] = self.sigmas_x[i, 0]
            sigmas_z[i, 1] = self.sigmas_x[i, 1]

        # Predicted measurement mean
        z_pred = np.zeros(dim_z, dtype=np.float64)
        for i in range(self.num_sigmas):
            z_pred += self.wm[i] * sigmas_z[i]

        # Measurement covariance S and cross-covariance T
        S = np.zeros((dim_z, dim_z), dtype=np.float64)
        T = np.zeros((self.dim_x, dim_z), dtype=np.float64)

        for i in range(self.num_sigmas):
            z_diff = sigmas_z[i] - z_pred
            S += self.wc[i] * np.outer(z_diff, z_diff)

            x_diff = self.sigmas_x[i] - self.x
            x_diff[3] = wrap_to_pi(x_diff[3])
            T += self.wc[i] * np.outer(x_diff, z_diff)

        S += R
        S_inv = np.linalg.inv(S)

        # Innovation and Mahalanobis distance
        y = z - z_pred
        d_m2 = float(y.T @ S_inv @ y)

        # Kalman Gain K
        K = T @ S_inv

        # State & Covariance Update
        self.x = self.x + K @ y
        self.x[3] = wrap_to_pi(self.x[3])
        self.P = self.P - K @ S @ K.T

        return d_m2

    @property
    def position(self) -> Tuple[float, float]:
        return float(self.x[0]), float(self.x[1])

    @property
    def speed(self) -> float:
        return float(self.x[2])

    @property
    def heading(self) -> float:
        return float(self.x[3])

    @property
    def yaw_rate(self) -> float:
        return float(self.x[4])

    @property
    def velocity(self) -> Tuple[float, float]:
        vx = self.x[2] * math.cos(self.x[3])
        vy = self.x[2] * math.sin(self.x[3])
        return float(vx), float(vy)
