import React from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { usePlaybackStore } from "../store/playbackStore";
import { MetricPill } from "../components/common/MetricPill";
import { Card } from "../components/common/Card";
import { DigitalTwinCanvas } from "../components/3d/DigitalTwinCanvas";
import { IntentGraphFlow } from "../components/graph/IntentGraphFlow";
import { ActorBadge } from "../components/common/Badge";
import { LatencyCommandGauge } from "../components/charts/LatencyCommandGauge";
import { PlannerMetricsPanel } from "../components/charts/PlannerMetricsPanel";
import { RadarSweepWidget } from "../components/common/RadarSweepWidget";
import { SystemHealthPanel } from "../components/common/SystemHealthPanel";
import {
  Gauge,
  Navigation,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Compass,
  Zap,
  Sparkles,
  Eye,
  Radio
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

export const MissionControlPage: React.FC = () => {
  const { latestFrame, frameBuffer } = useTelemetryStore();
  const { isReplayMode, scrubberIndex } = usePlaybackStore();

  const currentFrame = isReplayMode && frameBuffer[scrubberIndex]
    ? frameBuffer[scrubberIndex]
    : latestFrame;

  const ego = currentFrame?.ego_state;
  const cmd = currentFrame?.control_command;
  const metrics = currentFrame?.metrics;
  const cbfActive = cmd?.cbf_active ?? false;

  return (
    <div className="p-4 space-y-4 min-h-full font-mono">
      {/* 1. Subsystem Health Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            Subsystem Health Status:
          </span>
          <SystemHealthPanel />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-cyber-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-ping" />
            <span>20 Hz Sync Loop</span>
          </div>
        </div>
      </div>

      {/* 2. Top Telemetry KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricPill
          label="Ego Velocity"
          value={((ego?.speed ?? 0) * 3.6).toFixed(1)}
          unit="km/h"
          icon={<Gauge className="w-4 h-4" />}
          status="success"
        />
        <MetricPill
          label="Steering Angle"
          value={(((cmd?.steering_angle ?? 0) * 180) / Math.PI).toFixed(1)}
          unit="deg"
          icon={<Navigation className="w-4 h-4" />}
          status="info"
        />
        <MetricPill
          label="Longitudinal Accel"
          value={(cmd?.acceleration ?? 0).toFixed(2)}
          unit="m/s²"
          icon={<Activity className="w-4 h-4" />}
          status={cmd && cmd.acceleration < 0 ? "danger" : "info"}
        />
        <MetricPill
          label="Tracked Entities"
          value={currentFrame?.tracks.length ?? 0}
          unit="actors"
          icon={<Compass className="w-4 h-4" />}
          status="warning"
        />
        <MetricPill
          label="CBF Barrier Margin"
          value={(cmd?.cbf_safety_margin ?? 5.0).toFixed(1)}
          unit="m"
          icon={cbfActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          status={cbfActive ? "danger" : "success"}
        />
        <MetricPill
          label="Pipeline Latency"
          value={(metrics?.total_pipeline_latency_ms ?? 35.0).toFixed(1)}
          unit="ms"
          icon={<Zap className="w-4 h-4" />}
          status={(metrics?.total_pipeline_latency_ms ?? 35.0) < 50 ? "success" : "warning"}
        />
      </div>

      {/* 3. Primary Operations Center: 3D Twin + HUD Overlay + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 8 Cols: 3D Digital Twin Canvas */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-panel/80 shadow-panel-glow">
            <DigitalTwinCanvas height="h-[460px]" />

            {/* Radar Sweep Widget HUD Overlay */}
            <div className="absolute top-3 right-3 z-10 pointer-events-none">
              <RadarSweepWidget size={120} />
            </div>

            {/* Narrative Strip Inside Canvas Bottom */}
            <div className="absolute bottom-3 left-3 right-3 z-10 bg-panel/90 backdrop-blur-md p-3 rounded-xl border border-slate-700/80 text-xs flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                  cbfActive
                    ? "bg-cyber-crimson/20 text-cyber-crimson border-cyber-crimson/60 animate-pulse"
                    : "bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/40"
                )}>
                  {cbfActive ? "OVERRIDE" : "NOMINAL"}
                </span>
                <span className="text-slate-200 text-[11px] truncate max-w-xl font-sans">
                  {currentFrame?.decision_narrative || "System operating in nominal tracking cruise."}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 whitespace-nowrap hidden sm:block">
                Frame #{currentFrame?.frame_id ?? 0} [T+{currentFrame?.timestamp.toFixed(2) ?? "0.00"}s]
              </div>
            </div>
          </div>

          {/* Kinodynamic Planner Diagnostics Panel */}
          <PlannerMetricsPanel />
        </div>

        {/* Right 4 Cols: Intent Graph + Multi-Modal Hypotheses */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Live Road Intent Graph */}
          <Card
            title="Road Intent Graph"
            subtitle="GNN dynamic interaction edges & conflict zones"
          >
            <IntentGraphFlow height="h-[230px]" />
          </Card>

          {/* Future Road Composer */}
          <Card
            title="Future Road Composer"
            subtitle="Multi-hypothesis predicted trajectories"
          >
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {currentFrame?.predictions?.predictions && Object.keys(currentFrame.predictions.predictions).length > 0 ? (
                Object.values(currentFrame.predictions.predictions).map((pred) => (
                  <div key={pred.actor_id} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-cyber-cyan">{pred.actor_id}</span>
                      <ActorBadge type={pred.actor_type} />
                    </div>
                    <div className="space-y-1">
                      {pred.hypotheses.map((hyp) => (
                        <div key={hyp.hypothesis_id}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-slate-300">{hyp.maneuver_name}</span>
                            <span className="text-cyber-amber font-bold">{(hyp.probability * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-amber rounded-full"
                              style={{ width: `${hyp.probability * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 text-center py-6">
                  No dynamic actors in prediction horizon.
                </div>
              )}
            </div>
          </Card>

          {/* End-to-End Latency Command Gauge */}
          <LatencyCommandGauge />
        </div>
      </div>
    </div>
  );
};
