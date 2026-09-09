import React from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { usePlaybackStore } from "../../store/playbackStore";
import {
  Play,
  Pause,
  RotateCcw,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
} from "lucide-react";
import { clsx } from "clsx";

export const Header: React.FC = () => {
  const { latestFrame, isConnected, activeScenarioId, setScenario, scenarios } = useTelemetryStore();
  const { isPlaying, togglePlay } = usePlaybackStore();

  const cbfActive = latestFrame?.control_command?.cbf_active ?? false;
  const fps = latestFrame?.metrics?.fps ?? 0;
  const latency = latestFrame?.metrics?.total_pipeline_latency_ms ?? 0;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-panel/95 backdrop-blur-md px-4 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center shadow-cyan-glow">
          <Activity className="w-5 h-5 text-slate-950 font-bold" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold font-mono tracking-wider text-hud-text">
              NAVRASA
            </h1>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
              v2.0 MISSION CONTROL
            </span>
          </div>
          <p className="text-[11px] text-hud-secondary font-mono tracking-tight hidden sm:block">
            Neural Adaptive Vehicular Reasoning with Anticipatory Scene Awareness
          </p>
        </div>
      </div>

      {/* Center Controls: Scenario Selector & Playback */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1">
          <select
            value={activeScenarioId}
            onChange={(e) => setScenario(e.target.value)}
            className="bg-transparent text-xs font-mono text-hud-text px-2 py-1 outline-none cursor-pointer"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id} className="bg-panel text-hud-text">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={togglePlay}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all duration-200 border",
            isPlaying
              ? "bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/40 hover:bg-cyber-cyan/25"
              : "bg-amber-500/15 text-cyber-amber border-amber-500/40 hover:bg-amber-500/25"
          )}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isPlaying ? "LIVE" : "PAUSED"}</span>
        </button>
      </div>

      {/* Right Stats: CBF Shield status, FPS, Latency, Connection */}
      <div className="flex items-center gap-3">
        {/* CBF Status Badge */}
        <div
          className={clsx(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all duration-300",
            cbfActive
              ? "bg-cyber-crimson/20 border-cyber-crimson text-cyber-crimson animate-pulse shadow-crimson-glow"
              : "bg-cyber-emerald/15 border-cyber-emerald/40 text-cyber-emerald shadow-emerald-glow"
          )}
        >
          {cbfActive ? (
            <>
              <ShieldAlert className="w-4 h-4" />
              <span>CBF INTERVENTION</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>CBF NOMINAL</span>
            </>
          )}
        </div>

        {/* FPS & Latency */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-hud-secondary">
          <span>
            FPS: <strong className="text-cyber-cyan">{fps.toFixed(1)}</strong>
          </span>
          <span className="text-slate-700">|</span>
          <span>
            Latency: <strong className="text-cyber-emerald">{latency.toFixed(1)}ms</strong>
          </span>
        </div>

        {/* Live Network Gateway Status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono">
          <Radio
            className={clsx(
              "w-3.5 h-3.5",
              isConnected ? "text-cyber-emerald animate-pulse" : "text-amber-400"
            )}
          />
          <span className={isConnected ? "text-cyber-emerald" : "text-amber-400"}>
            {isConnected ? "WS STREAM" : "LOCAL SIM"}
          </span>
        </div>
      </div>
    </header>
  );
};
