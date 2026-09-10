/**
 * NAVRASA Strict TypeScript Domain Types & Interfaces.
 * Matches backend Pydantic models with 100% precision.
 */

export type ActorType =
  | "EGO"
  | "CAR"
  | "AUTORICKSHAW"
  | "TWO_WHEELER"
  | "BUS"
  | "TRUCK"
  | "PEDESTRIAN"
  | "CATTLE"
  | "STATIC_OBSTACLE"
  | "POTHOLE"
  | "BLIND_SPOT";

export type TrackStatus = "TENTATIVE" | "CONFIRMED" | "COASTING" | "DELETED";

export type IntentNodeType =
  | "EGO"
  | "DYNAMIC_ACTOR"
  | "VULNERABLE_ROAD_USER"
  | "LANE_REGION"
  | "CONFLICT_ZONE"
  | "OCCLUSION_SHADOW";

export type IntentEdgeType =
  | "PROXIMITY"
  | "FOLLOWING"
  | "CROSSING"
  | "MERGING"
  | "OVERTAKING"
  | "LATERAL_ENCROACHMENT"
  | "YIELD_NEGOTIATION"
  | "OCCLUDING"
  | "CONFLICT";

export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z?: number;
}

export interface BoundingBox3D {
  length: number;
  width: number;
  height: number;
}

export interface ActorState {
  actor_id: string;
  actor_type: ActorType;
  position: Vector2D;
  heading: number;
  velocity: Vector2D;
  speed: number;
  yaw_rate: number;
  acceleration: number;
  bbox: BoundingBox3D;
  is_occluded: boolean;
  confidence: number;
}

export interface SensorDetection {
  detection_id: string;
  sensor_type: "CAMERA" | "LIDAR" | "RADAR" | string;
  position: Vector2D;
  bbox: BoundingBox3D;
  heading?: number | null;
  velocity?: Vector2D | null;
  confidence: number;
  covariance: number[][];
}

export interface TrackState {
  track_id: string;
  actor_type: ActorType;
  status: TrackStatus;
  state_vector: number[];
  covariance_matrix: number[][];
  position: Vector2D;
  velocity: Vector2D;
  speed: number;
  heading: number;
  yaw_rate: number;
  bbox: BoundingBox3D;
  age: number;
  hits: number;
  misses: number;
  time_since_update: number;
  mahalanobis_distance: number;
}

export interface IntentNode {
  node_id: string;
  node_type: IntentNodeType;
  actor_type?: ActorType | null;
  position: Vector2D;
  velocity: Vector2D;
  heading: number;
  speed: number;
  priority_score: number;
  uncertainty: number;
  features: number[];
}

export interface IntentEdge {
  source_id: string;
  target_id: string;
  edge_type: IntentEdgeType;
  weight: number;
  spatial_distance: number;
  time_to_collision?: number | null;
  relative_velocity: number;
  attention_weight: number;
}

export interface RoadIntentGraphState {
  timestamp: number;
  nodes: Record<string, IntentNode>;
  edges: IntentEdge[];
  conflict_hotspots: Vector2D[];
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  v: number;
  yaw: number;
  curvature: number;
  acceleration: number;
  jerk: number;
  time: number;
  std_x: number;
  std_y: number;
}

export interface TrajectoryHypothesis {
  hypothesis_id: string;
  maneuver_name: string;
  probability: number;
  waypoints: TrajectoryPoint[];
  covariance_envelopes?: number[][];
}

export interface ActorPrediction {
  actor_id: string;
  actor_type: ActorType;
  hypotheses: TrajectoryHypothesis[];
  most_likely_hypothesis: string;
  epistemic_uncertainty: number;
}

export interface PredictionState {
  timestamp: number;
  horizon_seconds: number;
  dt: number;
  predictions: Record<string, ActorPrediction>;
}

export interface RiskGridMap {
  timestamp: number;
  origin_x: number;
  origin_y: number;
  resolution: number;
  width: number;
  height: number;
  data: number[][];
  grad_x?: number[][] | null;
  grad_y?: number[][] | null;
}

export interface PlanState {
  timestamp: number;
  planner_type: string;
  waypoints: TrajectoryPoint[];
  is_replan: boolean;
  planning_time_ms: number;
  path_length: number;
  max_curvature: number;
  max_jerk: number;
  cost: number;
  success: boolean;
}

export interface ControlCommand {
  timestamp: number;
  steering_angle: number;
  acceleration: number;
  throttle: number;
  brake: number;
  cbf_active: boolean;
  cbf_slack: number;
  cbf_safety_margin: number;
  mpc_cost: number;
  mpc_solve_time_ms: number;
}

export interface SystemMetrics {
  fps: number;
  total_pipeline_latency_ms: number;
  tracking_latency_ms: number;
  graph_latency_ms: number;
  prediction_latency_ms: number;
  risk_latency_ms: number;
  planning_latency_ms: number;
  control_latency_ms: number;
  active_tracks_count: number;
  cbf_interventions_total: number;
  min_ttc?: number | null;
  tracking_stability_score: number;
}

export interface FrameBundle {
  frame_id: number;
  timestamp: number;
  ego_state: ActorState;
  raw_detections: SensorDetection[];
  tracks: TrackState[];
  intent_graph: RoadIntentGraphState;
  predictions: PredictionState;
  risk_map?: RiskGridMap | null;
  planned_trajectory?: PlanState | null;
  control_command?: ControlCommand | null;
  metrics: SystemMetrics;
  decision_narrative: string;
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  difficulty?: string;
  weather?: string;
  traffic_density?: string;
  hazard_type?: string;
  duration_s: number;
  ego_start: {
    x: number;
    y: number;
    heading: number;
    speed: number;
  };
  target_goal: {
    x: number;
    y: number;
    heading: number;
  };
}
