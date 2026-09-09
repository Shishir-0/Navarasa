import { ActorType, IntentEdgeType } from "../types/navrasa";

export const ACTOR_COLOR_MAP: Record<ActorType, { hex: string; bg: string; border: string; label: string }> = {
  EGO: { hex: "#00FF88", bg: "rgba(0, 255, 136, 0.15)", border: "#00FF88", label: "Ego Vehicle" },
  AUTORICKSHAW: { hex: "#FFB700", bg: "rgba(255, 183, 0, 0.15)", border: "#FFB700", label: "Autorickshaw" },
  TWO_WHEELER: { hex: "#FF7700", bg: "rgba(255, 119, 0, 0.15)", border: "#FF7700", label: "Two-Wheeler" },
  PEDESTRIAN: { hex: "#FF00FF", bg: "rgba(255, 0, 255, 0.15)", border: "#FF00FF", label: "Pedestrian" },
  CATTLE: { hex: "#A855F7", bg: "rgba(168, 85, 247, 0.15)", border: "#A855F7", label: "Cattle" },
  BUS: { hex: "#0088FF", bg: "rgba(0, 136, 255, 0.15)", border: "#0088FF", label: "Bus" },
  TRUCK: { hex: "#38BDF8", bg: "rgba(56, 189, 248, 0.15)", border: "#38BDF8", label: "Truck" },
  CAR: { hex: "#FACC15", bg: "rgba(250, 204, 21, 0.15)", border: "#FACC15", label: "Car" },
  STATIC_OBSTACLE: { hex: "#94A3B8", bg: "rgba(148, 163, 184, 0.15)", border: "#94A3B8", label: "Obstacle" },
  POTHOLE: { hex: "#E11D48", bg: "rgba(225, 29, 72, 0.15)", border: "#E11D48", label: "Pothole" },
  BLIND_SPOT: { hex: "#6366F1", bg: "rgba(99, 102, 241, 0.15)", border: "#6366F1", label: "Blind Spot" },
};

export const EDGE_COLOR_MAP: Record<IntentEdgeType, { hex: string; label: string }> = {
  CONFLICT: { hex: "#FF0055", label: "Conflict" },
  LATERAL_ENCROACHMENT: { hex: "#FFB700", label: "Lateral Squeeze" },
  FOLLOWING: { hex: "#3B82F6", label: "Following" },
  CROSSING: { hex: "#00E5FF", label: "Crossing" },
  MERGING: { hex: "#F59E0B", label: "Merging" },
  OVERTAKING: { hex: "#A855F7", label: "Overtaking" },
  YIELD_NEGOTIATION: { hex: "#00FF88", label: "Yield Negotiation" },
  OCCLUDING: { hex: "#818CF8", label: "Occluding" },
  PROXIMITY: { hex: "#475569", label: "Proximity" },
};
