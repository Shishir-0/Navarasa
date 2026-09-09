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
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { path: "/mission-control", label: "Mission Control", icon: LayoutDashboard },
  { path: "/digital-twin", label: "3D Digital Twin", icon: Boxes },
  { path: "/road-intent-graph", label: "Road Intent Graph", icon: Network },
  { path: "/future-composer", label: "Future Composer", icon: GitFork },
  { path: "/risk-heatmap", label: "Risk Heatmap", icon: Flame },
  { path: "/decision-timeline", label: "Decision Timeline", icon: Clock },
  { path: "/analytics", label: "Analytics & Health", icon: LineChart },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-16 md:w-56 m-3 mr-0 rounded-3xl vision-glass flex flex-col justify-between p-2.5 z-20 shrink-0 font-sans shadow-vision-glass">
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-mono uppercase text-hud-secondary tracking-widest hidden md:block">
          Operations
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-medium transition-all duration-200 group relative",
                  isActive
                    ? "bg-white/10 text-white font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] border border-white/15"
                    : "text-hud-secondary hover:text-white hover:bg-white/5"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-vision-accent" : "opacity-70")} />
                  <span className="hidden md:inline truncate">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activePill"
                      className="absolute left-0 w-1 h-5 bg-vision-accent rounded-r-full hidden md:block"
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer system status */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-[11px] font-mono text-hud-secondary hidden md:block">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Autonomy Core</span>
          <span className="w-2 h-2 rounded-full bg-vision-success animate-pulse" />
        </div>
        <div className="text-[10px] text-white/80 font-sans">NAVRASA Engine v4.0</div>
      </div>
    </aside>
  );
};
