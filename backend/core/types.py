"""
NAVRASA (Neural Adaptive Vehicular Reasoning with Anticipatory Scene Awareness)
Core Domain Types and Pydantic v2 Schemas.

Defines standardized, strongly-typed representations for the entire autonomy pipeline:
Sensors -> Perception -> Tracking -> Road Intent Graph -> GNN -> Future Road Composer ->
Risk Field -> Planning (A*, D* Lite, Hybrid A*, Splines) -> Control (MPC, CBF) -> Dashboard.
"""

from __future__ import annotations
from enum import Enum
from typing import List, Dict, Tuple, Optional, Any
from pydantic import BaseModel, Field
import numpy as np


class ActorType(str, Enum):
    """Semantic classification of road actors in unstructured environments."""
    EGO = "EGO"
    CAR = "CAR"
    AUTORICKSHAW = "AUTORICKSHAW"
    TWO_WHEELER = "TWO_WHEELER"
    BUS = "BUS"
    TRUCK = "TRUCK"
    PEDESTRIAN = "PEDESTRIAN"
    CATTLE = "CATTLE"
    STATIC_OBSTACLE = "STATIC_OBSTACLE"
    POTHOLE = "POTHOLE"
    BLIND_SPOT = "BLIND_SPOT"


class TrackStatus(str, Enum):
    """Multi-target tracking lifecycle states."""
    TENTATIVE = "TENTATIVE"    # Newly initialized, unconfirmed
    CONFIRMED = "CONFIRMED"    # Statistically stable, active
    COASTING = "COASTING"      # Temporarily occluded, predicting via model
    DELETED = "DELETED"        # Dropped after max miss threshold


class IntentNodeType(str, Enum):
    """Node types in the Road Intent Graph."""
    EGO = "EGO"
    DYNAMIC_ACTOR = "DYNAMIC_ACTOR"
    VULNERABLE_ROAD_USER = "VULNERABLE_ROAD_USER"
    LANE_REGION = "LANE_REGION"
    CONFLICT_ZONE = "CONFLICT_ZONE"
    OCCLUSION_SHADOW = "OCCLUSION_SHADOW"


class IntentEdgeType(str, Enum):
    """Relational edge semantics in unstructured traffic."""
    PROXIMITY = "PROXIMITY"              # Within spatial interaction radius
    FOLLOWING = "FOLLOWING"              # Longitudinal lead-follower relation
    CROSSING = "CROSSING"                # Lateral intersecting trajectory
    MERGING = "MERGING"                  # Convergence into shared lane/region
    OVERTAKING = "OVERTAKING"            # Active passing maneuver
    LATERAL_ENCROACHMENT = "LATERAL_ENCROACHMENT"  # Squeezing / lane-sharing
    YIELD_NEGOTIATION = "YIELD_NEGOTIATION"        # Right-of-way implicit bargaining
    OCCLUDING = "OCCLUDING"              # Actor blocks sensor visibility of another zone
    CONFLICT = "CONFLICT"                # Immediate trajectory spatio-temporal collision risk


class Vector2D(BaseModel):
    """2D Euclidean Vector."""
    x: float
    y: float

    def to_numpy(self) -> np.ndarray:
        return np.array([self.x, self.y], dtype=np.float64)


class Vector3D(BaseModel):
    """3D Euclidean Vector."""
    x: float
    y: float
    z: float = 0.0

    def to_numpy(self) -> np.ndarray:
        return np.array([self.x, self.y, self.z], dtype=np.float64)


class BoundingBox3D(BaseModel):
    """Oriented 3D bounding box for collision checking and footprint modeling."""
    length: float = Field(..., description="Length along vehicle heading (m)")
    width: float = Field(..., description="Width perpendicular to heading (m)")
    height: float = Field(default=1.5, description="Height from ground (m)")


