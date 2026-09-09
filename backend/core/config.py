"""
NAVRASA System Configuration & Hyperparameter Manager.

Loads and validates system-wide configurations for tracking, intent graph,
future composer, risk fields, planners (A*, D* Lite, Hybrid A*),
and safety controllers (MPC + CBF).
"""

from __future__ import annotations
import os
from typing import Dict, Any, Optional
import yaml
from pydantic import BaseModel, Field


class VehicleConfig(BaseModel):
    wheelbase: float = 2.8         # meters (typical sedan / SUV)
    length: float = 4.8            # meters
    width: float = 2.0             # meters
    height: float = 1.5            # meters
    max_steer_rad: float = 0.65    # ~37.2 degrees
    max_accel: float = 3.0         # m/s^2
    max_decel: float = -6.0        # m/s^2 emergency braking limit
    max_steer_rate: float = 0.8    # rad/s
    max_speed: float = 15.0        # m/s (~54 km/h for urban Indian roads)


class TrackingConfig(BaseModel):
    filter_type: str = "UKF"       # "KF" or "UKF"
    max_age_misses: int = 5        # Frames before deleting a coasting track
    min_hits_confirm: int = 3      # Frames to confirm tentative track
    gating_threshold_chi2: float = 9.21  # 99% confidence for 2 DoF (position)
    process_noise_pos: float = 0.5
    process_noise_vel: float = 1.0
    process_noise_yaw: float = 0.1
    measurement_noise_lidar: float = 0.15
    measurement_noise_radar: float = 0.4


class GraphConfig(BaseModel):
    spatial_proximity_radius: float = 25.0   # meters
    critical_ttc_threshold: float = 4.0      # seconds
    lateral_encroachment_dist: float = 2.5   # meters
    gnn_hidden_dim: int = 64
    gnn_num_heads: int = 4


class PredictionConfig(BaseModel):
    horizon_seconds: float = 3.0
    dt: float = 0.1
    top_k_hypotheses: int = 3
    uncertainty_growth_rate: float = 0.15


class RiskFieldConfig(BaseModel):
    grid_resolution: float = 0.5     # meters per cell
    map_width_m: float = 60.0        # meters
    map_height_m: float = 60.0       # meters
    w_ttc: float = 0.35
    w_kinetic: float = 0.25
    w_uncertainty: float = 0.20
    w_occlusion: float = 0.20
    risk_decay_rate: float = 0.4


class PlanningConfig(BaseModel):
    primary_planner: str = "HYBRID_A_STAR"   # "HYBRID_A_STAR", "D_STAR_LITE", "A_STAR"
    xy_resolution: float = 0.5               # meters
    yaw_resolution_rad: float = 0.2618       # 15 degrees
    step_size: float = 1.0                   # meters
    reeds_shepp_step: float = 0.25           # meters
    max_curvature: float = 0.25              # 1/m
    cost_reverse: float = 2.5
    cost_steer_change: float = 1.5
    cost_risk_multiplier: float = 5.0
    time_limit_ms: float = 150.0


class ControlConfig(BaseModel):
    mpc_horizon: int = 15
    mpc_dt: float = 0.1
    weight_pos_x: float = 10.0
    weight_pos_y: float = 10.0
    weight_yaw: float = 5.0
    weight_v: float = 2.0
    weight_steer: float = 1.0
    weight_accel: float = 0.5
    weight_steer_rate: float = 10.0
    weight_jerk: float = 5.0
    cbf_gamma: float = 0.8                   # Barrier decay class-K parameter
    cbf_safety_margin_m: float = 1.2         # Buffer around vehicle footprint
    cbf_slack_weight: float = 1000.0


class NavrasaConfig(BaseModel):
    vehicle: VehicleConfig = Field(default_factory=VehicleConfig)
    tracking: TrackingConfig = Field(default_factory=TrackingConfig)
    graph: GraphConfig = Field(default_factory=GraphConfig)
    prediction: PredictionConfig = Field(default_factory=PredictionConfig)
    risk_field: RiskFieldConfig = Field(default_factory=RiskFieldConfig)
    planning: PlanningConfig = Field(default_factory=PlanningConfig)
    control: ControlConfig = Field(default_factory=ControlConfig)
    target_fps: float = 20.0
    enable_ws_stream: bool = True
    server_host: str = "0.0.0.0"
    server_port: int = 8000


def load_config(config_path: Optional[str] = None) -> NavrasaConfig:
    """Loads configuration from YAML file or returns default."""
    if config_path and os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            if data:
                return NavrasaConfig(**data)
    return NavrasaConfig()
