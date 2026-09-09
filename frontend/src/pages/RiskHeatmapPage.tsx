import React, { useState } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { Card } from '../components/common/Card';
import { MetricPill } from '../components/common/MetricPill';
import { Badge } from '../components/common/Badge';
import { RiskHeatmapPlot } from '../components/charts/RiskHeatmapPlot';
import { Flame, ShieldAlert, Activity, Info, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';

export const RiskHeatmapPage: React.FC = () => {
  const latestFrame = useTelemetryStore((state) => state.latestFrame);
  const [horizonSec, setHorizonSec] = useState<number>(3.0);
  const [showGradVectors, setShowGradVectors] = useState<boolean>(true);

  if (!latestFrame) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 font-mono">
        <Activity className="w-8 h-8 animate-spin mr-3 text-cyan" />
        Loading spatio-temporal risk field...
      </div>
    );
  }

  const riskMap = latestFrame.risk_map;
  const ego = latestFrame.ego_state;
  const tracks = latestFrame.tracks;

  const rawData = riskMap?.data || [];
  const maxRisk = rawData.length > 0 ? Math.max(...rawData.flat()) : 0.0;
  const avgRisk = rawData.length > 0 
    ? (rawData.flat().reduce((a: number, b: number) => a + b, 0) / (rawData.length * (rawData[0]?.length || 1))).toFixed(3)
    : '0.000';

  // Compute highest risk hotspots with associated actors
  const hotspots = tracks
    .map((track) => {
      const dx = track.position.x - ego.position.x;
      const dy = track.position.y - ego.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const relSpeed = Math.sqrt(
        Math.pow(track.velocity.x - ego.velocity.x, 2) + 
        Math.pow(track.velocity.y - ego.velocity.y, 2)
      );
      const ttc = relSpeed > 0.1 ? (dist / relSpeed).toFixed(1) : '∞';
      const actorRisk = Math.min(1.0, (1.0 / (dist + 0.1)) * (relSpeed * 0.2 + 0.5) * (track.hits / Math.max(1, track.hits + track.misses)));
      return {
        id: track.track_id,
        type: track.actor_type,
        x: track.position.x.toFixed(1),
        y: track.position.y.toFixed(1),
        dist: dist.toFixed(1),
        relSpeed: relSpeed.toFixed(1),
        ttc,
        risk: actorRisk,
      };
    })
    .sort((a, b) => b.risk - a.risk);

  return (
    <div className="flex flex-col gap-5 p-6 min-h-full overflow-y-auto">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-panel-border/50">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Flame className="w-6 h-6 text-crimson animate-pulse" />
              Spatio-Temporal Potential Field
            </h1>
            <Badge variant="danger">CBF ACTIVE</Badge>
            <Badge variant="outline">20 Hz UPDATE</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Dynamic repulsive artificial potential field representing collision probabilities, occlusion cones, and intent uncertainty.
          </p>
        </div>

        {/* Global Risk Metrics */}
        <div className="flex items-center gap-3">
          <MetricPill
            label="Peak Risk"
            value={maxRisk.toFixed(3)}
            unit="[0-1]"
            trend={maxRisk > 0.6 ? 'up' : 'stable'}
            status={maxRisk > 0.7 ? 'danger' : maxRisk > 0.4 ? 'warning' : 'success'}
          />
          <MetricPill
            label="Mean Potential"
            value={avgRisk}
            unit="U(q)"
            status="info"
          />
          <MetricPill
            label="Active Obstacles"
            value={tracks.length}
            unit="sources"
            status="neutral"
          />
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* Left 8 Cols: Interactive Plotly Heatmap Canvas */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <RiskHeatmapPlot height={480} />

          {/* Bottom Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-panel-bg/60 border border-panel-border rounded-xl text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-slate-300 font-mono">
                <Sliders className="w-3.5 h-3.5 text-cyan" />
                Horizon: <span className="text-cyan font-bold">{horizonSec.toFixed(1)}s</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={horizonSec}
                onChange={(e) => setHorizonSec(parseFloat(e.target.value))}
                className="w-32 accent-cyan bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showGradVectors}
                  onChange={(e) => setShowGradVectors(e.target.checked)}
                  className="accent-cyan rounded"
                />
                <span>Show ∇U Gradient Vectors</span>
              </label>
              <div className="flex items-center gap-1.5 text-emerald text-[11px] font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald animate-ping" />
                Hamilton-Jacobi-Bellman Safe Set
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Mathematical Formulation & Hotspot Inspector */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Potential Field Mathematical Breakdown */}
          <Card
            title="Field Formulation"
            subtitle="NAVRASA Multi-Harmonic Potential Model"
            badge={<Badge variant="outline">Math Model</Badge>}
          >
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-brand-black/70 rounded-lg border border-panel-border font-mono text-[11px] text-cyan-300 leading-relaxed">
                <div className="text-slate-400 mb-1 font-sans text-xs">Total Potential Energy:</div>
                U_tot(q) = U_road(q) + Σ U_actor,i(q, t) + U_occ(q)
              </div>

              {/* Breakdown Weight Bars */}
              <div className="space-y-2 pt-1">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>TTC Repulsion (1 / TTC²)</span>
                    <span className="text-crimson font-mono font-bold">42%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-crimson rounded-full" style={{ width: '42%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Velocity Differential (Δv·r̂)</span>
                    <span className="text-amber font-mono font-bold">28%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber rounded-full" style={{ width: '28%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Intent Uncertainty Entropy H(I)</span>
                    <span className="text-cyan font-mono font-bold">18%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan rounded-full" style={{ width: '18%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Occlusion Shadow Penalty</span>
                    <span className="text-purple-400 font-mono font-bold">12%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: '12%' }} />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Highest Risk Dynamic Hotspots */}
          <Card
            title="Identified Risk Hotspots"
            subtitle="Ranked dynamically by barrier margin violation"
            badge={<Badge variant="warning">{hotspots.length} Tracked</Badge>}
            className="flex-1 flex flex-col"
          >
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] pr-1">
              {hotspots.map((spot, i) => (
                <motion.div
                  key={spot.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="p-2.5 rounded-lg border border-panel-border/70 bg-panel-bg/40 hover:bg-panel-bg hover:border-cyan/40 transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-md ${
                      spot.risk > 0.6 ? 'bg-crimson/20 text-crimson' : spot.risk > 0.3 ? 'bg-amber/20 text-amber' : 'bg-cyan/20 text-cyan'
                    }`}>
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span className="text-white font-mono">{spot.id}</span>
                        <span className="text-[10px] uppercase text-slate-400">({spot.type})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Dist: {spot.dist}m | Rel V: {spot.relSpeed}m/s
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className={`font-bold ${spot.risk > 0.6 ? 'text-crimson' : spot.risk > 0.3 ? 'text-amber' : 'text-emerald'}`}>
                      {(spot.risk * 100).toFixed(0)}% Risk
                    </div>
                    <div className="text-[10px] text-slate-400">
                      TTC: <span className="text-cyan font-bold">{spot.ttc}s</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer Summary Note */}
            <div className="mt-3 pt-3 border-t border-panel-border/40 flex items-center gap-2 text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5 text-cyan flex-shrink-0" />
              <span>Higher potential induces immediate repulsive gradient torque in the Hybrid A* planner.</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
