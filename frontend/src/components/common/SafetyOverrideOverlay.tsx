import React, { useEffect, useState } from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { ShieldAlert, AlertOctagon, Zap, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const SafetyOverrideOverlay: React.FC = () => {
  const latestFrame = useTelemetryStore((state) => state.latestFrame);
  const isCbfActive = latestFrame?.control_command?.cbf_active ?? false;
  const cbfMargin = latestFrame?.control_command?.cbf_safety_margin ?? 4.5;
  const accel = latestFrame?.control_command?.acceleration ?? 0.0;
  const brake = latestFrame?.control_command?.brake ?? 0.0;

  const [showOverrideToast, setShowOverrideToast] = useState(false);
  const [lastTriggerTime, setLastTriggerTime] = useState<number>(0);

  useEffect(() => {
    if (isCbfActive) {
      setShowOverrideToast(true);
      setLastTriggerTime(Date.now());
      const timer = setTimeout(() => {
        setShowOverrideToast(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isCbfActive]);

  return (
    <>
      {/* 1. Screen Border Red Shockwave Glow (when CBF is active) */}
      <AnimatePresence>
        {isCbfActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 pointer-events-none z-40 border-4 border-cyber-crimson shadow-[inset_0_0_80px_rgba(255,0,85,0.45)]"
          >
            {/* Top Warning Banner Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyber-crimson to-transparent animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Floating Cinematic Emergency Toast */}
      <AnimatePresence>
        {showOverrideToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
          >
            <div className="flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-slate-950/95 border-2 border-cyber-crimson shadow-crimson-glow backdrop-blur-xl font-mono text-xs text-white max-w-xl">
              {/* Pulsing Icon */}
              <div className="p-2.5 rounded-xl bg-cyber-crimson/20 text-cyber-crimson border border-cyber-crimson/50 animate-bounce">
                <ShieldAlert className="w-6 h-6" />
              </div>

              {/* Text Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-cyber-crimson tracking-wider uppercase">
                    CBF Safety Barrier Override
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-cyber-crimson/30 text-white font-bold border border-cyber-crimson/60">
                    NAGUMO INVARIANT ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-sans leading-tight">
                  Forward invariant boundary violated. Kinetic brake authority active to guarantee zero collision envelope.
                </p>
                <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-0.5">
                  <span>Brake: <strong className="text-cyber-crimson font-bold">{(brake * 100).toFixed(0)}%</strong></span>
                  <span>Safety Margin: <strong className="text-white">{cbfMargin.toFixed(2)}m ≥ 0</strong></span>
                  <span>Authority: <strong className="text-cyber-amber">-6.0 m/s² (Max)</strong></span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
