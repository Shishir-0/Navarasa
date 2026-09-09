import React, { useEffect, useState } from "react";
import { Activity, ShieldCheck, Cpu, Compass, Zap, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSoundEffects } from "../../hooks/useSoundEffects";

interface BootSequenceProps {
  onComplete: () => void;
}

export const BootSequence: React.FC<BootSequenceProps> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);
  const { playChime } = useSoundEffects();

  const steps = [
    { title: "NAVRASA Neural Autonomy", subtitle: "Apple Vision Pro Edition v4.0", icon: <Activity className="w-6 h-6 text-vision-accent" /> },
    { title: "Initializing Sensor Fusion", subtitle: "LiDAR, FMCW Radar & CTRV UKF Active", icon: <Zap className="w-6 h-6 text-vision-accent" /> },
    { title: "Building Road Intent Graph", subtitle: "PyTorch RGAT Relational Reasoning Armed", icon: <Compass className="w-6 h-6 text-vision-warning" /> },
    { title: "Future Road Composer Online", subtitle: "Multi-Hypothesis Trajectory Forecasts Ready", icon: <Sparkles className="w-6 h-6 text-vision-success" /> },
    { title: "Control Barrier Function Armed", subtitle: "Nagumo Invariance Safety Guarantee Verified", icon: <ShieldCheck className="w-6 h-6 text-vision-success" /> },
  ];

  useEffect(() => {
    const timer1 = setTimeout(() => setStage(1), 400);
    const timer2 = setTimeout(() => setStage(2), 900);
    const timer3 = setTimeout(() => setStage(3), 1400);
    const timer4 = setTimeout(() => setStage(4), 1900);
    const timer5 = setTimeout(() => {
      playChime();
      setTimeout(onComplete, 400);
    }, 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onComplete, playChime]);

  const currentStep = steps[stage] || steps[0];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#05070B] vision-grid-ambient font-mono select-none"
    >
      <div className="flex flex-col items-center text-center p-8 max-w-md w-full">
        {/* Glowing Orb / Logo Icon */}
        <motion.div
          key={stage}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-20 h-20 rounded-3xl vision-elevated flex items-center justify-center mb-6 shadow-vision-elevated relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-vision-accent/20 via-transparent to-vision-success/20 animate-pulse-subtle" />
          {currentStep.icon}
        </motion.div>

        {/* Text Fade Transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-1.5 mb-8"
          >
            <h2 className="text-xl font-bold text-white tracking-wide font-sans">
              {currentStep.title}
            </h2>
            <p className="text-xs text-hud-secondary font-mono">
              {currentStep.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Minimalist VisionOS Progress Bar */}
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-vision-accent to-vision-success rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${((stage + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
};
