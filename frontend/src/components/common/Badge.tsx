import React from "react";
import { clsx } from "clsx";
import { ActorType, IntentEdgeType } from "../../types/navrasa";
import { ACTOR_COLOR_MAP, EDGE_COLOR_MAP } from "../../utils/colors";

export type BadgeVariant = "cyan" | "emerald" | "amber" | "crimson" | "danger" | "warning" | "success" | "info" | "outline" | "neutral";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = "cyan", children, className, ...props }) => {
  const variantStyles: Record<BadgeVariant, string> = {
    cyan: "bg-cyan/15 text-cyan border-cyan/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]",
    emerald: "bg-emerald/15 text-emerald border-emerald/40 shadow-[0_0_10px_rgba(0,255,136,0.2)]",
    amber: "bg-amber/15 text-amber border-amber/40 shadow-[0_0_10px_rgba(255,183,0,0.2)]",
    crimson: "bg-crimson/15 text-crimson border-crimson/40 shadow-[0_0_10px_rgba(255,0,85,0.25)]",
    danger: "bg-crimson/20 text-crimson border-crimson/50 font-bold",
    warning: "bg-amber/20 text-amber border-amber/50 font-bold",
    success: "bg-emerald/20 text-emerald border-emerald/50 font-bold",
    info: "bg-cyan/20 text-cyan border-cyan/50 font-bold",
    outline: "bg-panel-bg/60 text-slate-300 border-panel-border",
    neutral: "bg-slate-800/80 text-slate-300 border-slate-700",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border tracking-wider uppercase",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

interface ActorBadgeProps {
  type: ActorType;
  className?: string;
}

export const ActorBadge: React.FC<ActorBadgeProps> = ({ type, className }) => {
  const meta = ACTOR_COLOR_MAP[type] || { hex: "#fff", bg: "rgba(255,255,255,0.1)", label: type };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border",
        className
      )}
      style={{
        backgroundColor: meta.bg,
        borderColor: `${meta.hex}55`,
        color: meta.hex,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: meta.hex }} />
      {meta.label}
    </span>
  );
};

interface EdgeBadgeProps {
  type: IntentEdgeType;
  className?: string;
}

export const EdgeBadge: React.FC<EdgeBadgeProps> = ({ type, className }) => {
  const meta = EDGE_COLOR_MAP[type] || { hex: "#fff", label: type };
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider border",
        className
      )}
      style={{
        backgroundColor: `${meta.hex}15`,
        borderColor: `${meta.hex}44`,
        color: meta.hex,
      }}
    >
      {meta.label}
    </span>
  );
};
