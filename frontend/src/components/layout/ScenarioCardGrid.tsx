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
  Flame,
  Activity,
  Navigation
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
  weather: "CLEAR" | "OVERCAST" | "MONSOON RAIN" | "DUSK DUST" | "FOG";
  keyChallenge: string;
  icon: React.ReactNode;
}

export const SCENARIO_BENCHMARKS: ScenarioCardItem[] = [
  {
    id: "market",
    name: "Crowded Market Street",
    tagline: "Dense Indian market street with pedestrians crossing and weaving motorcycles",
    difficulty: "LEVEL 4",
    difficultyColor: "crimson",
    trafficDensity: "CHAOTIC",
    weather: "CLEAR",
    keyChallenge: "Multi-Actor Tracking & Motorcycle Weave Anticipation",
    icon: <Zap className="w-5 h-5 text-neon-cyan" />,
  },
  {
    id: "village",
    name: "Unmarked Village Road",
    tagline: "Narrow rural corridor with pedestrian group in road and oncoming tractor",
    difficulty: "LEVEL 3",
    difficultyColor: "amber",
    trafficDensity: "MEDIUM",
    weather: "CLEAR",
    keyChallenge: "Kinodynamic Hybrid A* Nudging & Corridor Boundary Buffering",
    icon: <MapPin className="w-5 h-5 text-emerald-400" />,
  },
  {
    id: "highway",
    name: "High-Speed Highway Merge",
    tagline: "Arterial highway with high closing velocity delta and dual merge negotiation",
    difficulty: "LEVEL 4",
    difficultyColor: "cyan",
    trafficDensity: "HIGH",
    weather: "OVERCAST",
    keyChallenge: "Future Road Composer (FRC) Top-3 Trajectory Estimation",
    icon: <Navigation className="w-5 h-5 text-blue-400" />,
  },
  {
    id: "junction",
    name: "Unsignalized 4-Way Junction",
    tagline: "Unregulated cross-junction with abrupt auto passenger drop stop",
    difficulty: "LEVEL 5",
    difficultyColor: "crimson",
    trafficDensity: "CHAOTIC",
    weather: "CLEAR",
    keyChallenge: "Road Intent Graph Relational Reasoning & Right-of-Way Negotiation",
    icon: <Compass className="w-5 h-5 text-amber-400" />,
  },
  {
    id: "rain",
    name: "Monsoon Rain & Fog Occlusion",
    tagline: "Wet road surface (mu=0.45) with dense spray and late-emerging fog pedestrian",
    difficulty: "LEVEL 4",
    difficultyColor: "cyan",
    trafficDensity: "MEDIUM",
    weather: "MONSOON RAIN",
    keyChallenge: "UKF Covariance Expansion & Safety-Critical Braking Margin",
    icon: <CloudRain className="w-5 h-5 text-cyan-300" />,
  },
  {
    id: "cattle",
    name: "Stationary Cattle Lane Blockage",
    tagline: "Stationary cow blocking travel corridor requiring spatial nudge against oncoming bus",
    difficulty: "LEVEL 3",
    difficultyColor: "amber",
    trafficDensity: "MEDIUM",
    weather: "CLEAR",
    keyChallenge: "CBF Invariance Safety Barrier & Kinodynamic Spline Optimization",
    icon: <Truck className="w-5 h-5 text-amber-400" />,
  },
  {
    id: "wrong_way",
    name: "Wrong-Way Vehicle Avoidance",
    tagline: "Head-on two-wheeler oncoming in ego travel lane",
    difficulty: "LEVEL 5",
    difficultyColor: "crimson",
    trafficDensity: "HIGH",
    weather: "DUSK DUST",
    keyChallenge: "Emergency CBF Barrier Activation & Evasive Steering",
    icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
  },
  {
    id: "pothole",
    name: "Pothole & Degraded Road Swerve",
    tagline: "Severe road surface anomalies requiring comfort-bounded lateral swerving",
    difficulty: "LEVEL 3",
    difficultyColor: "emerald",
    trafficDensity: "LOW",
    weather: "CLEAR",
    keyChallenge: "Quintic Spline Optimizer Swerve Trajectory & Risk Contours",
    icon: <Activity className="w-5 h-5 text-emerald-400" />,
  },
  {
    id: "autorickshaw_cutin_blindspot",
    name: "Auto-Rickshaw Sudden Cut-in",
    tagline: "Aggressive autorickshaw cut-in with occluded pedestrian crossing",
    difficulty: "LEVEL 4",
    difficultyColor: "crimson",
    trafficDensity: "HIGH",
    weather: "CLEAR",
    keyChallenge: "CBF Safety Barrier Intervention & Sudden Deceleration",
    icon: <Zap className="w-5 h-5 text-neon-cyan" />,
  },
];

export const ScenarioCardGrid: React.FC<{
  onSelect?: (id: string) => void;
  onSelectScenario?: () => void;
}> = ({ onSelect, onSelectScenario }) => {
  const { activeScenarioId, setScenario } = useTelemetryStore();
  const { resetReplay } = usePlaybackStore();

  const handleSelect = (id: string) => {
    setScenario(id);
    resetReplay();
    if (onSelect) onSelect(id);
    if (onSelectScenario) onSelectScenario();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {SCENARIO_BENCHMARKS.map((scen, idx) => {
        const isSelected = activeScenarioId === scen.id;

        return (
          <motion.div
            key={scen.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            onClick={() => handleSelect(scen.id)}
            className={clsx(
              "group relative flex flex-col justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 border backdrop-blur-xl overflow-hidden",
              isSelected
                ? "bg-space-900/90 border-neon-cyan/80 ring-1 ring-neon-cyan/40 shadow-neon-cyan/15 shadow-xl scale-[1.02]"
                : "bg-space-950/60 border-white/10 hover:border-white/25 hover:bg-space-900/50"
            )}
          >
            {/* Top Row: Icon & Status Badge */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div
                className={clsx(
                  "p-2.5 rounded-xl border transition-all",
                  isSelected
                    ? "bg-neon-cyan/20 border-neon-cyan/40 shadow-inner"
                    : "bg-white/5 border-white/10 group-hover:bg-white/10"
                )}
              >
                {scen.icon}
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={clsx(
                    "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border",
                    scen.difficultyColor === "crimson"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : scen.difficultyColor === "cyan"
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                      : scen.difficultyColor === "amber"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  )}
                >
                  {scen.difficulty}
                </span>

                {isSelected && (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-neon-cyan text-space-950">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
            </div>

            {/* Title & Tagline */}
            <div className="flex flex-col mb-4">
              <h3 className="font-sans font-bold text-white text-sm group-hover:text-neon-cyan transition-colors line-clamp-1">
                {scen.name}
              </h3>
              <p className="text-xs text-white/60 font-sans mt-1 line-clamp-2 leading-relaxed">
                {scen.tagline}
              </p>
            </div>

            {/* Bottom Metadata & Challenge */}
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2 text-[11px] font-mono text-white/70">
              <div className="flex items-center justify-between">
                <span className="text-white/40">Density:</span>
                <span className="font-semibold text-white/90">{scen.trafficDensity}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Weather:</span>
                <span className="font-semibold text-white/90">{scen.weather}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-white/80 line-clamp-1">
                ⚡ {scen.keyChallenge}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
