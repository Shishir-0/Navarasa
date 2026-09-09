import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  Network,
  GitFork,
  Flame,
  Clock,
  LineChart,
  Sliders,
} from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { path: "/", label: "Mission Control", icon: LayoutDashboard },
  { path: "/digital-twin", label: "3D Digital Twin", icon: Boxes },
  { path: "/intent-graph", label: "Road Intent Graph", icon: Network },
  { path: "/future-composer", label: "Future Composer", icon: GitFork },
  { path: "/risk-heatmap", label: "Risk Heatmap", icon: Flame },
  { path: "/decision-timeline", label: "Decision Timeline", icon: Clock },
  { path: "/analytics", label: "Analytics & Health", icon: LineChart },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-16 md:w-60 border-r border-slate-800/80 bg-panel/95 backdrop-blur-md flex flex-col justify-between p-2.5 z-20 shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-mono uppercase text-hud-secondary tracking-wider hidden md:block">
          Subsystems
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/40 shadow-cyan-glow font-bold"
                    : "text-hud-secondary hover:text-hud-text hover:bg-slate-900/80"
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              <span className="hidden md:inline truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer system details */}
      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-900 text-[11px] font-mono text-hud-secondary hidden md:block">
        <div className="flex justify-between items-center mb-1">
          <span>Engine Status</span>
          <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-pulse" />
        </div>
        <div className="text-[10px] text-slate-500">SIH 2026 Autonomy Framework</div>
      </div>
    </aside>
  );
};
