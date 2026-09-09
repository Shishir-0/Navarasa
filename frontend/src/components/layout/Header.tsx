import React, { useState } from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { usePlaybackStore } from "../../store/playbackStore";
import { PerformanceHUD } from "../common/PerformanceHUD";
import { LiveClockWidget } from "../common/LiveClockWidget";
import { ExportSession } from "../common/ExportSession";
import { ScenarioCardGrid, SCENARIO_BENCHMARKS } from "./ScenarioCardGrid";
import {
  Activity,
  Compass,
  Radio,
  ShieldAlert,
  ShieldCheck,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

export const Header: React.FC = () => {
  const { latestFrame, isConnected, activeScenarioId } = useTelemetryStore();
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);

  const activeScenario = SCENARIO_BENCHMARKS.find((s) => s.id === activeScenarioId) || SCENARIO_BENCHMARKS[0];
  const cbfActive = latestFrame?.control_command?.cbf_active ?? false;

  return (
    <>
      <header className="h-16 border-b border-slate-800 bg-panel/95 backdrop-blur-md px-4 flex items-center justify-between z-30 sticky top-0 font-mono">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyber-cyan via-blue-600 to-indigo-700 flex items-center justify-center shadow-cyan-glow">
            <Activity className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-wider text-white">
                NAVRASA
              </h1>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyber-cyan/15 border border-cyber-cyan/40 text-cyber-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                v3.0 OPS CONSOLE
              </span>
            </div>
            <p className="text-[10px] text-hud-secondary tracking-tight hidden lg:block">
              Neural Adaptive Vehicular Reasoning with Anticipatory Scene Awareness
            </p>
          </div>
        </div>

        {/* Center: Scenario Selector Trigger & Clock */}
        <div className="flex items-center gap-3">
          {/* Interactive Scenario Trigger Button */}
          <button
            onClick={() => setIsScenarioModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-cyber-cyan text-xs text-white hover:bg-slate-800 transition-all shadow-sm group cursor-pointer"
          >
            <Compass className="w-4 h-4 text-cyber-cyan group-hover:rotate-45 transition-transform" />
            <div className="text-left">
              <div className="text-[9px] text-slate-400 uppercase font-sans">Scenario Benchmark</div>
              <div className="text-xs font-bold text-white truncate max-w-[170px]">
                {activeScenario?.name}
              </div>
            </div>
          </button>

          {/* Live Simulation Clock Widget */}
          <LiveClockWidget className="hidden md:flex" />
        </div>

        {/* Right: Performance HUD, Session Export & Connection Badge */}
        <div className="flex items-center gap-3">
          {/* Live Performance HUD */}
          <PerformanceHUD />

          {/* Export Session */}
          <ExportSession className="hidden xl:flex" />

          {/* Connection Status */}
          <div
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold",
              isConnected
                ? "bg-cyber-emerald/15 text-cyber-emerald border-cyber-emerald/40"
                : "bg-cyber-cyan/10 text-cyber-cyan border-cyber-cyan/30"
            )}
            title={isConnected ? "Connected to FastAPI WebSocket" : "Running Standalone Client Simulation"}
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">{isConnected ? "ONLINE" : "SIM"}</span>
          </div>
        </div>
      </header>

      {/* Scenario Benchmark Selection Modal */}
      <AnimatePresence>
        {isScenarioModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-5xl bg-panel-bg border border-slate-700 rounded-2xl p-6 shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                      Indian Road Benchmark Scenarios
                      <span className="text-xs px-2 py-0.5 rounded bg-cyber-cyan/20 text-cyber-cyan font-normal">
                        8 Scenarios Available
                      </span>
                    </h2>
                    <p className="text-xs text-hud-secondary font-sans mt-0.5">
                      Select an unstructured scenario to evaluate GNN negotiation, potential field risk, and CBF safety interventions.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsScenarioModalOpen(false)}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scenario Cards Grid */}
              <div className="flex-1 overflow-y-auto pr-1">
                <ScenarioCardGrid
                  onSelectScenario={() => setIsScenarioModalOpen(false)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
