import React from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";

export const SystemHealthPanel: React.FC<{ className?: string }> = ({ className }) => {
  const latestFrame = useTelemetryStore((state) => state.latestFrame);
  const isConnected = useTelemetryStore((state) => state.isConnected);

  const modules = [
    { name: "Tracking (UKF)", status: "ONLINE", latency: `${(latestFrame?.metrics.tracking_latency_ms || 4.2).toFixed(1)}ms` },
    { name: "Intent GNN", status: "ONLINE", latency: `${(latestFrame?.metrics.graph_latency_ms || 6.1).toFixed(1)}ms` },
    { name: "Future Composer", status: "ONLINE", latency: `${(latestFrame?.metrics.prediction_latency_ms || 5.8).toFixed(1)}ms` },
    { name: "Kinodynamic A*", status: "ONLINE", latency: `${(latestFrame?.metrics.planning_latency_ms || 12.4).toFixed(1)}ms` },
    { name: "MPC + CBF", status: "ONLINE", latency: `${(latestFrame?.metrics.control_latency_ms || 3.2).toFixed(1)}ms` },
    { name: "TelemetryBus", status: isConnected ? "ONLINE" : "SIMULATED", latency: `${(latestFrame?.metrics.total_pipeline_latency_ms || 35.0).toFixed(1)}ms` },
  ];

  return (
    <div className={clsx("flex items-center gap-2 overflow-x-auto py-1 font-mono text-[11px]", className)}>
      {modules.map((m) => (
        <div
          key={m.name}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-panel/70 border border-slate-800 backdrop-blur-md whitespace-nowrap"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald animate-pulse" />
          <span className="text-slate-300 font-medium">{m.name}</span>
          <span className="text-[10px] text-slate-500">({m.latency})</span>
        </div>
      ))}
    </div>
  );
};
