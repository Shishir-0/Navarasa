"""
NAVRASA Future Road Composer (FRC) - Multi-Modal Probabilistic Trajectory Predictor.

Mathematical Foundation:
------------------------
For each dynamic actor a in {1..N}:
  Generates Top-K trajectory hypotheses {tau_1, tau_2, ... tau_K} over horizon H = 3.0s (dt = 0.1s).
  Assigns probability p_k in [0, 1] where sum_{k=1}^K p_k = 1.0.
  Computes spatial covariance Sigma_k(t) = Sigma_0 + gamma * t * I.
"""

from __future__ import annotations
import math
from typing import Dict, List, Optional
import numpy as np

from backend.core.types import (
    ActorType,
    TrackState,
    TrajectoryPoint,
    TrajectoryHypothesis,
    ActorPrediction,
    PredictionState,
    RoadIntentGraphState
)
from backend.core.config import PredictionConfig
from backend.core.math_utils import wrap_to_pi
from prediction.intent_modes import ManeuverMode


class FutureRoadComposer:
    """Probabilistic multi-hypothesis trajectory generation engine."""

    def __init__(self, config: Optional[PredictionConfig] = None):
        self.config = config or PredictionConfig()

    def predict_actor_futures(
        self,
        track: TrackState,
        graph_state: Optional[RoadIntentGraphState] = None
    ) -> ActorPrediction:
        """
        Generates K diverse future trajectory hypotheses for a single tracked actor.
        """
        horizon = self.config.horizon_seconds
        dt = self.config.dt
        steps = int(horizon / dt)

        px, py = track.position.x, track.position.y
        vx, vy = track.velocity.x, track.velocity.y
        speed = max(0.1, track.speed)
        heading = track.heading
        yaw_rate = track.yaw_rate

        hypotheses: List[TrajectoryHypothesis] = []

        # 1. Hypothesis A: Nominal Extrapolation (Cruise Straight / Curve)
        pts_straight: List[TrajectoryPoint] = []
        cx, cy, ch, cs = px, py, heading, speed
        for s in range(steps):
            t = (s + 1) * dt
            ch = wrap_to_pi(ch + yaw_rate * dt)
            cx += cs * math.cos(ch) * dt
            cy += cs * math.sin(ch) * dt
            std = 0.15 + self.config.uncertainty_growth_rate * t
            pts_straight.append(TrajectoryPoint(
                x=float(cx), y=float(cy), v=float(cs), yaw=float(ch), time=float(t),
                std_x=float(std), std_y=float(std)
            ))

        # 2. Hypothesis B: Aggressive Cut-in / Left Swerve (Indian autorickshaw / bike behavior)
        pts_swerve_left: List[TrajectoryPoint] = []
        cx_l, cy_l, ch_l, cs_l = px, py, heading, speed
        left_yaw_rate = 0.35  # Swerving left
        for s in range(steps):
            t = (s + 1) * dt
            if s < steps // 2:
                ch_l = wrap_to_pi(ch_l + left_yaw_rate * dt)
            else:
                ch_l = wrap_to_pi(ch_l - left_yaw_rate * dt * 0.5)
            cx_l += cs_l * math.cos(ch_l) * dt
            cy_l += cs_l * math.sin(ch_l) * dt
            std = 0.20 + (self.config.uncertainty_growth_rate * 1.5) * t
            pts_swerve_left.append(TrajectoryPoint(
                x=float(cx_l), y=float(cy_l), v=float(cs_l), yaw=float(ch_l), time=float(t),
                std_x=float(std), std_y=float(std)
            ))

        # 3. Hypothesis C: Deceleration / Yielding
        pts_yield: List[TrajectoryPoint] = []
        cx_y, cy_y, ch_y, cs_y = px, py, heading, speed
        decel = 2.0  # m/s^2 braking
        for s in range(steps):
            t = (s + 1) * dt
            cs_y = max(0.0, cs_y - decel * dt)
            cx_y += cs_y * math.cos(ch_y) * dt
            cy_y += cs_y * math.sin(ch_y) * dt
            std = 0.12 + (self.config.uncertainty_growth_rate * 0.8) * t
            pts_yield.append(TrajectoryPoint(
                x=float(cx_y), y=float(cy_y), v=float(cs_y), yaw=float(ch_y), time=float(t),
                std_x=float(std), std_y=float(std)
            ))

        # Determine mode probabilities based on actor classification
        if track.actor_type in (ActorType.AUTORICKSHAW, ActorType.TWO_WHEELER):
            prob_straight = 0.50
            prob_swerve = 0.35
            prob_yield = 0.15
        elif track.actor_type == ActorType.PEDESTRIAN:
            prob_straight = 0.30
            prob_swerve = 0.40
            prob_yield = 0.30
        elif track.actor_type == ActorType.CATTLE:
            # Cattle tend to be stationary or slow meandering
            prob_straight = 0.20
            prob_swerve = 0.20
            prob_yield = 0.60
        else:
            prob_straight = 0.70
            prob_swerve = 0.15
            prob_yield = 0.15

        hypotheses.append(TrajectoryHypothesis(
            hypothesis_id=f"{track.track_id}_nom",
            maneuver_name=ManeuverMode.CRUISE_STRAIGHT.value,
            probability=prob_straight,
            waypoints=pts_straight
        ))

        hypotheses.append(TrajectoryHypothesis(
            hypothesis_id=f"{track.track_id}_swerve",
            maneuver_name=ManeuverMode.AGGRESSIVE_CUT_IN.value,
            probability=prob_swerve,
            waypoints=pts_swerve_left
        ))

        hypotheses.append(TrajectoryHypothesis(
            hypothesis_id=f"{track.track_id}_yield",
            maneuver_name=ManeuverMode.YIELD_DECELERATE.value,
            probability=prob_yield,
            waypoints=pts_yield
        ))

        most_likely = hypotheses[0].hypothesis_id

        return ActorPrediction(
            actor_id=track.track_id,
            actor_type=track.actor_type,
            hypotheses=hypotheses,
            most_likely_hypothesis=most_likely,
            epistemic_uncertainty=0.15
        )

    def generate_scene_predictions(
        self,
        tracks: List[TrackState],
        graph_state: Optional[RoadIntentGraphState] = None,
        timestamp: float = 0.0
    ) -> PredictionState:
        """Generates future predictions for all active tracked participants."""
        preds: Dict[str, ActorPrediction] = {}
        for t in tracks:
            preds[t.track_id] = self.predict_actor_futures(t, graph_state)

        return PredictionState(
            timestamp=timestamp,
            horizon_seconds=self.config.horizon_seconds,
            dt=self.config.dt,
            predictions=preds
        )
