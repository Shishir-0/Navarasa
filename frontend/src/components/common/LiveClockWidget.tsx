import React, { useState, useEffect } from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { Clock, Radio } from "lucide-react";
import { clsx } from "clsx";

export const LiveClockWidget: React.FC<{ className?: string }> = ({ className }) => {
  const latestFrame = useTelemetryStore((state) => state.latestFrame);
  const [realTime, setRealTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setRealTime(now.toTimeString().split(" ")[0]);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const simTime = latestFrame?.timestamp ?? 0.0;
  const frameId = latestFrame?.frame_id ?? 0;

  return (
    <div
      className={clsx(
        "flex items-center gap-3 px-3 py-1 rounded-lg border border-slate-800 bg-panel/80 backdrop-blur-md font-mono text-xs text-slate-300",
        className
      )}
    >
      <div className="flex items-center gap-1 text-cyber-cyan">
        <Clock className="w-3.5 h-3.5" />
        <span className="font-bold">{realTime || "--:--:--"}</span>
      </div>

      <span className="text-slate-700">|</span>

      <div className="flex items-center gap-1 text-slate-300">
        <span className="text-[10px] text-slate-500 uppercase">SIM:</span>
        <span className="text-cyber-emerald font-bold">T+{simTime.toFixed(2)}s</span>
      </div>

      <span className="text-slate-700">|</span>

      <div className="text-[11px] text-slate-400">
        #{frameId}
      </div>
    </div>
  );
};
