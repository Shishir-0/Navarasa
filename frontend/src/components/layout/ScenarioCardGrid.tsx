import React from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { usePlaybackStore } from "../../store/playbackStore";
import { 
  Compass, 
  AlertTriangle, 
  CloudRain, 
  Zap, 
  ShieldAlert, 
  Truck, 
  MapPin, 
  Check, 
  ChevronRight,
  Flame
} from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

export interface ScenarioCardItem {
  id: string;
  name: string;
  tagline: string;
  difficulty: "LEVEL 1" | "LEVEL 2" | "LEVEL 3" | "LEVEL 4" | "LEVEL 5";
  difficultyColor: "emerald" | "cyan" | "amber" | "crimson";
  trafficDensity: "LOW" | "MEDIUM" | "HIGH" | "CHAOTIC";
  weather: "CLEAR" | "OVERCAST" | "MONSOON RAIN" | "DUSK DUST";
  keyChallenge: string;
  icon: React.ReactNode;
}

export const SCENARIO_BENCHMARKS: ScenarioCardItem[] = [
  {
    id: "autorickshaw_cutin_blindspot",
    name: "Auto-Rickshaw Blindspot Cut-in",
    tagline: "Aggressive autorickshaw lane cut-in with occluded pedestrian crossing",
    difficulty: "LEVEL 4",
    difficultyColor: "crimson",
    trafficDensity: "HIGH",
    weather: "CLEAR",
    keyChallenge: "CBF Safety Barrier Intervention & Sudden Deceleration",
    icon: <Zap className="w-5 h-5 text-cyber-cyan" />,
  },
  {
    id: "unmarked_intersection_chaos",
    name: "Unmarked 4-Way Junction Chaos",
    tagline: "Unsignalized Indian intersection with multi-directional crossing flows",
    difficulty: "LEVEL 5",
    difficultyColor: "crimson",
    trafficDensity: "CHAOTIC",
    weather: "CLEAR",
    keyChallenge: "GNN Relational Intent Reasoning & Right-of-Way Negotiation",
    icon: <Compass className="w-5 h-5 text-cyber-amber" />,
  },
  {
    id: "cow_blockage_lateral_nudge",
    name: "Stationary Cattle Lateral Nudge",
    tagline: "Sacred cow blocking travel corridor requiring spatial nudging",
    difficulty: "LEVEL 3",
    difficultyColor: "amber",
    trafficDensity: "MEDIUM",
    weather: "CLEAR",
    keyChallenge: "Kinodynamic Hybrid A* Kinematic Nudge with Oncoming Traffic",
    icon: <AlertTriangle className="w-5 h-5 text-cyber-emerald" />,
  },
  {
    id: "market_bazaar_crowd",
    name: "Dense Bazaar & Pedestrian Flow",
    tagline: "Hyper-dense market lane with non-lane pedestrian crowds and cycles",
    difficulty: "LEVEL 5",
    difficultyColor: "crimson",
    trafficDensity: "CHAOTIC",
    weather: "DUSK DUST",
    keyChallenge: "Dynamic Repulsive Potential Field & Occlusion Shadows",
    icon: <Flame className="w-5 h-5 text-cyber-crimson" />,
  },
  {
    id: "wrong_way_twowheeler",
    name: "Wrong-Way Two-Wheeler Head-On",
    tagline: "Motorcycle driving against traffic direction on a single-lane road",
    difficulty: "LEVEL 4",
    difficultyColor: "amber",
    trafficDensity: "MEDIUM",
    weather: "CLEAR",
    keyChallenge: "TTC Horizon Shrinkage & Rapid Trajectory Evasion",
    icon: <Zap className="w-5 h-5 text-cyber-amber" />,
  },
  {
    id: "monsoon_rain_slick",
    name: "Monsoon Wet Surface Low-Friction",
    tagline: "Reduced tyre-road friction (μ=0.40) with standing water reflection",
    difficulty: "LEVEL 4",
    difficultyColor: "cyan",
    trafficDensity: "HIGH",
    weather: "MONSOON RAIN",
    keyChallenge: "Conservative CBF Invariant Boundary Expansion",
    icon: <CloudRain className="w-5 h-5 text-cyber-cyan" />,
  },
  {
    id: "highway_high_speed_overtake",
    name: "National Highway High-Speed Overtake",
    tagline: "Longitudinal cruise with high differential speed freight trucks",
    difficulty: "LEVEL 2",
    difficultyColor: "emerald",
    trafficDensity: "MEDIUM",
    weather: "CLEAR",
    keyChallenge: "Quintic Spline Jerk-Minimizing Smooth Lane Change",
    icon: <Truck className="w-5 h-5 text-cyber-emerald" />,
  },
  {
    id: "pothole_crater_avoidance",
    name: "Severe Monsoon Pothole Avoidance",
    tagline: "Deep localized crater obstacles requiring curvature-bounded evasions",
    difficulty: "LEVEL 3",
    difficultyColor: "cyan",
    trafficDensity: "LOW",
    weather: "OVERCAST",
    keyChallenge: "Curvature-Constrained Lateral Spline Optimization",
    icon: <MapPin className="w-5 h-5 text-cyber-cyan" />,
  },
];

