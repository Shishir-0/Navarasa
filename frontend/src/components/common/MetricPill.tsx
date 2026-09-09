import React from "react";
import { clsx } from "clsx";

export interface MetricPillProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "stable" | "warning" | "neutral";
  status?: "success" | "warning" | "danger" | "info" | "neutral";
  accentColor?: "cyan" | "emerald" | "amber" | "crimson" | "blue" | "default";
}

export const MetricPill: React.FC<MetricPillProps> = ({
  label,
  value,
  unit,
  icon,
  trend,
  status,
  accentColor = "default",
}) => {
  let effectiveAccent = accentColor;
  if (status === "success") effectiveAccent = "emerald";
  else if (status === "warning") effectiveAccent = "amber";
  else if (status === "danger") effectiveAccent = "crimson";
  else if (status === "info") effectiveAccent = "cyan";

  const colorMap = {
    cyan: "text-cyan border-cyan/30 bg-cyan/5",
    emerald: "text-emerald border-emerald/30 bg-emerald/5",
    amber: "text-amber border-amber/30 bg-amber/5",
    crimson: "text-crimson border-crimson/30 bg-crimson/5",
    blue: "text-cyan border-cyan/30 bg-cyan/5",
    default: "text-text-primary border-panel-border bg-panel-bg/60",
  };

  return (
    <div
      className={clsx(
        "flex flex-col p-3 rounded-lg border backdrop-blur-sm transition-all duration-200",
        colorMap[effectiveAccent]
      )}
    >
      <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary uppercase tracking-wider mb-1">
        <span>{label}</span>
        {icon && <span className="opacity-80">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold font-mono tracking-tight text-white">{value}</span>
        {unit && <span className="text-xs text-text-secondary font-mono">{unit}</span>}
      </div>
    </div>
  );
};
