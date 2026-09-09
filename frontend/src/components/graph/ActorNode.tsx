import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { IntentNode } from "../../types/navrasa";
import { ACTOR_COLOR_MAP } from "../../utils/colors";
import { Gauge, Navigation, Shield, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

export const ActorNode: React.FC<any> = memo(({ data, selected }) => {
  const node: IntentNode = data.node;
  const isEgo = node.node_id === "ego";
  const actorType = node.actor_type || (isEgo ? "EGO" : "CAR");
  const meta = ACTOR_COLOR_MAP[actorType] || { hex: "#FFB700", bg: "rgba(255,183,0,0.1)", label: actorType };

  return (
    <div
      className={clsx(
        "min-w-[190px] rounded-xl border p-3 font-mono transition-all duration-300 backdrop-blur-md shadow-lg",
        isEgo
          ? "bg-slate-900/95 border-emerald shadow-glow-emerald"
          : "bg-panel-bg/95 border-slate-700 hover:border-slate-500",
        selected && "ring-2 ring-cyan ring-offset-2 ring-offset-slate-950 scale-105"
      )}
      style={{
        borderTopColor: meta.hex,
        borderTopWidth: "3px",
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan !w-2.5 !h-2.5" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.hex }} />
          <span className="text-xs font-bold text-white truncate max-w-[100px]">
            {node.node_id}
          </span>
        </div>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
          style={{ backgroundColor: meta.bg, color: meta.hex }}
        >
          {meta.label}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1">
          <Gauge className="w-3.5 h-3.5 text-cyan" />
          <span>{(node.speed * 3.6).toFixed(1)} km/h</span>
        </div>
        <div className="flex items-center gap-1">
          <Navigation className="w-3.5 h-3.5 text-emerald" />
          <span>{((node.heading * 180) / Math.PI).toFixed(0)}°</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-amber" />
          <span>Priority: {node.priority_score.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-crimson" />
          <span>Unc: {(node.uncertainty * 100).toFixed(0)}%</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-emerald !w-2.5 !h-2.5" />
    </div>
  );
});