interface ScenarioCardGridProps {
  onSelectScenario?: (scenarioId: string) => void;
  className?: string;
}

export const ScenarioCardGrid: React.FC<ScenarioCardGridProps> = ({ onSelectScenario, className }) => {
  const activeScenarioId = useTelemetryStore((state) => state.activeScenarioId);
  const setScenario = useTelemetryStore((state) => state.setScenario);
  const clearBuffer = useTelemetryStore((state) => state.clearBuffer);
  const setScrubberIndex = usePlaybackStore((state) => state.setScrubberIndex);

  const handleSelect = (scenario: ScenarioCardItem) => {
    setScenario(scenario.id);
    clearBuffer();
    setScrubberIndex(0);
    if (onSelectScenario) {
      onSelectScenario(scenario.id);
    }
  };

  const difficultyStyles = {
    emerald: "text-cyber-emerald border-cyber-emerald/40 bg-cyber-emerald/10",
    cyan: "text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10",
    amber: "text-cyber-amber border-cyber-amber/40 bg-cyber-amber/10",
    crimson: "text-cyber-crimson border-cyber-crimson/40 bg-cyber-crimson/10",
  };

  return (
    <div className={clsx("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {SCENARIO_BENCHMARKS.map((scen) => {
        const isSelected = activeScenarioId === scen.id;
        return (
          <motion.div
            key={scen.id}
            whileHover={{ scale: 1.02, translateY: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(scen)}
            className={clsx(
              "p-4 rounded-xl border font-mono transition-all duration-300 cursor-pointer relative overflow-hidden backdrop-blur-md flex flex-col justify-between group",
              isSelected
                ? "bg-panel/95 border-cyber-cyan shadow-cyan-glow ring-1 ring-cyber-cyan/50"
                : "bg-panel/60 border-slate-800 hover:border-slate-600 hover:bg-panel/85"
            )}
          >
            {/* Top Accent Strip */}
            <div
              className={clsx(
                "absolute top-0 left-0 right-0 h-1 transition-all",
                isSelected ? "bg-cyber-cyan" : "bg-transparent group-hover:bg-slate-700"
              )}
            />

            <div>
              {/* Header: Icon, Name & Selection Badge */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                  {scen.icon}
                </div>
                <span
                  className={clsx(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border",
                    difficultyStyles[scen.difficultyColor]
                  )}
                >
                  {scen.difficulty}
                </span>
              </div>

              {/* Title & Tagline */}
              <h4 className="text-sm font-bold text-white tracking-wide group-hover:text-cyber-cyan transition-colors line-clamp-1">
                {scen.name}
              </h4>
              <p className="text-[11px] text-hud-secondary mt-1 line-clamp-2 leading-relaxed font-sans">
                {scen.tagline}
              </p>
            </div>

            {/* Meta Tags Footer */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Density: <strong className="text-slate-200">{scen.trafficDensity}</strong></span>
                <span>Weather: <strong className="text-slate-200">{scen.weather}</strong></span>
              </div>
              <div className="text-[10px] text-cyber-cyan/90 truncate font-sans">
                ⚡ {scen.keyChallenge}
              </div>
            </div>

            {/* Selected Indicator */}
            {isSelected && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-cyber-cyan font-bold">
                <Check className="w-3.5 h-3.5" />
                ACTIVE
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
