import React, { useState } from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { Card } from "../components/common/Card";
import { ActorBadge, Badge } from "../components/common/Badge";
import { MetricPill } from "../components/common/MetricPill";
import { GitFork, Activity, ShieldAlert, Sparkles, Compass, ShieldCheck } from "lucide-react";
import Plot from "react-plotly.js";
import { motion } from "framer-motion";

export const FutureComposerPage: React.FC = () => {
  const { latestFrame } = useTelemetryStore();
  const [selectedActor, setSelectedActor] = useState<string | null>(null);

  const predictions = latestFrame?.predictions?.predictions ?? {};
  const actorIds = Object.keys(predictions);
  const activeId = selectedActor && predictions[selectedActor] ? selectedActor : actorIds[0] || null;
  const currentPred = activeId ? predictions[activeId] : null;

  // Build 2D Trajectory Fan-out Plot with Glowing Ribbons & Uncertainty Covariance Envelopes
  const plotData: any[] = [];
  if (currentPred) {
    currentPred.hypotheses.forEach((hyp, idx) => {
      const hx = hyp.waypoints.map((w) => w.x);
      const hy = hyp.waypoints.map((w) => w.y);
      const isCutIn = hyp.maneuver_name.includes("CUT_IN") || hyp.maneuver_name.includes("AGGRESSIVE");
      const baseColor = isCutIn ? "#FF5C7A" : idx === 0 ? "#4DA3FF" : "#FBBF24";

      // 1. Uncertainty Covariance Envelope Ribbon (Upper & Lower std bounds)
      if (hyp.waypoints.length > 2) {
        const upperX = hyp.waypoints.map((w) => w.x + w.std_x);
        const lowerX = hyp.waypoints.map((w) => w.x - w.std_x).reverse();
        const upperY = hyp.waypoints.map((w) => w.y + (w.std_y ?? 0.3));
        const lowerY = hyp.waypoints.map((w) => w.y - (w.std_y ?? 0.3)).reverse();

        plotData.push({
          x: [...upperX, ...lowerX],
          y: [...upperY, ...lowerY],
          fill: "toself",
          fillcolor: isCutIn ? "rgba(255, 92, 122, 0.12)" : "rgba(77, 163, 255, 0.12)",
          line: { color: "transparent" },
          name: `${hyp.maneuver_name} (Uncertainty ±2σ)`,
          showlegend: false,
          type: "scatter",
          hoverinfo: "skip",
        });
      }

      // 2. Primary Glowing Trajectory Ribbon Centerline
      plotData.push({
        x: hx,
        y: hy,
        type: "scatter",
        mode: "lines+markers",
        name: `${hyp.maneuver_name} (${(hyp.probability * 100).toFixed(0)}%)`,
        line: {
          color: baseColor,
          width: Math.max(2, hyp.probability * 5),
          shape: "spline",
          dash: idx === 0 ? "solid" : "dot",
        },
        marker: {
          size: 5,
          color: baseColor,
          opacity: Math.max(0.4, hyp.probability),
        },
      });
    });
  }

  return (
    <div className="p-6 space-y-5 min-h-full font-sans">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F7FA] flex items-center gap-2">
              <GitFork className="w-6 h-6 text-[#4DA3FF]" />
              Future Road Composer (FRC)
            </h1>
            <Badge variant="cyan">MULTI-HYPOTHESIS V4</Badge>
          </div>
          <p className="text-[13px] text-[#9BA6B2] mt-1">
            Probabilistic trajectory generation with continuous covariance uncertainty growth and intent-conditioned priors.
          </p>
        </div>

        {/* Global Summary Metrics */}
        <div className="flex items-center gap-3">
          <MetricPill
            label="Active Actors"
            value={actorIds.length}
            unit="tracked"
            icon={<Compass className="w-4 h-4" />}
            status="info"
          />
          <MetricPill
            label="Horizon Steps"
            value={30}
            unit="3.0s @ 10Hz"
            icon={<Sparkles className="w-4 h-4" />}
            status="success"
          />
        </div>
      </div>

      {/* Actor Selection Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-[#9BA6B2] uppercase font-mono tracking-wider font-semibold mr-1">
          Select Target:
        </span>
        {actorIds.map((aid) => (
          <button
            key={aid}
            onClick={() => setSelectedActor(aid)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium transition-all flex items-center gap-2 ${
              activeId === aid
                ? "bg-[#4DA3FF]/20 border-[#4DA3FF]/50 text-[#4DA3FF] shadow-[0_2px_12px_rgba(77,163,255,0.2)] font-bold"
                : "bg-[#12161E]/70 border-white/[0.08] text-[#9BA6B2] hover:text-white"
            }`}
          >
            <span>{aid}</span>
            <ActorBadge type={predictions[aid].actor_type} />
          </button>
        ))}
        {actorIds.length === 0 && (
          <span className="text-xs text-[#9BA6B2]">No active dynamic actors in current scene horizon.</span>
        )}
      </div>

      {/* Main Grid: Trajectory Fan-out Plot + Maneuver Hypotheses Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Plotly Trajectory Fanout */}
        <div className="lg:col-span-7">
          <Card
            title={`Trajectory Horizon Envelope: ${activeId || "None"}`}
            subtitle="Lookahead T=3.0s at dt=0.1s with Gaussian covariance growth"
          >
            <Plot
              data={plotData}
              layout={{
                autosize: true,
                height: 480,
                margin: { l: 45, r: 20, t: 15, b: 45 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                xaxis: {
                  title: { text: "Longitudinal X (m)", font: { color: "#9BA6B2", size: 12 } },
                  gridcolor: "rgba(255,255,255,0.06)",
                  tickfont: { color: "#9BA6B2" },
                },
                yaxis: {
                  title: { text: "Lateral Y (m)", font: { color: "#9BA6B2", size: 12 } },
                  gridcolor: "rgba(255,255,255,0.06)",
                  tickfont: { color: "#9BA6B2" },
                },
                legend: {
                  font: { color: "#F5F7FA", family: "Inter, sans-serif" },
                  orientation: "h",
                  y: 1.12,
                },
              }}
              useResizeHandler={true}
              className="w-full"
              config={{ responsive: true, displayModeBar: false }}
            />
          </Card>
        </div>

        {/* Right 5 Cols: Hypotheses Detailed Breakdown */}
        <div className="lg:col-span-5 space-y-3">
          {currentPred ? (
            currentPred.hypotheses.map((hyp, idx) => {
              const isCutIn = hyp.maneuver_name.includes("CUT_IN") || hyp.maneuver_name.includes("AGGRESSIVE");
              return (
                <Card
                  key={hyp.hypothesis_id}
                  title={hyp.maneuver_name}
                  subtitle={`Hypothesis ID: ${hyp.hypothesis_id}`}
                  glow={isCutIn ? "crimson" : idx === 0 ? "cyan" : "none"}
                >
                  <div className="space-y-3 pt-1">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#9BA6B2]">Hypothesis Probability:</span>
                        <span className="text-[#4DA3FF] font-semibold font-mono">
                          {(hyp.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-[#05070B] h-2 rounded-full overflow-hidden border border-white/[0.08]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${hyp.probability * 100}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            isCutIn
                              ? "bg-gradient-to-r from-[#FF5C7A] to-[#FBBF24]"
                              : "bg-gradient-to-r from-[#4DA3FF] to-[#34D399]"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-[#05070B]/70 border border-white/[0.06]">
                        <span className="text-[10px] text-[#9BA6B2] uppercase font-sans">Trajectory Horizon</span>
                        <div className="font-semibold text-[#F5F7FA] mt-0.5">{hyp.waypoints.length} steps (3.0s)</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#05070B]/70 border border-white/[0.06]">
                        <span className="text-[10px] text-[#9BA6B2] uppercase font-sans">Terminal Std (±2σ)</span>
                        <div className="font-semibold text-[#FBBF24] mt-0.5">
                          ±{hyp.waypoints[hyp.waypoints.length - 1]?.std_x.toFixed(2)}m
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[#9BA6B2] bg-[#12161E]/70 rounded-2xl border border-white/[0.08]">
              No actor selected or no prediction hypotheses available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
