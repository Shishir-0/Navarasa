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
  const meta = ACTOR_COLOR_MAP[actorType] || { hex: "#4DA3FF", bg: "rgba(77,163,255,0.12)", label: actorType };

  return (
    <div
      className={clsx(
        "min-w-[190px] rounded-2xl border p-3 font-sans transition-all duration-300 backdrop-blur-2xl shadow-[0_8px_28px_rgba(0,0,0,0.5)] relative overflow-hidden",
        isEgo
          ? "bg-[#12161E]/90 border-[#34D399]/60 shadow-[0_0_24px_rgba(52,211,153,0.2)]"
          : "bg-[#12161E]/85 border-white/[0.1] hover:border-white/20",
        selected && "ring-2 ring-[#4DA3FF] ring-offset-2 ring-offset-[#05070B] scale-105"
      )}
      style={{
        borderTopColor: meta.hex,
        borderTopWidth: "3px",
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#4DA3FF] !w-2.5 !h-2.5 !border-0" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: meta.hex }} />
          <span className="text-xs font-semibold text-[#F5F7FA] truncate">
            {node.node_id}
          </span>
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider shrink-0"
          style={{ backgroundColor: meta.bg, color: meta.hex, border: `1px solid ${meta.hex}44` }}
        >
          {meta.label}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#9BA6B2]">
        <div className="flex items-center gap-1">
          <Gauge className="w-3.5 h-3.5 text-[#4DA3FF]" />
          <span>{(node.speed * 3.6).toFixed(1)} km/h</span>
        </div>
        <div className="flex items-center gap-1">
          <Navigation className="w-3.5 h-3.5 text-[#34D399]" />
          <span>{((node.heading * 180) / Math.PI).toFixed(0)}°</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-[#FBBF24]" />
          <span>Prio: {node.priority_score.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 text-[#FF5C7A]" />
          <span>Unc: {(node.uncertainty * 100).toFixed(0)}%</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[#34D399] !w-2.5 !h-2.5 !border-0" />
    </div>
  );
});
