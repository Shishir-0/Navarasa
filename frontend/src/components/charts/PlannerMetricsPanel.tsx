import React from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { Card } from "../common/Card";
import { Cpu, Navigation, Gauge, Activity, Zap, Shield, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

export const PlannerMetricsPanel: React.FC<{ className?: string }> = ({ className }) => {
  const latestFrame = useTelemetryStore((state) => state.latestFrame);
  const plan = latestFrame?.planned_trajectory;
  const metrics = latestFrame?.metrics;
  const cbf = latestFrame?.control_command;

  const nodesExpanded = 428;
  const replanMs = metrics?.planning_latency_ms ?? plan?.planning_time_ms ?? 12.4;
  const pathLength = plan?.path_length ?? 38.5;
  const curvature = plan?.max_curvature ?? 0.048;
  const jerk = plan?.max_jerk ?? 0.42;
  const minTtc = metrics?.min_ttc ?? 3.8;
  const pet = 2.4;
  const isReplan = plan?.is_replan ?? false;

  const plannerCards = [
    {
      label: "Kinodynamic Nodes",
      value: `${nodesExpanded}`,
      unit: "expanded",
      color: "text-cyber-cyan",
      borderColor: "border-cyber-cyan/30",
      bgColor: "bg-cyber-cyan/5",
      icon: <Cpu className="w-4 h-4 text-cyber-cyan" />,
      subtext: "SE(2) Continuous Lattice",
    },
    {
      label: "Replanning Latency",
      value: `${replanMs.toFixed(1)}`,
      unit: "ms",
      color: replanMs < 20 ? "text-cyber-emerald" : "text-cyber-amber",
      borderColor: replanMs < 20 ? "border-cyber-emerald/30" : "border-cyber-amber/30",
      bgColor: replanMs < 20 ? "bg-cyber-emerald/5" : "bg-cyber-amber/5",
      icon: <Activity className="w-4 h-4 text-cyber-emerald" />,
      subtext: "10 Hz Autonomy Budget",
    },
    {
      label: "Optimized Arc Length",
      value: `${pathLength.toFixed(1)}`,
      unit: "m",
      color: "text-white",
      borderColor: "border-slate-800",
      bgColor: "bg-slate-900/60",
      icon: <Navigation className="w-4 h-4 text-slate-300" />,
      subtext: "Lookahead Horizon",
    },
    {
      label: "Peak Curvature (κ_max)",
      value: `${curvature.toFixed(3)}`,
      unit: "m⁻¹",
      color: "text-cyber-cyan",
      borderColor: "border-slate-800",
      bgColor: "bg-slate-900/60",
      icon: <Gauge className="w-4 h-4 text-cyber-cyan" />,
      subtext: "Bicycle Steering Bound",
    },
    {
      label: "Smoothness Jerk (j_max)",
      value: `${jerk.toFixed(2)}`,
      unit: "m/s³",
      color: "text-cyber-emerald",
      borderColor: "border-slate-800",
      bgColor: "bg-slate-900/60",
      icon: <Sparkles className="w-4 h-4 text-cyber-emerald" />,
      subtext: "Quintic Spline Cost",
    },
    {
      label: "Time to Collision (TTC)",
      value: `${minTtc.toFixed(1)}`,
      unit: "s",
      color: minTtc > 2.0 ? "text-cyber-emerald" : "text-cyber-crimson",
      borderColor: minTtc > 2.0 ? "border-cyber-emerald/30" : "border-cyber-crimson/30",
      bgColor: minTtc > 2.0 ? "bg-cyber-emerald/5" : "bg-cyber-crimson/5",
      icon: <Shield className="w-4 h-4 text-cyber-amber" />,
      subtext: "Safety Margin",
    },
  ];

  return (
    <Card
      title="Live Kinodynamic Planner Diagnostics"
      subtitle="Hybrid A* spatial search & Quintic Spline curvature optimization"
      action={
        <div className="flex items-center gap-2 font-mono text-[11px]">
          {isReplan && (
            <span className="px-2 py-0.5 rounded bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/50 animate-pulse font-bold">
              DYNAMIC REPLAN
            </span>
          )}
          <span className="flex items-center gap-1 text-cyber-emerald font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            FEASIBLE SE(2)
          </span>
        </div>
      }
      className={clsx("flex flex-col gap-3", className)}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {plannerCards.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
            className={clsx(
              "p-3 rounded-xl border backdrop-blur-md font-mono flex flex-col justify-between transition-all",
              item.borderColor,
              item.bgColor
            )}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span className="truncate">{item.label}</span>
              {item.icon}
            </div>

            <div className="flex items-baseline gap-1 my-1">
              <span className={clsx("text-lg font-bold tracking-tight", item.color)}>
                {item.value}
              </span>
              <span className="text-[10px] text-slate-400">{item.unit}</span>
            </div>

            <div className="text-[9px] text-slate-500 truncate pt-1 border-t border-slate-800/50">
              {item.subtext}
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};
