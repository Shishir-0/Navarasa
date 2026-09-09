import React from "react";
import Plot from "react-plotly.js";
import { useTelemetryStore } from "../../store/telemetryStore";
import { Card } from "../common/Card";

export const LatencyBreakdown: React.FC<{ height?: number }> = ({ height = 240 }) => {
  const { latestFrame } = useTelemetryStore();
  const metrics = latestFrame?.metrics;

  const stages = [
    "Control (MPC+CBF)",
    "Planning (Hybrid A*)",
    "Risk Field",
    "Prediction (FRC)",
    "Intent Graph (GNN)",
    "Tracking (UKF/KF)",
  ];

  const latencies = metrics
    ? [
        metrics.control_latency_ms,
        metrics.planning_latency_ms,
        metrics.risk_latency_ms,
        metrics.prediction_latency_ms,
        metrics.graph_latency_ms,
        metrics.tracking_latency_ms,
      ]
    : [4.2, 9.5, 6.2, 5.1, 2.8, 3.4];

  return (
    <Card title="Pipeline Stage Latency Profiler" subtitle="Real-time execution timing per subsystem">
      <div className="w-full">
        <Plot
          data={[
            {
              x: latencies,
              y: stages,
              type: "bar",
              orientation: "h",
              marker: {
                color: ["#00E5FF", "#00FF88", "#FFB700", "#FF0055", "#A855F7", "#3B82F6"],
                line: { color: "rgba(255,255,255,0.2)", width: 1 },
              },
            },
          ]}
          layout={{
            autosize: true,
            height: height,
            margin: { l: 140, r: 20, t: 10, b: 30 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            xaxis: {
              title: { text: "Latency (ms)", font: { color: "#9FB6CC", family: "monospace", size: 10 } },
              gridcolor: "#1E293B",
              tickfont: { color: "#9FB6CC", family: "monospace" },
            },
            yaxis: {
              gridcolor: "#1E293B",
              tickfont: { color: "#F5FAFF", family: "monospace", size: 10 },
            },
          }}
          useResizeHandler={true}
          className="w-full"
          config={{ responsive: true, displayModeBar: false }}
        />
      </div>
    </Card>
  );
};
