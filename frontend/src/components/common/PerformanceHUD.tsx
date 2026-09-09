import React, { useEffect, useState, useRef } from "react";
import { Activity, Zap } from "lucide-react";
import { clsx } from "clsx";

export const PerformanceHUD: React.FC = () => {
  const [fps, setFps] = useState<number>(60);
  const [frameTimeMs, setFrameTimeMs] = useState<number>(16.6);
  const [status, setStatus] = useState<"STABLE" | "OPTIMAL" | "HEAVY">("OPTIMAL");

  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    let count = 0;
    const updateLoop = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (delta > 0) {
        frameTimesRef.current.push(delta);
        if (frameTimesRef.current.length > 60) {
          frameTimesRef.current.shift();
        }
      }

      // Update state every 15 frames to prevent excessive React state churn
      count++;
      if (count % 15 === 0 && frameTimesRef.current.length > 0) {
        const avgDelta =
          frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        const currentFps = Math.round(1000 / avgDelta);
        setFps(Math.min(144, currentFps));
        setFrameTimeMs(parseFloat(avgDelta.toFixed(1)));

        if (currentFps >= 50) {
          setStatus("OPTIMAL");
        } else if (currentFps >= 30) {
          setStatus("STABLE");
        } else {
          setStatus("HEAVY");
        }
      }

      rafIdRef.current = requestAnimationFrame(updateLoop);
    };

    rafIdRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const statusColorMap = {
    OPTIMAL: "text-cyber-emerald border-cyber-emerald/40 bg-cyber-emerald/10 shadow-[0_0_10px_rgba(0,255,136,0.2)]",
    STABLE: "text-cyber-cyan border-cyber-cyan/40 bg-cyber-cyan/10 shadow-[0_0_10px_rgba(0,240,255,0.2)]",
    HEAVY: "text-cyber-crimson border-cyber-crimson/40 bg-cyber-crimson/10 shadow-[0_0_10px_rgba(255,0,85,0.2)]",
  };

  const badgeColorMap = {
    OPTIMAL: "bg-cyber-emerald",
    STABLE: "bg-cyber-cyan",
    HEAVY: "bg-cyber-crimson",
  };

  return (
    <div
      className={clsx(
        "flex items-center gap-2.5 px-3 py-1 rounded-lg border font-mono text-xs transition-all duration-300 backdrop-blur-md",
        statusColorMap[status]
      )}
      title="Live 60-frame rolling rendering performance"
    >
      <div className="flex items-center gap-1.5">
        <span className={clsx("w-2 h-2 rounded-full animate-ping", badgeColorMap[status])} />
        <span className="font-bold tracking-wider">{fps} FPS</span>
      </div>

      <span className="text-hud-secondary opacity-40">|</span>

      <div className="flex items-center gap-1 text-[11px] text-hud-secondary">
        <Activity className="w-3 h-3 opacity-75" />
        <span>{frameTimeMs}ms</span>
      </div>

      <span className="text-hud-secondary opacity-40">|</span>

      <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-black/40">
        {status}
      </span>
    </div>
  );
};
