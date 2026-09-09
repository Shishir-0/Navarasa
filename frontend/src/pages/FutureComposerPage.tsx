import React, { useState } from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { Card } from "../components/common/Card";
import { ActorBadge } from "../components/common/Badge";
import { MetricPill } from "../components/common/MetricPill";
import { GitFork, Activity, ShieldAlert, ArrowRight } from "lucide-react";
import Plot from "react-plotly.js";

export const FutureComposerPage: React.FC = () => {
  const { latestFrame } = useTelemetryStore();
  const [selectedActor, setSelectedActor] = useState<string | null>(null);

  const predictions = latestFrame?.predictions?.predictions ?? {};
  const actorIds = Object.keys(predictions);
  const activeId = selectedActor && predictions[selectedActor] ? selectedActor : actorIds[0] || null;
  const currentPred = activeId ? predictions[activeId] : null;

  // Build 2D Trajectory Fan-out Plot
  const plotData: any[] = [];
  if (currentPred) {
    currentPred.hypotheses.forEach((hyp, idx) => {
      const hx = hyp.waypoints.map((w) => w.x);
      const hy = hyp.waypoints.map((w) => w.y);
      const colors = ["#00E5FF", "#FFB700", "#FF0055"];

      plotData.push({
        x: hx,
        y: hy,
        type: "scatter",
        mode: "lines+markers",
        name: `${hyp.maneuver_name} (${(hyp.probability * 100).toFixed(0)}%)`,
        line: { color: colors[idx % colors.length], width: 3, dash: idx === 0 ? "solid" : "dot" },
        marker: { size: 4 },
      });
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold font-mono text-hud-text uppercase tracking-wider">
          Future Road Composer (FRC)
        </h2>
        <p className="text-xs font-mono text-hud-secondary">
          Probabilistic multi-hypothesis future trajectory generator with covariance growth uncertainty envelopes
        </p>
      </div>

      {/* Actor Selection Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {actorIds.map((aid) => (
          <button
            key={aid}
            onClick={() => setSelectedActor(aid)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              activeId === aid
                ? "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan shadow-cyan-glow"
                : "bg-panel border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <span>{aid}</span>
            <ActorBadge type={predictions[aid].actor_type} />
          </button>
        ))}
      </div>

      {/* Main Grid: Trajectory Fan-out Plot + Maneuver Hypotheses Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Plotly Trajectory Fanout */}
        <div className="lg:col-span-7">
          <Card
            title={`Trajectory Fan-Out: ${activeId || "None"}`}
            subtitle="Horizon T=3.0s at dt=0.1s"
          >
            <Plot
              data={plotData}
              layout={{
                autosize: true,
                height: 480,
                margin: { l: 40, r: 20, t: 10, b: 40 },
                paper_bgcolor: "transparent",
                plot_bgcolor: "transparent",
                xaxis: { title: { text: "Global X (m)", font: { color: "#9FB6CC" } }, gridcolor: "#1E293B", tickfont: { color: "#9FB6CC" } },
                yaxis: { title: { text: "Global Y (m)", font: { color: "#9FB6CC" } }, gridcolor: "#1E293B", tickfont: { color: "#9FB6CC" } },
                legend: { font: { color: "#F5FAFF", family: "monospace" }, orientation: "h", y: 1.1 },
              }}
              useResizeHandler={true}
              className="w-full"
              config={{ responsive: true, displayModeBar: false }}
            />
          </Card>
        </div>

        {/* Right: Hypotheses Detailed Breakdown */}
        <div className="lg:col-span-5 space-y-3">
          {currentPred ? (
            currentPred.hypotheses.map((hyp, idx) => (
              <Card
                key={hyp.hypothesis_id}
                title={hyp.maneuver_name}
                subtitle={`Hypothesis ID: ${hyp.hypothesis_id}`}
                glow={hyp.maneuver_name.includes("CUT_IN") ? "crimson" : idx === 0 ? "cyan" : "none"}
              >
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Confidence Probability:</span>
                      <span className="text-cyber-cyan font-bold">{(hyp.probability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-emerald rounded-full"
                        style={{ width: `${hyp.probability * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Waypoints:</span>
                      <div className="font-bold text-hud-text">{hyp.waypoints.length} steps (3.0s)</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">Terminal Std:</span>
                      <div className="font-bold text-cyber-amber">±{hyp.waypoints[hyp.waypoints.length - 1]?.std_x.toFixed(2)}m</div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="p-8 text-center text-xs font-mono text-slate-500 bg-panel rounded-xl border border-slate-800">
              No actor selected or no predictions available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
