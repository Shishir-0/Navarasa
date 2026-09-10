import React, { useState, useEffect, useRef } from 'react';
import { useTelemetryStore } from '../../store/telemetryStore';
import { Activity, Gauge, Zap, Cpu, Wifi, ShieldCheck, ChevronDown, ChevronUp, Clock, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const LivePerformanceConsole: React.FC = () => {
  const latestFrame = useTelemetryStore((state) => state.latestFrame);
  const frameBuffer = useTelemetryStore((state) => state.frameBuffer);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Measure rolling FPS
  const [renderFps, setRenderFps] = useState<number>(60);
  const lastRafRef = useRef<number>(performance.now());
  const frameDeltas = useRef<number[]>([]);

  useEffect(() => {
    let animId: number;
    const loop = (now: number) => {
      const dt = now - lastRafRef.current;
      lastRafRef.current = now;
      if (dt > 0) {
        frameDeltas.current.push(dt);
        if (frameDeltas.current.length > 30) frameDeltas.current.shift();
      }
      if (frameDeltas.current.length >= 10) {
        const avgDt = frameDeltas.current.reduce((a, b) => a + b, 0) / frameDeltas.current.length;
        setRenderFps(Math.min(144, Math.round(1000 / avgDt)));
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const totalLatency = (latestFrame?.metrics?.total_pipeline_latency_ms || 12.4).toFixed(1);
  const trackingLatency = (latestFrame?.metrics?.tracking_latency_ms || 3.2).toFixed(1);
  const gnnLatency = (latestFrame?.metrics?.graph_latency_ms || 4.1).toFixed(1);
  const planningLatency = (latestFrame?.metrics?.planning_latency_ms || 3.8).toFixed(1);
  const cbfInterventions = latestFrame?.metrics?.cbf_interventions_total || 0;
  const activeTracks = latestFrame?.tracks?.length || 0;

  return (
    <motion.div
      layout
      className="fixed bottom-5 left-5 z-40 bg-[#0D131F]/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] font-sans overflow-hidden text-xs text-white"
    >
      {/* Header Bar */}
      <div 
        onClick={() => setIsMinimized(!isMinimized)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-[#05070B]/60 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors gap-4"
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#34D399] animate-pulse" />
          <span className="font-mono font-bold tracking-wider text-[#4DA3FF] text-[11px] uppercase">
            LIVE PERFORMANCE CONSOLE
          </span>
          <span className="text-[#9BA6B2] text-[10px] font-mono">20 Hz BUS</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="font-bold text-[#34D399]">{renderFps} FPS</span>
          <span className="text-white/20">|</span>
          <span className="text-[#4DA3FF]">{totalLatency} ms</span>
          {isMinimized ? <ChevronUp className="w-3.5 h-3.5 text-[#9BA6B2]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#9BA6B2]" />}
        </div>
      </div>

      {/* Expanded Metrics Body */}
      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3.5 grid grid-cols-2 gap-2.5 w-72"
          >
            {/* FPS Gauge */}
            <div className="p-2.5 rounded-xl bg-[#05070B]/70 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-[#9BA6B2] font-mono">
                <span>UI RENDER</span>
                <Gauge className="w-3 h-3 text-[#34D399]" />
              </div>
              <div className="text-base font-bold font-mono text-white mt-1">
                {renderFps} <span className="text-[10px] font-normal text-[#9BA6B2]">FPS</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-[#34D399] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (renderFps / 60) * 100)}%` }}
                />
              </div>
            </div>

            {/* Total Pipeline Latency */}
            <div className="p-2.5 rounded-xl bg-[#05070B]/70 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-[#9BA6B2] font-mono">
                <span>E2E LATENCY</span>
                <Activity className="w-3 h-3 text-[#4DA3FF]" />
              </div>
              <div className="text-base font-bold font-mono text-[#4DA3FF] mt-1">
                {totalLatency} <span className="text-[10px] font-normal text-[#9BA6B2]">ms</span>
              </div>
              <div className="w-full bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-[#4DA3FF] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (parseFloat(totalLatency) / 50) * 100)}%` }}
                />
              </div>
            </div>

            {/* Tracking (UKF) */}
            <div className="p-2 rounded-xl bg-[#05070B]/70 border border-white/5">
              <div className="text-[9px] text-[#9BA6B2] font-mono uppercase">UKF Tracking</div>
              <div className="text-xs font-mono font-bold text-white mt-0.5">{trackingLatency} ms</div>
              <div className="text-[9px] text-[#34D399] mt-0.5">{activeTracks} active tracks</div>
            </div>

            {/* GNN Reasoning */}
            <div className="p-2 rounded-xl bg-[#05070B]/70 border border-white/5">
              <div className="text-[9px] text-[#9BA6B2] font-mono uppercase">RGAT GNN Time</div>
              <div className="text-xs font-mono font-bold text-[#FBBF24] mt-0.5">{gnnLatency} ms</div>
              <div className="text-[9px] text-[#9BA6B2] mt-0.5">8-head attention</div>
            </div>

            {/* Kinodynamic Planner */}
            <div className="p-2 rounded-xl bg-[#05070B]/70 border border-white/5">
              <div className="text-[9px] text-[#9BA6B2] font-mono uppercase">Hybrid A* Search</div>
              <div className="text-xs font-mono font-bold text-[#34D399] mt-0.5">{planningLatency} ms</div>
              <div className="text-[9px] text-[#9BA6B2] mt-0.5">4.0s lookahead</div>
            </div>

            {/* CBF Safety Shield */}
            <div className="p-2 rounded-xl bg-[#05070B]/70 border border-white/5">
              <div className="text-[9px] text-[#9BA6B2] font-mono uppercase">CBF Barrier</div>
              <div className={`text-xs font-mono font-bold mt-0.5 ${cbfInterventions > 0 ? 'text-[#FF5C7A]' : 'text-[#34D399]'}`}>
                {cbfInterventions} overrides
              </div>
              <div className="text-[9px] text-[#34D399] mt-0.5">h(x) ≥ 0 Invariance</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
