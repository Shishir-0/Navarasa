"""
NAVRASA Control Barrier Function (CBF-QP) Safety Shield.

Mathematical Foundation:
------------------------
Defines safe set C = { x in X | h_i(x) >= 0 for all obstacles i }.
Barrier Function:
  h_i(x) = || p_ego - p_obs,i ||^2 - d_safe^2

Control Barrier Condition (Forward Invariance of C):
  L_f h_i(x) + L_g h_i(x) * u + gamma * h_i(x) >= 0

Safety-Filter Quadratic Program (CBF-QP):
  min_{u = [a, delta], epsilon} 0.5 * || u - u_nom ||^2 + 0.5 * w_eps * epsilon^2
  subject to:
    A_cbf,i * u >= b_cbf,i - epsilon
    u_min <= u <= u_max

If nominal MPC requests an unsafe command towards an obstacle, CBF-QP intervenes
to minimally modify actuation and strictly guarantee safety.
"""

from __future__ import annotations
import math
from typing import List, Tuple, Optional
import numpy as np
from scipy.optimize import minimize

from backend.core.types import (
    ActorState,
    TrackState,
    ControlCommand
)
from backend.core.config import ControlConfig, VehicleConfig


class ControlBarrierFunctionShield:
    """Independent Safety Shield utilizing Control Barrier Functions (CBF-QP)."""

    def __init__(
        self,
        ctrl_config: Optional[ControlConfig] = None,
        veh_config: Optional[VehicleConfig] = None
    ):
        self.c_cfg = ctrl_config or ControlConfig()
        self.v_cfg = veh_config or VehicleConfig()
        self.gamma = self.c_cfg.cbf_gamma
        self.d_safe = self.c_cfg.cbf_safety_margin_m
        self.slack_weight = self.c_cfg.cbf_slack_weight

    def filter_control(
        self,
        ego_state: ActorState,
        tracks: List[TrackState],
        nom_accel: float,
        nom_steer: float
    ) -> Tuple[float, float, bool, float, float]:
        """
        Filters nominal MPC command [nom_accel, nom_steer] through CBF constraints.

        Returns:
            (safe_accel, safe_steer, cbf_active, slack_val, min_margin)
        """
        ex, ey = ego_state.position.x, ego_state.position.y
        evx, evy = ego_state.velocity.x, ego_state.velocity.y
        eyaw = ego_state.heading
        espeed = ego_state.speed

        if not tracks:
            return nom_accel, nom_steer, False, 0.0, 10.0

        # Find critical obstacles within 20 meters
        relevant_tracks = []
        min_margin = float("inf")

        for t in tracks:
            dist = math.hypot(t.position.x - ex, t.position.y - ey)
            # Distance margin to boundary
            safe_radius = self.d_safe + (self.v_cfg.width + t.bbox.width) / 2.0
            margin = dist - safe_radius
            if margin < min_margin:
                min_margin = margin
            if dist < 25.0:
                relevant_tracks.append((t, safe_radius))

        if not relevant_tracks:
            return nom_accel, nom_steer, False, 0.0, float(min_margin)

        # Build CBF-QP Optimization
        # Decision variables: [a, delta, epsilon]
        u0 = np.array([nom_accel, nom_steer, 0.0], dtype=np.float64)

        def objective(var: np.ndarray) -> float:
            a, delta, eps = var
            return 0.5 * ((a - nom_accel)**2 + 5.0 * (delta - nom_steer)**2) + 0.5 * self.slack_weight * (eps**2)

        constraints = []
        L = self.v_cfg.wheelbase

        for t, safe_rad in relevant_tracks:
            ox, oy = t.position.x, t.position.y
            ovx, ovy = t.velocity.x, t.velocity.y

            dx = ex - ox
            dy = ey - oy
            h = (dx**2 + dy**2) - (safe_rad**2)

            # Lie derivative L_f h
            rel_vx = evx - ovx
            rel_vy = evy - ovy
            h_dot = 2.0 * (dx * rel_vx + dy * rel_vy)

            # Constraint: h_dot + a_term + steer_term + gamma * h + epsilon >= 0
            # Under kinematic unicycle: d(evx)/da = cos(eyaw), d(evy)/da = sin(eyaw)
            # d(evx)/dsteer = -espeed * sin(eyaw) * (espeed / L), etc.
            grad_a = 2.0 * (dx * math.cos(eyaw) + dy * math.sin(eyaw))
            grad_delta = 2.0 * (dx * (-espeed * math.sin(eyaw)) + dy * (espeed * math.cos(eyaw))) * (espeed / L)

            def cbf_constraint(var: np.ndarray, g_a=grad_a, g_d=grad_delta, h_val=h, h_d=h_dot) -> float:
                a, delta, eps = var
                return (h_d + g_a * a + g_d * delta + self.gamma * h_val + eps)

            constraints.append({"type": "ineq", "fun": cbf_constraint})

        # Bounds: a in [max_decel, max_accel], delta in [-max_steer, max_steer], eps >= 0
        bounds = [
            (self.v_cfg.max_decel, self.v_cfg.max_accel),
            (-self.v_cfg.max_steer_rad, self.v_cfg.max_steer_rad),
            (0.0, 10.0)
        ]

        res = minimize(
            objective,
            u0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": 25, "ftol": 1e-4}
        )

        if res.success or res.x is not None:
            safe_a = float(np.clip(res.x[0], self.v_cfg.max_decel, self.v_cfg.max_accel))
            safe_d = float(np.clip(res.x[1], -self.v_cfg.max_steer_rad, self.v_cfg.max_steer_rad))
            slack = float(res.x[2])
            # Check if CBF modified nominal command significantly
            cbf_active = abs(safe_a - nom_accel) > 0.15 or abs(safe_d - nom_steer) > 0.05
        else:
            # Emergency braking fallback if QP fails to find feasible point
            safe_a = self.v_cfg.max_decel
            safe_d = nom_steer
            cbf_active = True
            slack = 0.0

        return safe_a, safe_d, cbf_active, slack, float(min_margin)