class ActorState(BaseModel):
    """Full kinematic and semantic state of a road participant."""
    actor_id: str
    actor_type: ActorType
    position: Vector2D = Field(..., description="Global or map-frame coordinates [x, y] in meters")
    heading: float = Field(..., description="Yaw orientation in radians [-pi, pi]")
    velocity: Vector2D = Field(default_factory=lambda: Vector2D(x=0.0, y=0.0), description="Velocity vector [vx, vy] in m/s")
    speed: float = Field(default=0.0, description="Scalar speed in m/s")
    yaw_rate: float = Field(default=0.0, description="Angular velocity d(yaw)/dt in rad/s")
    acceleration: float = Field(default=0.0, description="Longitudinal acceleration in m/s^2")
    bbox: BoundingBox3D
    is_occluded: bool = False
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class SensorDetection(BaseModel):
    """Raw observation from perception frontend (Camera / LiDAR / Radar)."""
    detection_id: str
    sensor_type: str = Field(..., description="CAMERA | LIDAR | RADAR")
    position: Vector2D
    bbox: BoundingBox3D
    heading: Optional[float] = None
    velocity: Optional[Vector2D] = None
    confidence: float = 1.0
    covariance: List[List[float]] = Field(
        default_factory=lambda: [[0.2, 0.0], [0.0, 0.2]],
        description="2x2 or 4x4 measurement noise covariance matrix R"
    )


class TrackState(BaseModel):
    """Filtered state from Multi-Target Tracker (KF / UKF)."""
    track_id: str
    actor_type: ActorType
    status: TrackStatus
    state_vector: List[float] = Field(..., description="State [x, y, vx, vy] for KF or [x, y, v, yaw, yaw_rate] for UKF")
    covariance_matrix: List[List[float]] = Field(..., description="State error covariance matrix P")
    position: Vector2D
    velocity: Vector2D
    speed: float
    heading: float
    yaw_rate: float = 0.0
    bbox: BoundingBox3D
    age: int = 1
    hits: int = 1
    misses: int = 0
    time_since_update: float = 0.0
    mahalanobis_distance: float = 0.0


class IntentNode(BaseModel):
    """Node in the dynamic Road Intent Graph."""
    node_id: str
    node_type: IntentNodeType
    actor_type: Optional[ActorType] = None
    position: Vector2D
    velocity: Vector2D
    heading: float
    speed: float
    priority_score: float = Field(default=0.5, description="Negotiation assertiveness score [0=fully passive, 1=assertive]")
    uncertainty: float = Field(default=0.1, description="State estimation / intent uncertainty")
    features: List[float] = Field(default_factory=list, description="Embedding vector for GNN processing")


class IntentEdge(BaseModel):
    """Attributed edge connecting nodes in the Road Intent Graph."""
    source_id: str
    target_id: str
    edge_type: IntentEdgeType
    weight: float = Field(default=1.0, description="Continuous interaction strength [0, 1]")
    spatial_distance: float
    time_to_collision: Optional[float] = Field(default=None, description="Projected TTC in seconds")
    relative_velocity: float
    attention_weight: float = Field(default=0.0, description="GNN computed attention / conflict intensity")


class RoadIntentGraphState(BaseModel):
    """Snapshot of the complete relational scene graph at time t."""
    timestamp: float
    nodes: Dict[str, IntentNode]
    edges: List[IntentEdge]
    conflict_hotspots: List[Vector2D] = Field(default_factory=list)


class TrajectoryPoint(BaseModel):
    """Single discrete waypoint along a future or planned trajectory."""
    x: float
    y: float
    v: float = 0.0
    yaw: float = 0.0
    curvature: float = 0.0
    acceleration: float = 0.0
    jerk: float = 0.0
    time: float = 0.0
    std_x: float = 0.1
    std_y: float = 0.1


