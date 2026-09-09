import { ActorType, IntentEdgeType } from "../types/navrasa";

/**
 * NAVRASA Apple Vision Pro Edition Design System Tokens
 */
export const VISION_TOKENS = {
  background: "#05070B",
  surface: "rgba(18, 22, 30, 0.72)",
  elevated: "rgba(28, 34, 46, 0.82)",
  primaryText: "#F5F7FA",
  secondaryText: "#9BA6B2",
  divider: "rgba(255, 255, 255, 0.08)",
  accent: "#4DA3FF",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#FF5C7A",
  purple: "#C084FC",
};

export const ACTOR_COLOR_MAP: Record<ActorType, { hex: string; bg: string; border: string; label: string }> = {
  EGO: { hex: "#34D399", bg: "rgba(52, 211, 153, 0.15)", border: "#34D399", label: "Ego Vehicle" },
  AUTORICKSHAW: { hex: "#FBBF24", bg: "rgba(251, 191, 36, 0.15)", border: "#FBBF24", label: "Autorickshaw" },
  TWO_WHEELER: { hex: "#FB923C", bg: "rgba(251, 146, 60, 0.15)", border: "#FB923C", label: "Two-Wheeler" },
  PEDESTRIAN: { hex: "#F472B6", bg: "rgba(244, 114, 182, 0.15)", border: "#F472B6", label: "Pedestrian" },
  CATTLE: { hex: "#C084FC", bg: "rgba(192, 132, 252, 0.15)", border: "#C084FC", label: "Cattle" },
  BUS: { hex: "#60A5FA", bg: "rgba(96, 165, 250, 0.15)", border: "#60A5FA", label: "Bus" },
  TRUCK: { hex: "#38BDF8", bg: "rgba(56, 189, 248, 0.15)", border: "#38BDF8", label: "Truck" },
  CAR: { hex: "#FACC15", bg: "rgba(250, 204, 21, 0.15)", border: "#FACC15", label: "Car" },
  STATIC_OBSTACLE: { hex: "#94A3B8", bg: "rgba(148, 163, 184, 0.15)", border: "#94A3B8", label: "Obstacle" },
  POTHOLE: { hex: "#FB7185", bg: "rgba(251, 113, 133, 0.15)", border: "#FB7185", label: "Pothole" },
  BLIND_SPOT: { hex: "#818CF8", bg: "rgba(129, 140, 248, 0.15)", border: "#818CF8", label: "Blind Spot" },
};

export const EDGE_COLOR_MAP: Record<IntentEdgeType, { hex: string; label: string }> = {
  CONFLICT: { hex: "#FF5C7A", label: "Conflict" },
  LATERAL_ENCROACHMENT: { hex: "#FBBF24", label: "Lateral Squeeze" },
  FOLLOWING: { hex: "#4DA3FF", label: "Following" },
  CROSSING: { hex: "#38BDF8", label: "Crossing" },
  MERGING: { hex: "#FB923C", label: "Merging" },
  OVERTAKING: { hex: "#C084FC", label: "Overtaking" },
  YIELD_NEGOTIATION: { hex: "#34D399", label: "Yield Negotiation" },
  OCCLUDING: { hex: "#818CF8", label: "Occluding" },
  PROXIMITY: { hex: "#64748B", label: "Proximity" },
};
