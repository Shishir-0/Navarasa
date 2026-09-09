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
    cyan: "border-[#4DA3FF]/30 bg-[#4DA3FF]/10 text-[#4DA3FF] shadow-[0_4px_16px_rgba(77,163,255,0.08)]",
    emerald: "border-[#34D399]/30 bg-[#34D399]/10 text-[#34D399] shadow-[0_4px_16px_rgba(52,211,153,0.08)]",
    amber: "border-[#FBBF24]/30 bg-[#FBBF24]/10 text-[#FBBF24] shadow-[0_4px_16px_rgba(251,191,36,0.08)]",
    crimson: "border-[#FF5C7A]/30 bg-[#FF5C7A]/10 text-[#FF5C7A] shadow-[0_4px_16px_rgba(255,92,122,0.12)]",
    blue: "border-[#4DA3FF]/30 bg-[#4DA3FF]/10 text-[#4DA3FF] shadow-[0_4px_16px_rgba(77,163,255,0.08)]",
    default: "border-white/[0.08] bg-[#12161E]/70 text-[#F5F7FA] shadow-[0_4px_16px_rgba(0,0,0,0.2)]",
  };

  const dotColor = {
    cyan: "bg-[#4DA3FF]",
    emerald: "bg-[#34D399]",
    amber: "bg-[#FBBF24]",
    crimson: "bg-[#FF5C7A]",
    blue: "bg-[#4DA3FF]",
    default: "bg-white/40",
  };

  return (
    <div
      className={clsx(
        "flex flex-col p-3 rounded-xl border backdrop-blur-2xl transition-all duration-200 relative overflow-hidden group hover:border-white/20",
        colorMap[effectiveAccent]
      )}
    >
      <div className="flex items-center justify-between text-[11px] font-medium text-[#9BA6B2] tracking-wide mb-1">
        <div className="flex items-center gap-1.5 truncate">
          <span className={clsx("w-1.5 h-1.5 rounded-full", dotColor[effectiveAccent])} />
          <span className="truncate">{label}</span>
        </div>
        {icon && <span className="opacity-75 group-hover:opacity-100 transition-opacity">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-semibold tracking-tight text-[#F5F7FA]">{value}</span>
        {unit && <span className="text-[12px] text-[#9BA6B2] font-normal">{unit}</span>}
      </div>
    </div>
  );
};
