import React from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { usePlaybackStore } from "../../store/playbackStore";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";

export const ReplayBar: React.FC = () => {
  const { frameBuffer, latestFrame } = useTelemetryStore();
  const {
    isPlaying,
    isReplayMode,
    playbackSpeed,
    scrubberIndex,
    togglePlay,
    setReplayMode,
    setPlaybackSpeed,
    setScrubberIndex,
    stepForward,
    stepBackward,
  } = usePlaybackStore();

  const totalFrames = frameBuffer.length;
  const currentFrame = isReplayMode && frameBuffer[scrubberIndex]
    ? frameBuffer[scrubberIndex]
    : latestFrame;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setScrubberIndex(val);
    if (!isReplayMode) setReplayMode(true);
  };

  const handleLiveJump = () => {
    setReplayMode(false);
    setScrubberIndex(totalFrames - 1);
  };

  return (
    <div className="h-12 border-t border-slate-800/80 bg-panel/95 backdrop-blur-md px-4 flex items-center justify-between text-xs font-mono z-30">
      {/* Play / Step / Live Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={stepBackward}
          disabled={totalFrames === 0}
          className="p-1.5 rounded hover:bg-slate-800 text-hud-secondary hover:text-hud-text disabled:opacity-40"
          title="Step Backward (1 frame)"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className={clsx(
            "p-1.5 rounded text-slate-950 font-bold transition-all",
            isPlaying ? "bg-cyber-cyan hover:bg-cyan-300" : "bg-cyber-amber hover:bg-amber-300"
          )}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={() => stepForward(totalFrames - 1)}
          disabled={totalFrames === 0}
          className="p-1.5 rounded hover:bg-slate-800 text-hud-secondary hover:text-hud-text disabled:opacity-40"
          title="Step Forward (1 frame)"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed Selector */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 ml-2">
          {[0.5, 1.0, 2.0].map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={clsx(
                "px-1.5 py-0.5 rounded text-[10px]",
                playbackSpeed === speed
                  ? "bg-cyber-cyan/20 text-cyber-cyan font-bold"
                  : "text-hud-secondary hover:text-hud-text"
              )}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Center Timeline Scrubber */}
      <div className="flex-1 max-w-xl mx-6 flex items-center gap-3">
        <span className="text-[11px] text-hud-secondary shrink-0">
          Frame: #{currentFrame?.frame_id ?? 0}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, totalFrames - 1)}
          value={isReplayMode ? scrubberIndex : Math.max(0, totalFrames - 1)}
          onChange={handleSliderChange}
          disabled={totalFrames === 0}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
        />
        <span className="text-[11px] text-hud-secondary shrink-0">
          t = {currentFrame?.timestamp.toFixed(2) ?? "0.00"}s
        </span>
      </div>

      {/* Right Mode Indicator */}
      <div className="flex items-center gap-3">
        {isReplayMode ? (
          <button
            onClick={handleLiveJump}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 border border-amber-500/50 text-cyber-amber text-[11px] font-bold hover:bg-amber-500/30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>REPLAY MODE (CLICK FOR LIVE)</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-cyber-emerald text-[11px] font-bold">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span>LIVE SYNC</span>
          </div>
        )}
      </div>
    </div>
  );
};
