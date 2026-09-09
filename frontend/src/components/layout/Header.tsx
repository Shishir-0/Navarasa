import React, { useState } from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { PerformanceHUD } from "../common/PerformanceHUD";
import { LiveClockWidget } from "../common/LiveClockWidget";
import { ExportSession } from "../common/ExportSession";
import { ScenarioCardGrid, SCENARIO_BENCHMARKS } from "./ScenarioCardGrid";
import { Activity, Compass, Radio, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

export const Header: React.FC = () => {
  const { latestFrame, isConnected, activeScenarioId } = useTelemetryStore();
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);

  const activeScenario = SCENARIO_BENCHMARKS.find((s) => s.id === activeScenarioId) || SCENARIO_BENCHMARKS[0];

  return (
    <>
      <header className="h-16 px-4 flex items-center justify-between z-30 sticky top-0 font-sans border-b border-white/5 bg-[#05070B]/80 backdrop-blur-2xl">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-vision-accent via-blue-500 to-indigo-600 flex items-center justify-center shadow-vision-glass">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white font-sans">
                NAVRASA
              </h1>
              <span className="text-[10px] uppercase font-mono font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-vision-accent">
                VisionOS v4
              </span>
            </div>
            <p className="text-[10px] text-hud-secondary tracking-normal hidden lg:block font-sans">
              Neural Adaptive Vehicular Reasoning with Anticipatory Scene Awareness
            </p>
          </div>
        </div>

        {/* Center: Scenario Selector Trigger & Clock */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsScenarioModalOpen(true)}
            className="vision-capsule flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-white cursor-pointer group"
          >
            <Compass className="w-3.5 h-3.5 text-vision-accent group-hover:rotate-45 transition-transform" />
            <div className="text-left">
              <span className="text-[11px] font-medium text-white truncate max-w-[160px] inline-block">
                {activeScenario?.name}
              </span>
            </div>
          </button>

          <LiveClockWidget className="hidden md:flex vision-capsule border-white/10 rounded-full" />
        </div>

        {/* Right: Performance HUD, Session Export & Connection Badge */}
        <div className="flex items-center gap-3">
          <PerformanceHUD />
          <ExportSession className="hidden xl:flex" />

          <div
            className={clsx(
              "vision-capsule flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium",
              isConnected ? "text-vision-success" : "text-vision-accent"
            )}
            title={isConnected ? "Connected to FastAPI WebSocket" : "Running Standalone Client Simulation"}
          >
            <span className={clsx("w-1.5 h-1.5 rounded-full animate-pulse", isConnected ? "bg-vision-success" : "bg-vision-accent")} />
            <span className="hidden sm:inline">{isConnected ? "LIVE" : "SIM"}</span>
          </div>
        </div>
      </header>

      {/* Scenario Benchmark Selection Modal */}
      <AnimatePresence>
        {isScenarioModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-full max-w-5xl vision-elevated border border-white/10 rounded-3xl p-6 shadow-vision-elevated overflow-hidden relative max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-vision-accent/10 border border-vision-accent/20 text-vision-accent">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white font-sans flex items-center gap-2">
                      Indian Road Benchmark Scenarios
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-hud-secondary font-mono">
                        8 Scenarios
                      </span>
                    </h2>
                    <p className="text-xs text-hud-secondary font-sans mt-0.5">
                      Select an unstructured scenario to evaluate GNN negotiation, potential field risk, and CBF safety interventions.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsScenarioModalOpen(false)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
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
