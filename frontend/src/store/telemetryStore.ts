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
      id: "market",
      name: "Crowded Market Street Scenario",
      description: "Dense Indian market street with pedestrians crossing unpredictably and weaving motorcycles cutting through tight traffic gaps.",
      duration_s: 15.0,
      ego_start: { x: 0.0, y: 0.0, heading: 0.0, speed: 6.5 },
      target_goal: { x: 75.0, y: 0.0, heading: 0.0 }
    },
    {
      id: "village",
      name: "Unmarked Village Road Scenario",
      description: "Narrow rural road corridor with unpaved shoulders and a group of pedestrians walking in the middle of the road.",
      duration_s: 14.0,
      ego_start: { x: 0.0, y: 0.0, heading: 0.0, speed: 7.0 },
      target_goal: { x: 65.0, y: 0.0, heading: 0.0 }
    },
    {
      id: "highway",
      name: "High-Speed Highway Merge Scenario",
      description: "Multi-lane arterial highway with high closing velocity delta, diagonal truck occlusion, and dual lane merge negotiation.",
      duration_s: 16.0,
      ego_start: { x: 0.0, y: 0.0, heading: 0.0, speed: 16.0 },
      target_goal: { x: 120.0, y: 0.0, heading: 0.0 }
    },
    {
      id: "junction",
      name: "Unsignalized 4-Way Junction Scenario",
      description: "Complex unsignalized Indian cross-junction where an auto-rickshaw suddenly halts to drop a passenger while cross-traffic negotiates priority.",
      duration_s: 14.0,
      ego_start: { x: -30.0, y: 0.0, heading: 0.0, speed: 7.0 },
      target_goal: { x: 40.0, y: 0.0, heading: 0.0 }
    },
    {
      id: "rain",
      name: "Monsoon Rain & Fog Occlusion Scenario",
      description: "Heavy precipitation with reduced road friction coefficient, dense spray, and a late-emerging pedestrian in fog.",
      duration_s: 12.0,
      ego_start: { x: 0.0, y: 0.0, heading: 0.0, speed: 7.5 },
      target_goal: { x: 60.0, y: 0.0, heading: 0.0 }
    },
    {
      id: "cattle",
      name: "Stationary Cattle Lane Blockage Scenario",
      description: "Stationary cow blocking travel lane requiring Kinodynamic Hybrid A* lateral nudging with CBF safety guard.",
      duration_s: 15.0,
      ego_start: { x: 0.0, y: -1.75, heading: 0.0, speed: 7.0 },
      target_goal: { x: 70.0, y: -1.75, heading: 0.0 }
    },
    {
      id: "wrong_way",
      name: "Wrong-Way Vehicle Emergency Avoidance Scenario",
      description: "A two-wheeler drives in the wrong direction directly into ego lane, triggering emergency CBF intervention.",
      duration_s: 12.0,
      ego_start: { x: 0.0, y: 0.0, heading: 0.0, speed: 8.0 },
      target_goal: { x: 60.0, y: 0.0, heading: 0.0 }
    },
    {
      id: "pothole",
      name: "Pothole & Degraded Road Swerve Scenario",
      description: "Severe road surface anomalies requiring kinodynamic Hybrid A* trajectory swerving to maintain safety.",
      duration_s: 14.0,
      ego_start: { x: 0.0, y: 0.0, heading: 0.0, speed: 7.5 },
      target_goal: { x: 65.0, y: 0.0, heading: 0.0 }
    },
    {
      id: "autorickshaw_cutin_blindspot",
      name: "Auto-Rickshaw Sudden Cut-in with Blindspot Pedestrian",
      description: "Aggressive autorickshaw lane cut-in with occluded pedestrian crossing behind parked truck.",
      duration_s: 10.0,
      ego_start: { x: 0.0, y: 0.0, heading: 0.0, speed: 8.0 },
      target_goal: { x: 60.0, y: 0.0, heading: 0.0 }
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
