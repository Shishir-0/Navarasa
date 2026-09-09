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
      <div className="flex h-full items-center justify-center text-[#9BA6B2] font-mono">
        <Activity className="w-8 h-8 animate-spin mr-3 text-[#4DA3FF]" />
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
    <div className="flex flex-col gap-5 p-6 min-h-full overflow-y-auto font-sans">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F7FA] flex items-center gap-2">
              <Flame className="w-6 h-6 text-[#FF5C7A]" />
              Spatio-Temporal Risk Field
            </h1>
            <Badge variant="danger">CBF ACTIVE</Badge>
            <Badge variant="outline">20 HZ UPDATE</Badge>
          </div>
          <p className="text-[13px] text-[#9BA6B2] mt-1">
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
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#12161E]/75 backdrop-blur-2xl border border-white/[0.08] rounded-2xl text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-[#9BA6B2] font-mono">
                <Sliders className="w-3.5 h-3.5 text-[#4DA3FF]" />
                Lookahead: <span className="text-[#4DA3FF] font-semibold">{horizonSec.toFixed(1)}s</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={horizonSec}
                onChange={(e) => setHorizonSec(parseFloat(e.target.value))}
                className="w-32 accent-[#4DA3FF] bg-[#05070B] h-1.5 rounded-full cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-[#9BA6B2] hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={showGradVectors}
                  onChange={(e) => setShowGradVectors(e.target.checked)}
                  className="accent-[#4DA3FF] rounded"
                />
                <span>Show ∇U Gradient Vectors</span>
              </label>
              <div className="flex items-center gap-1.5 text-[#34D399] text-[11px] font-mono">
                <span className="w-2 h-2 rounded-full bg-[#34D399] animate-ping" />
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
              <div className="p-3 bg-[#05070B]/80 rounded-xl border border-white/[0.06] font-mono text-[11px] text-[#4DA3FF] leading-relaxed">
                <div className="text-[#9BA6B2] mb-1 font-sans text-xs">Total Potential Energy:</div>
                U_tot(q) = U_road(q) + Σ U_actor,i(q, t) + U_occ(q)
              </div>

              {/* Breakdown Weight Bars */}
              <div className="space-y-2.5 pt-1">
                <div>
                  <div className="flex justify-between text-[#9BA6B2] mb-1 text-[11px]">
                    <span>TTC Repulsion (1 / TTC²)</span>
                    <span className="text-[#FF5C7A] font-mono font-semibold">42%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#05070B] rounded-full overflow-hidden">
                    <div className="h-full bg-[#FF5C7A] rounded-full" style={{ width: '42%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#9BA6B2] mb-1 text-[11px]">
                    <span>Velocity Differential (Δv·r̂)</span>
                    <span className="text-[#FBBF24] font-mono font-semibold">28%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#05070B] rounded-full overflow-hidden">
                    <div className="h-full bg-[#FBBF24] rounded-full" style={{ width: '28%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#9BA6B2] mb-1 text-[11px]">
                    <span>Intent Uncertainty Entropy H(I)</span>
                    <span className="text-[#4DA3FF] font-mono font-semibold">18%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#05070B] rounded-full overflow-hidden">
                    <div className="h-full bg-[#4DA3FF] rounded-full" style={{ width: '18%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[#9BA6B2] mb-1 text-[11px]">
                    <span>Occlusion Shadow Penalty</span>
                    <span className="text-[#A78BFA] font-mono font-semibold">12%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#05070B] rounded-full overflow-hidden">
                    <div className="h-full bg-[#A78BFA] rounded-full" style={{ width: '12%' }} />
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
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  className="p-2.5 rounded-xl border border-white/[0.06] bg-[#05070B]/50 hover:bg-[#1C222E]/60 hover:border-white/15 transition-all flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      spot.risk > 0.6 ? 'bg-[#FF5C7A]/15 text-[#FF5C7A]' : spot.risk > 0.3 ? 'bg-[#FBBF24]/15 text-[#FBBF24]' : 'bg-[#4DA3FF]/15 text-[#4DA3FF]'
                    }`}>
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="font-semibold text-[#F5F7FA] flex items-center gap-1.5 truncate">
                        <span className="font-mono truncate">{spot.id}</span>
                        <span className="text-[10px] uppercase text-[#9BA6B2] shrink-0">({spot.type})</span>
                      </div>
                      <div className="text-[10px] text-[#9BA6B2] font-mono mt-0.5 truncate">
                        Dist: {spot.dist}m | Rel V: {spot.relSpeed}m/s
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono shrink-0">
                    <div className={`font-semibold ${spot.risk > 0.6 ? 'text-[#FF5C7A]' : spot.risk > 0.3 ? 'text-[#FBBF24]' : 'text-[#34D399]'}`}>
                      {(spot.risk * 100).toFixed(0)}% Risk
                    </div>
                    <div className="text-[10px] text-[#9BA6B2]">
                      TTC: <span className="text-[#4DA3FF] font-semibold">{spot.ttc}s</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer Summary Note */}
            <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center gap-2 text-[11px] text-[#9BA6B2]">
              <Info className="w-3.5 h-3.5 text-[#4DA3FF] flex-shrink-0" />
              <span>Higher potential induces immediate repulsive gradient torque in the Hybrid A* planner.</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
