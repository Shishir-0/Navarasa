import React from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { usePlaybackStore } from "../store/playbackStore";
import { useUIStore } from "../store/uiStore";
import { MetricPill } from "../components/common/MetricPill";
import { Card } from "../components/common/Card";
import { DigitalTwinCanvas } from "../components/3d/DigitalTwinCanvas";
import { IntentGraphFlow } from "../components/graph/IntentGraphFlow";
import { ActorBadge } from "../components/common/Badge";
import { LatencyCommandGauge } from "../components/charts/LatencyCommandGauge";
import { PlannerMetricsPanel } from "../components/charts/PlannerMetricsPanel";
import { RadarSweepWidget } from "../components/common/RadarSweepWidget";
import { SystemHealthPanel } from "../components/common/SystemHealthPanel";
import { ScenarioCardGrid } from "../components/layout/ScenarioCardGrid";
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
  Radio,
  Layers,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

export const MissionControlPage: React.FC = () => {
  const { latestFrame, frameBuffer, activeScenarioId } = useTelemetryStore();
  const { isReplayMode, scrubberIndex } = usePlaybackStore();
  const { isJudgeMode, toggleJudgeMode } = useUIStore();

  const currentFrame = isReplayMode && frameBuffer[scrubberIndex]
    ? frameBuffer[scrubberIndex]
    : latestFrame;

  const ego = currentFrame?.ego_state;
  const cmd = currentFrame?.control_command;
  const metrics = currentFrame?.metrics;
  const cbfActive = cmd?.cbf_active ?? false;

  return (
    <div className="p-5 space-y-5 min-h-full font-sans">
      {/* 1. Subsystem Health Status Bar (or Judge Mode Banner) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-[#9BA6B2] uppercase tracking-wider font-semibold">
            {isJudgeMode ? "SIH JUDGE EVALUATION MODE:" : "Subsystem Health:"}
          </span>
          <SystemHealthPanel />
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          {isJudgeMode ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "4s" }} />
              <span>JUDGE DEMO PRESENTATION ACTIVE (Press J to exit)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[#4DA3FF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4DA3FF] animate-ping" />
              <span className="font-medium">20 Hz Hardware Sync Loop</span>
            </div>
          )}
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

      {/* 3. Primary Operations Center: 3D Twin + HUD Overlay */}
      <div className={clsx("grid gap-5", isJudgeMode ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-12")}>
        {/* Left / Full Width: Hero 3D Digital Twin Canvas */}
        <div className={clsx("flex flex-col gap-4", isJudgeMode ? "w-full" : "lg:col-span-8")}>
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#12161E]/75 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            <DigitalTwinCanvas height={isJudgeMode ? "h-[640px]" : "h-[500px]"} />

            {/* Tactical Radar Sweep Overlay HUD */}
            {!isJudgeMode && (
              <div className="absolute top-3 right-3 z-10 pointer-events-none hidden sm:block">
                <RadarSweepWidget size={110} />
              </div>
            )}

            {/* Narrative Strip Inside Canvas Bottom */}
            <div className="absolute bottom-3 left-3 right-3 z-10 bg-[#12161E]/90 backdrop-blur-2xl p-3 rounded-2xl border border-white/[0.1] text-xs flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border shrink-0",
                    cbfActive
                      ? "bg-[#FF5C7A]/20 text-[#FF5C7A] border-[#FF5C7A]/50 animate-pulse"
                      : "bg-[#4DA3FF]/15 text-[#4DA3FF] border-[#4DA3FF]/35"
                  )}
                >
                  {cbfActive ? "CBF OVERRIDE" : "NOMINAL"}
                </span>
                <span className="text-[#F5F7FA] text-[12px] truncate max-w-2xl font-sans">
                  {currentFrame?.decision_narrative || "System operating in nominal tracking cruise."}
                </span>
              </div>
              <div className="text-[11px] text-[#9BA6B2] whitespace-nowrap hidden sm:block font-mono shrink-0">
                Frame #{currentFrame?.frame_id ?? 0} [T+{currentFrame?.timestamp.toFixed(2) ?? "0.00"}s]
              </div>
            </div>
          </div>

          {/* Kinodynamic Planner Diagnostics Panel */}
          {!isJudgeMode && <PlannerMetricsPanel />}
        </div>

        {/* Right 4 Cols: Intent Graph + Multi-Modal Hypotheses */}
        {!isJudgeMode && (
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
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 font-sans">
                {currentFrame?.predictions?.predictions && Object.keys(currentFrame.predictions.predictions).length > 0 ? (
                  Object.values(currentFrame.predictions.predictions).map((pred) => (
                    <div key={pred.actor_id} className="p-2.5 rounded-xl bg-[#05070B]/70 border border-white/[0.06] text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-[#4DA3FF] font-mono">{pred.actor_id}</span>
                        <ActorBadge type={pred.actor_type} />
                      </div>
                      <div className="space-y-1.5">
                        {pred.hypotheses.map((hyp) => (
                          <div key={hyp.hypothesis_id}>
                            <div className="flex justify-between text-[11px] mb-0.5">
                              <span className="text-[#9BA6B2]">{hyp.maneuver_name}</span>
                              <span className="text-[#FBBF24] font-mono font-semibold">{(hyp.probability * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-[#05070B] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#4DA3FF] to-[#FBBF24] rounded-full"
                                style={{ width: `${hyp.probability * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#9BA6B2] text-center py-6">
                    No dynamic actors in prediction horizon.
                  </div>
                )}
              </div>
            </Card>

            {/* End-to-End Latency Command Gauge */}
            <LatencyCommandGauge />
          </div>
        )}
      </div>

      {/* 4. Scenario Selector Benchmarks Grid */}
      <div className="pt-4 border-t border-white/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Indian Road Autonomy Benchmark Scenarios
            </h2>
            <p className="text-xs text-white/50 font-sans mt-0.5">
              Select any scenario to evaluate real-time tracking, intent reasoning, and CBF safety barrier performance.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-space-900 border border-white/10 text-xs font-mono text-neon-cyan">
            Active: {activeScenarioId}
          </span>
        </div>
        <ScenarioCardGrid />
      </div>
    </div>
  );
};
