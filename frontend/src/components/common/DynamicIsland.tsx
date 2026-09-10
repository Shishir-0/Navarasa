import React, { useState, useEffect } from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { usePlaybackStore } from "../../store/playbackStore";
import { ShieldAlert, ShieldCheck, Zap, Radio, Compass, RotateCcw, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

import { useUIStore } from "../../store/uiStore";

export const DynamicIsland: React.FC = () => {
  const latestFrame = useTelemetryStore((state) => state.latestFrame);
  const activeScenarioId = useTelemetryStore((state) => state.activeScenarioId);
  const isConnected = useTelemetryStore((state) => state.isConnected);
  const isReplayMode = usePlaybackStore((state) => state.isReplayMode);
  const isJudgeMode = useUIStore((state) => state.isJudgeMode);

  const [expandedReason, setExpandedReason] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const cbfActive = latestFrame?.control_command?.cbf_active ?? false;
  const minTtc = latestFrame?.metrics?.min_ttc ?? 5.0;

  // Auto-expand on critical events or Judge Mode
  useEffect(() => {
    if (cbfActive) {
      setExpandedReason("cbf");
      const timer = setTimeout(() => setExpandedReason(null), 4000);
      return () => clearTimeout(timer);
    } else if (minTtc < 2.2) {
      setExpandedReason("conflict");
      const timer = setTimeout(() => setExpandedReason(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [cbfActive, minTtc]);

  const isExpanded = isHovered || expandedReason !== null || isJudgeMode;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto font-mono">
      <motion.div
        layout
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        transition={{ type: "spring", stiffness: 450, damping: 32 }}
        className={clsx(
          "rounded-full vision-elevated shadow-vision-island flex items-center justify-between transition-colors duration-300 border backdrop-blur-3xl overflow-hidden cursor-pointer",
          cbfActive
            ? "border-vision-danger/50 bg-slate-950/90 shadow-crimson-glow"
            : isExpanded
            ? "border-vision-accent/40 bg-slate-950/85"
            : "border-white/10 bg-slate-950/75 hover:border-white/20"
        )}
        style={{
          minHeight: isExpanded ? "52px" : "36px",
          paddingLeft: isExpanded ? "16px" : "12px",
          paddingRight: isExpanded ? "16px" : "12px",
        }}
      >
        {/* Nominal Compact State */}
        {!isExpanded && (
          <div className="flex items-center gap-2.5 text-xs">
            <span
              className={clsx(
                "w-2 h-2 rounded-full",
                cbfActive ? "bg-vision-danger animate-ping" : isConnected ? "bg-vision-success" : "bg-vision-accent"
              )}
            />
            <span className="font-sans font-medium text-white tracking-tight">
              {cbfActive ? "Safety Barrier Intervening" : isReplayMode ? "Replay Active" : "NAVRASA Online"}
            </span>
            <span className="text-[10px] text-hud-secondary opacity-60">
              {cbfActive ? "OVERRIDE" : "20 Hz"}
            </span>
          </div>
        )}

        {/* Expanded Rich State */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-4 text-xs"
          >
            {/* Left Status Icon */}
            <div
              className={clsx(
                "p-1.5 rounded-full flex items-center justify-center",
                cbfActive ? "bg-vision-danger/20 text-vision-danger" : "bg-vision-accent/20 text-vision-accent"
              )}
            >
              {cbfActive ? <ShieldAlert className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
            </div>

            {/* Middle Message */}
            <div className="flex flex-col text-left">
              <span className="font-sans font-bold text-white tracking-tight text-xs">
                {cbfActive
                  ? "Control Barrier Function Active"
                  : isReplayMode
                  ? "Replay Inspector Active"
                  : "NAVRASA Autonomous Pipeline"}
              </span>
              <span className="text-[10px] text-hud-secondary font-sans">
                {cbfActive
                  ? `Decel: ${(latestFrame?.control_command?.brake ?? 0) > 0 ? "Braking" : "Authority"} | Margin: ${(latestFrame?.control_command?.cbf_safety_margin ?? 4.5).toFixed(1)}m`
                  : `Scenario: ${activeScenarioId} | Latency: ${(latestFrame?.metrics?.total_pipeline_latency_ms ?? 35).toFixed(1)}ms`}
              </span>
            </div>

            {/* Right Status Badge */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
              <span
                className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                  cbfActive
                    ? "bg-vision-danger/20 text-vision-danger border border-vision-danger/40"
                    : "bg-vision-success/20 text-vision-success border border-vision-success/40"
                )}
              >
                {cbfActive ? "SHIELDED" : "NOMINAL"}
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
