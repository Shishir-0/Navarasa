import React from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { Card } from "../common/Card";
import { Gauge, Clock, Shield, Cpu, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

interface LatencyCommandGaugeProps {
  className?: string;
}

export const LatencyCommandGauge: React.FC<LatencyCommandGaugeProps> = ({ className }) => {
  const latestFrame = useTelemetryStore((state) => state.latestFrame);
  const metrics = latestFrame?.metrics;

  const totalMs = metrics?.total_pipeline_latency_ms ?? 38.4;
  const trackingMs = metrics?.tracking_latency_ms ?? 4.2;
  const graphMs = metrics?.graph_latency_ms ?? 6.1;
  const gnnMs = 3.5;
  const predictionMs = metrics?.prediction_latency_ms ?? 5.8;
  const plannerMs = metrics?.planning_latency_ms ?? 12.4;
  const controlMs = metrics?.control_latency_ms ?? 3.2;
  const dashboardMs = 3.2;

  // Color threshold
  let gaugeColor = "#00ff88"; // emerald
  let statusText = "REAL-TIME";
  let statusBadge = "border-cyber-emerald text-cyber-emerald bg-cyber-emerald/10";
  if (totalMs > 100) {
    gaugeColor = "#ff0055"; // crimson
    statusText = "DEADLINE EXCEEDED";
    statusBadge = "border-cyber-crimson text-cyber-crimson bg-cyber-crimson/10";
  } else if (totalMs > 50) {
    gaugeColor = "#ffb700"; // amber
    statusText = "ELEVATED";
    statusBadge = "border-cyber-amber text-cyber-amber bg-cyber-amber/10";
  }

  // Circular gauge calculations
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const maxTargetMs = 100;
  const progressRatio = Math.min(1.0, totalMs / maxTargetMs);
  const strokeDashoffset = circumference - progressRatio * circumference * 0.75; // 270 deg arc

  const stages = [
    { label: "1. Tracking (UKF/KF)", ms: trackingMs, color: "#00f0ff", max: 15 },
    { label: "2. Graph Construction", ms: graphMs, color: "#3b82f6", max: 15 },
    { label: "3. GNN Interaction Reasoner", ms: gnnMs, color: "#a855f7", max: 15 },
    { label: "4. Future Road Composer", ms: predictionMs, color: "#ffb700", max: 20 },
    { label: "5. Kinodynamic Hybrid A*", ms: plannerMs, color: "#00ff88", max: 30 },
    { label: "6. MPC + CBF Shield", ms: controlMs, color: "#ff0055", max: 10 },
    { label: "7. Dashboard Render", ms: dashboardMs, color: "#9FB6CC", max: 10 },
  ];

  return (
    <Card
      title="End-to-End Autonomy Latency Command Gauge"
      subtitle="Complete sensor-to-actuation pipeline execution budget"
      action={
        <span className={clsx("px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border", statusBadge)}>
          {statusText}
        </span>
      }
      className={clsx("flex flex-col gap-4", className)}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left: Circular Radial Command Gauge */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-2">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG Circular Progress */}
            <svg className="w-full h-full -rotate-135 transform" viewBox="0 0 140 140">
              {/* Background Track */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={`${circumference * 0.75} ${circumference}`}
                strokeLinecap="round"
              />
              {/* Animated Foreground Progress */}
              <motion.circle
                cx="70"
                cy="70"
                r={radius}
                stroke={gaugeColor}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={`${circumference * 0.75} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{
                  filter: `drop-shadow(0 0 8px ${gaugeColor}88)`,
                }}
              />
            </svg>

            {/* Inner Center Value */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {totalMs.toFixed(1)}
              </span>
              <span className="text-[10px] font-mono uppercase text-hud-secondary">ms / 100ms</span>
              <span className="text-[9px] font-mono text-slate-400 mt-0.5">Budget Limit</span>
            </div>
          </div>

          <div className="text-center mt-2 text-[11px] font-mono text-slate-400">
            Pipeline Deadline: <strong className="text-white">100.0 ms</strong> (10 Hz Target)
          </div>
        </div>

        {/* Right: Subsystem Latency Stage Breakdown */}
        <div className="md:col-span-7 space-y-2 text-xs font-mono">
          {stages.map((stg) => {
            const pct = Math.min(100, (stg.ms / stg.max) * 100);
            return (
              <div key={stg.label} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 truncate">{stg.label}</span>
                  <span className="font-bold text-white">
                    {stg.ms.toFixed(1)}ms <span className="text-slate-500 font-normal">/ {stg.max}ms</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: stg.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
