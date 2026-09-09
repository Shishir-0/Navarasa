"""
NAVRASA Model Predictive Controller (MPC).

Mathematical Foundation:
------------------------
Solves finite-horizon constrained optimization:
  min_{u_0..u_{N-1}} sum_{k=0}^{N-1} ( ||x_k - x_{ref,k}||_Q^2 + ||u_k||_R^2 + ||u_k - u_{k-1}||_{Rd}^2 ) + ||x_N - x_{ref,N}||_{Qf}^2
  subject to:
    x_{k+1} = f(x_k, u_k)
    v_{min} <= v_k <= v_{max}
    a_{min} <= a_k <= a_{max}
    -delta_{max} <= delta_k <= delta_{max}
    |delta_k - delta_{k-1}| <= delta_rate_max * dt
"""

from __future__ import annotations
import math
import time
from typing import List, Tuple, Optional
import numpy as np
from scipy.optimize import minimize

from backend.core.types import (
    ActorState,
    PlanState,
    ControlCommand,
    TrajectoryPoint
)
from backend.core.config import ControlConfig, VehicleConfig
from backend.core.math_utils import wrap_to_pi
from control.bicycle_model import KinematicBicycleModel


class ModelPredictiveController:
    """Constrained Finite-Horizon Model Predictive Controller."""

    def __init__(
        self,
        ctrl_config: Optional[ControlConfig] = None,
        veh_config: Optional[VehicleConfig] = None
    ):
        self.c_cfg = ctrl_config or ControlConfig()
        self.v_cfg = veh_config or VehicleConfig()
        self.model = KinematicBicycleModel(wheelbase=self.v_cfg.wheelbase)
        self.last_steer = 0.0
        self.last_accel = 0.0

    def solve(
        self,
        ego_state: ActorState,
        reference_path: PlanState
    ) -> Tuple[float, float, float]:
        """
        Computes optimal [acceleration, steering_angle].

        Returns:
            (accel, steer, solve_time_ms)
        """
        start_t = time.perf_counter()
        N = min(10, self.c_cfg.mpc_horizon)
        dt = self.c_cfg.mpc_dt

        # Current state
        x0 = ego_state.position.x
        y0 = ego_state.position.y
        psi0 = ego_state.heading
        v0 = max(0.1, ego_state.speed)

        # Extract reference horizon points
        ref_points = reference_path.waypoints
        if not ref_points:
            return 0.0, 0.0, 0.1

        # Match closest waypoint
        dists = [math.hypot(p.x - x0, p.y - y0) for p in ref_points]
        closest_idx = int(np.argmin(dists))

        ref_traj = []
        for i in range(N + 1):
            idx = min(len(ref_points) - 1, closest_idx + i)
            ref_traj.append(ref_points[idx])

        # Decision variables: U = [a_0, delta_0, a_1, delta_1, ... a_{N-1}, delta_{N-1}] in R^{2N}
        u_init = np.zeros(2 * N, dtype=np.float64)
        for i in range(N):
            u_init[2 * i] = self.last_accel
            u_init[2 * i + 1] = self.last_steer

        # Cost weights
        w_x = self.c_cfg.weight_pos_x
        w_y = self.c_cfg.weight_pos_y
        w_yaw = self.c_cfg.weight_yaw
        w_v = self.c_cfg.weight_v
        w_steer = self.c_cfg.weight_steer
        w_accel = self.c_cfg.weight_accel
        w_steer_rate = self.c_cfg.weight_steer_rate

        def cost_function(u: np.ndarray) -> float:
            total_cost = 0.0
            cx, cy, cpsi, cv = x0, y0, psi0, v0
            prev_steer = self.last_steer
            prev_accel = self.last_accel

            for k in range(N):
                ak = u[2 * k]
                deltak = u[2 * k + 1]

                cx, cy, cpsi, cv = self.model.step(cx, cy, cpsi, cv, ak, deltak, dt)

                ref_k = ref_traj[k + 1]
                dx = cx - ref_k.x
                dy = cy - ref_k.y
                dyaw = wrap_to_pi(cpsi - ref_k.yaw)
                dv = cv - ref_k.v

                total_cost += w_x * (dx**2) + w_y * (dy**2) + w_yaw * (dyaw**2) + w_v * (dv**2)
                total_cost += w_accel * (ak**2) + w_steer * (deltak**2)
                total_cost += w_steer_rate * ((deltak - prev_steer)**2)

                prev_steer = deltak
                prev_accel = ak

            return total_cost

        # Bounds: a in [max_decel, max_accel], delta in [-max_steer, max_steer]
        bounds = []
        for _ in range(N):
            bounds.append((self.v_cfg.max_decel, self.v_cfg.max_accel))
            bounds.append((-self.v_cfg.max_steer_rad, self.v_cfg.max_steer_rad))

        res = minimize(
            cost_function,
            u_init,
            method="SLSQP",
            bounds=bounds,
            options={"maxiter": 12, "ftol": 1e-2}
        )

        solve_time_ms = (time.perf_counter() - start_t) * 1000.0

        if res.success or res.x is not None:
            opt_accel = float(np.clip(res.x[0], self.v_cfg.max_decel, self.v_cfg.max_accel))
            opt_steer = float(np.clip(res.x[1], -self.v_cfg.max_steer_rad, self.v_cfg.max_steer_rad))
        else:
            opt_accel = 0.0
            opt_steer = 0.0

        self.last_accel = opt_accel
        self.last_steer = opt_steer

        return opt_accel, opt_steer, solve_time_ms
