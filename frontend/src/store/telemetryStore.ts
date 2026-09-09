import { create } from "zustand";
import { FrameBundle, ScenarioDefinition } from "../types/navrasa";

interface TelemetryState {
  latestFrame: FrameBundle | null;
  currentFrame: FrameBundle | null;
  frameBuffer: FrameBundle[];
  buffer: FrameBundle[];
  maxBufferSize: number;
  isConnected: boolean;
  activeScenarioId: string;
  scenarios: ScenarioDefinition[];
  fps: number;
  latency: number;
  
  // Actions
  setConnected: (connected: boolean) => void;
  pushFrame: (frame: FrameBundle) => void;
  setScenario: (scenarioId: string) => void;
  setScenarios: (scenarios: ScenarioDefinition[]) => void;
  clearBuffer: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  latestFrame: null,
  currentFrame: null,
  frameBuffer: [],
  buffer: [],
  maxBufferSize: 300,
  isConnected: false,
  activeScenarioId: "autorickshaw_cutin_blindspot",
  fps: 30,
  latency: 42,
  scenarios: [
    {
      id: "autorickshaw_cutin_blindspot",
      name: "Auto-Rickshaw Sudden Cut-in with Blindspot Pedestrian",
      description: "Aggressive autorickshaw lane cut-in with occluded pedestrian crossing behind parked truck.",
      duration_s: 10.0,
      ego_start: { x: 0.0, y: 0.0, heading: 0.0, speed: 8.0 },
      target_goal: { x: 60.0, y: 0.0, heading: 0.0 }
    },
    {
      id: "unmarked_intersection_chaos",
      name: "Unmarked 4-Way Intersection with Wrong-Way Two-Wheeler",
      description: "Unsignalized junction negotiation with oncoming bike driving against traffic.",
      duration_s: 12.0,
      ego_start: { x: -30.0, y: 0.0, heading: 0.0, speed: 6.0 },
      target_goal: { x: 30.0, y: 0.0, heading: 0.0 }
    },
    {
      id: "cow_blockage_lateral_nudge",
      name: "Stationary Cattle Lane Blockage with Oncoming Traffic",
      description: "Stationary cow blocking travel lane requiring Kinodynamic Hybrid A* lateral nudging with CBF safety guard.",
      duration_s: 15.0,
      ego_start: { x: 0.0, y: -1.75, heading: 0.0, speed: 7.0 },
      target_goal: { x: 70.0, y: -1.75, heading: 0.0 }
    }
  ],

  setConnected: (connected) => set({ isConnected: connected }),
  pushFrame: (frame) =>
    set((state) => {
      const updated = [...state.frameBuffer, frame];
      if (updated.length > state.maxBufferSize) {
        updated.shift();
      }
      const measuredLatency = frame.metrics?.total_pipeline_latency_ms || 42;
      return {
        latestFrame: frame,
        currentFrame: frame,
        frameBuffer: updated,
        buffer: updated,
        latency: Math.round(measuredLatency),
      };
    }),
  setScenario: (scenarioId) => set({ activeScenarioId: scenarioId }),
  setScenarios: (scenarios) => set({ scenarios }),
  clearBuffer: () => set({ frameBuffer: [], buffer: [] }),
}));