class TrajectoryHypothesis(BaseModel):
    """A single plausible multi-modal future trajectory hypothesis (FRC output)."""
    hypothesis_id: str
    maneuver_name: str = Field(..., description="STRAIGHT | CUT_IN | SWERVE_LEFT | SWERVE_RIGHT | BRAKE | YIELD | NUDGE")
    probability: float = Field(..., ge=0.0, le=1.0, description="Hypothesis confidence p_k where sum(p_k)=1")
    waypoints: List[TrajectoryPoint]
    covariance_envelopes: List[List[float]] = Field(default_factory=list, description="Covariance ellipses along the horizon")


class ActorPrediction(BaseModel):
    """Future prediction bundle for a single tracked actor."""
    actor_id: str
    actor_type: ActorType
    hypotheses: List[TrajectoryHypothesis]
    most_likely_hypothesis: str
    epistemic_uncertainty: float = 0.1


class PredictionState(BaseModel):
    """Complete prediction state for all surrounding road participants."""
    timestamp: float
    horizon_seconds: float = 3.0
    dt: float = 0.1
    predictions: Dict[str, ActorPrediction]


class RiskGridMap(BaseModel):
    """2D Spatial continuous potential risk field discretized on a grid."""
    timestamp: float
    origin_x: float
    origin_y: float
    resolution: float = Field(default=0.5, description="Grid cell resolution in meters")
    width: int
    height: int
    data: List[List[float]] = Field(..., description="2D matrix of risk potential values R(x,y) in [0, 1]")
    grad_x: Optional[List[List[float]]] = None
    grad_y: Optional[List[List[float]]] = None


class PlanState(BaseModel):
    """Output from the hierarchical motion planning stage."""
    timestamp: float
    planner_type: str = Field(..., description="HYBRID_A_STAR | D_STAR_LITE | A_STAR_BASELINE")
    waypoints: List[TrajectoryPoint]
    is_replan: bool = False
    planning_time_ms: float
    path_length: float
    max_curvature: float
    max_jerk: float
    cost: float
    success: bool = True


class ControlCommand(BaseModel):
    """Actuation signals dispatched to vehicle steering and drivetrain."""
    timestamp: float
    steering_angle: float = Field(..., description="Front wheel steering angle delta in radians [-0.65, 0.65]")
    acceleration: float = Field(..., description="Longitudinal acceleration in m/s^2 [-6.0, 3.0]")
    throttle: float = Field(default=0.0, ge=0.0, le=1.0)
    brake: float = Field(default=0.0, ge=0.0, le=1.0)
    cbf_active: bool = Field(default=False, description="True if Control Barrier Function intervened on nominal MPC")
    cbf_slack: float = Field(default=0.0, description="Barrier function safety slack variable")
    cbf_safety_margin: float = Field(default=1.0, description="Minimum distance-to-barrier margin h(x)")
    mpc_cost: float = 0.0
    mpc_solve_time_ms: float = 0.0


class SystemMetrics(BaseModel):
    """Real-time system telemetry and diagnostic health."""
    fps: float
    total_pipeline_latency_ms: float
    tracking_latency_ms: float
    graph_latency_ms: float
    prediction_latency_ms: float
    risk_latency_ms: float
    planning_latency_ms: float
    control_latency_ms: float
    active_tracks_count: int
    cbf_interventions_total: int
    min_ttc: Optional[float] = None
    tracking_stability_score: float = 1.0


class FrameBundle(BaseModel):
    """Integrated atomic state payload emitted at every simulation/execution step."""
    frame_id: int
    timestamp: float
    ego_state: ActorState
    raw_detections: List[SensorDetection]
    tracks: List[TrackState]
    intent_graph: RoadIntentGraphState
    predictions: PredictionState
    risk_map: Optional[RiskGridMap] = None
    planned_trajectory: Optional[PlanState] = None
    control_command: Optional[ControlCommand] = None
    metrics: SystemMetrics
    decision_narrative: str = Field(default="", description="Explainable reasoning summary for this frame")
