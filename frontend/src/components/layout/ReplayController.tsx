import React, { useEffect, useRef } from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { usePlaybackStore } from "../../store/playbackStore";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  FastForward, 
  Sliders, 
  Clock, 
  Radio, 
  ShieldAlert 
} from "lucide-react";
import { clsx } from "clsx";

interface ReplayControllerProps {
  className?: string;
}

export const ReplayController: React.FC<ReplayControllerProps> = ({ className }) => {
  const frameBuffer = useTelemetryStore((state) => state.frameBuffer);
  const latestFrame = useTelemetryStore((state) => state.latestFrame);
  
  const {
    isPlaying,
    isReplayMode,
    playbackSpeed,
    scrubberIndex,
    togglePlay,
    setPlaying,
    setReplayMode,
    setPlaybackSpeed,
    setScrubberIndex,
    stepForward,
    stepBackward,
  } = usePlaybackStore();

  const totalFrames = frameBuffer.length;
  const activeFrame = isReplayMode && totalFrames > 0
    ? frameBuffer[Math.min(scrubberIndex, totalFrames - 1)]
    : latestFrame;

  const activeTimestamp = activeFrame?.timestamp ?? 0.0;
  const isCbf = activeFrame?.control_command?.cbf_active ?? false;

  // Animation playback interval timer when in replay mode
  useEffect(() => {
    let intervalId: any = null;
    if (isPlaying && isReplayMode && totalFrames > 1) {
      const stepMs = Math.max(20, 50 / playbackSpeed);
      intervalId = setInterval(() => {
        setScrubberIndex((scrubberIndex + 1) % totalFrames);
      }, stepMs);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, isReplayMode, playbackSpeed, scrubberIndex, totalFrames, setScrubberIndex]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setScrubberIndex(val);
    setReplayMode(true);
  };

  const handleGoLive = () => {
    setReplayMode(false);
    setPlaying(true);
    setScrubberIndex(Math.max(0, totalFrames - 1));
  };

  return (
    <div
      className={clsx(
        "p-3 rounded-xl border bg-panel/90 backdrop-blur-xl font-mono text-xs shadow-panel-glow flex flex-col md:flex-row items-center justify-between gap-4 select-none",
        isReplayMode ? "border-cyber-amber/50" : "border-slate-800",
        className
      )}
    >
      {/* 1. Play / Step Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={stepBackward}
          disabled={totalFrames === 0}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 transition-colors"
          title="Step Backward (1 frame)"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className={clsx(
            "px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-md",
            isPlaying
              ? "bg-cyber-cyan text-brand-bg hover:brightness-110 shadow-cyan-glow"
              : "bg-slate-800 text-white hover:bg-slate-700"
          )}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
        </button>

        <button
          onClick={() => stepForward(Math.max(0, totalFrames - 1))}
          disabled={totalFrames === 0}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-40 transition-colors"
          title="Step Forward (1 frame)"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed Selector Pills */}
        <div className="flex items-center gap-1 ml-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {[0.5, 1.0, 2.0, 5.0].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={clsx(
                "px-2 py-0.5 rounded text-[10px] font-bold transition-colors",
                playbackSpeed === spd
                  ? "bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40"
                  : "text-slate-400 hover:text-white"
              )}
            >
              {spd}×
            </button>
          ))}
        </div>
      </div>

      {/* 2. Timeline Scrubber Progress */}
      <div className="flex-1 w-full flex items-center gap-3">
        <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap">
          T+{activeTimestamp.toFixed(2)}s
        </span>

        <input
          type="range"
          min={0}
          max={Math.max(0, totalFrames - 1)}
          value={isReplayMode ? scrubberIndex : Math.max(0, totalFrames - 1)}
          onChange={handleSliderChange}
          disabled={totalFrames <= 1}
          className="flex-1 accent-cyber-cyan bg-slate-800 h-2 rounded-lg cursor-pointer"
        />

        <span className="text-[11px] text-slate-400 whitespace-nowrap">
          Frame #{activeFrame?.frame_id ?? 0} <span className="text-slate-600">/ {totalFrames}</span>
        </span>
      </div>

      {/* 3. Live Mode Indicator & Quick Jump Button */}
      <div className="flex items-center gap-2">
        {isCbf && (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-cyber-crimson/20 text-cyber-crimson border border-cyber-crimson/40 animate-pulse font-bold">
            <ShieldAlert className="w-3.5 h-3.5" />
            CBF ACTIVE
          </span>
        )}

        {isReplayMode ? (
          <button
            onClick={handleGoLive}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/50 font-bold text-xs hover:bg-cyber-amber/30 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RETURN TO LIVE
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyber-emerald/15 text-cyber-emerald border border-cyber-emerald/40 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            LIVE TELEMETRY
          </div>
        )}
      </div>
    </div>
  );
};
