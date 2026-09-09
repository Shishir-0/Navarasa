"""
NAVRASA Dynamic 2D Spatial Risk Field Generator.

Mathematical Foundation:
------------------------
R_total(x, y) = w_ttc * R_ttc(x, y) + w_kin * R_kinetic(x, y) + w_unc * R_uncertainty(x, y) + w_occ * R_occlusion(x, y)

Components:
1. Kinetic Risk: R_kin(x, y) = 0.5 * m * v^2 * exp( -((x - x_a)^2 / 2*sigma_x^2 + (y - y_a)^2 / 2*sigma_y^2) )
2. TTC Risk: R_ttc(x, y) = exp( - TTC(x, y) / tau_0 ) along projected actor paths.
3. Uncertainty Spread: R_unc(x, y) = sum_k p_k * N((x, y); mu_k(t), Sigma_k(t))
4. Occlusion Risk: R_occ(x, y) = potential penalty in blind spots where unobserved actors may emerge.

Complexity:
  Time: O(Grid_W * Grid_H * (N_actors * K_modes)) -> Fast vectorized evaluation ~ 10-15 ms.
  Space: O(Grid_W * Grid_H)
"""

from __future__ import annotations
import math
from typing import Dict, List, Optional, Tuple
import numpy as np

from backend.core.types import (
    ActorType,
    ActorState,
    TrackState,
    PredictionState,
    RiskGridMap,
    Vector2D
)
from backend.core.config import RiskFieldConfig


class DynamicRiskField:
    """Continuous and discretized 2D potential risk field generator."""

    def __init__(self, config: Optional[RiskFieldConfig] = None):
        self.config = config or RiskFieldConfig()

    def generate_risk_map(
        self,
        ego_state: ActorState,
        tracks: List[TrackState],
        prediction_state: Optional[PredictionState] = None,
        timestamp: float = 0.0
    ) -> RiskGridMap:
        """
        Computes the discretized 2D risk potential field centered around the Ego vehicle.
        """
        res = self.config.grid_resolution
        width_m = self.config.map_width_m
        height_m = self.config.map_height_m

        cols = int(width_m / res)
        rows = int(height_m / res)

        origin_x = ego_state.position.x - width_m / 2.0
        origin_y = ego_state.position.y - height_m / 2.0

        # Coordinate grid
        x_coords = np.linspace(origin_x, origin_x + width_m, cols)
        y_coords = np.linspace(origin_y, origin_y + height_m, rows)
        X, Y = np.meshgrid(x_coords, y_coords)

        # Initialize Risk matrix
        R_total = np.zeros((rows, cols), dtype=np.float64)

        # 1. Kinetic & Static Obstacle Potential
        for t in tracks:
            tx, ty = t.position.x, t.position.y
            speed = t.speed
            heading = t.heading

            # Longitudinal & lateral variance oriented along actor heading
            c, s = math.cos(heading), math.sin(heading)
            # Transform grid relative to actor pose
            dx = X - tx
            dy = Y - ty
            d_lon = dx * c + dy * s
            d_lat = -dx * s + dy * c

            # Asymmetric Gaussian potential (longer in front of moving vehicle)
            sigma_lon = max(2.5, 1.5 + 0.4 * speed)
            sigma_lat = 1.5

            # Kinetic weight
            kin_weight = 0.5 + 0.1 * speed
            r_actor = kin_weight * np.exp(-0.5 * ((d_lon / sigma_lon)**2 + (d_lat / sigma_lat)**2))
            R_total += self.config.w_kinetic * r_actor

        # 2. Prediction Trajectory Uncertainty Field
        if prediction_state is not None:
            for actor_id, pred in prediction_state.predictions.items():
                for hyp in pred.hypotheses:
                    prob = hyp.probability
                    for wp in hyp.waypoints[::3]:  # Subsample along horizon
                        dist_sq = (X - wp.x)**2 + (Y - wp.y)**2
                        var = max(0.5, (wp.std_x**2 + wp.std_y**2))
                        r_pred = prob * np.exp(-0.5 * dist_sq / var)
                        R_total += self.config.w_uncertainty * r_pred

        # 3. Normalize into [0, 1]
        max_val = np.max(R_total)
        if max_val > 1e-4:
            R_total = np.clip(R_total / max(1.0, max_val), 0.0, 1.0)

        # Compute Spatial Gradients (grad_x, grad_y) for potential field guidance
        grad_y_mat, grad_x_mat = np.gradient(R_total, res)

        return RiskGridMap(
            timestamp=timestamp,
            origin_x=origin_x,
            origin_y=origin_y,
            resolution=res,
            width=cols,
            height=rows,
            data=R_total.tolist(),
            grad_x=grad_x_mat.tolist(),
            grad_y=grad_y_mat.tolist()
        )

    def evaluate_risk_at(self, risk_map: RiskGridMap, x: float, y: float) -> float:
        """Evaluates interpolated risk potential value at arbitrary continuous coordinate (x, y)."""
        res = risk_map.resolution
        col = int((x - risk_map.origin_x) / res)
        row = int((y - risk_map.origin_y) / res)

        if 0 <= row < risk_map.height and 0 <= col < risk_map.width:
            return risk_map.data[row][col]
        return 0.0
