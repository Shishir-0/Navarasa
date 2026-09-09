import React from "react";
import Plot from "react-plotly.js";
import { useTelemetryStore } from "../../store/telemetryStore";
import { Card } from "../common/Card";

export const TelemetryCharts: React.FC<{ height?: number }> = ({ height = 240 }) => {
  const { frameBuffer } = useTelemetryStore();

  const times = frameBuffer.map((f) => f.timestamp);
  const speeds = frameBuffer.map((f) => f.ego_state.speed * 3.6);
  const accels = frameBuffer.map((f) => f.control_command?.acceleration ?? 0);
  const margins = frameBuffer.map((f) => f.control_command?.cbf_safety_margin ?? 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Ego Speed & Acceleration Time Series" subtitle="Kinematic velocity tracking vs MPC commands">
        <Plot
          data={[
            {
              x: times,
              y: speeds,
              type: "scatter",
              mode: "lines",
              name: "Speed (km/h)",
              line: { color: "#00FF88", width: 2 },
            },
            {
              x: times,
              y: accels,
              type: "scatter",
              mode: "lines",
              name: "Accel (m/s²)",
              yaxis: "y2",
              line: { color: "#00E5FF", width: 1.5, dash: "dot" },
            },
          ]}
          layout={{
            autosize: true,
            height: height,
            margin: { l: 40, r: 40, t: 10, b: 30 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            xaxis: { gridcolor: "#1E293B", tickfont: { color: "#9FB6CC", family: "monospace" } },
            yaxis: {
              title: { text: "km/h", font: { color: "#00FF88", size: 10 } },
              gridcolor: "#1E293B",
              tickfont: { color: "#00FF88", family: "monospace" },
            },
            yaxis2: {
              title: { text: "m/s²", font: { color: "#00E5FF", size: 10 } },
              overlaying: "y",
              side: "right",
              tickfont: { color: "#00E5FF", family: "monospace" },
            },
            legend: { font: { color: "#F5FAFF", family: "monospace", size: 9 }, orientation: "h", y: 1.1 },
          }}
          useResizeHandler={true}
          className="w-full"
          config={{ responsive: true, displayModeBar: false }}
        />
      </Card>

      <Card title="CBF Barrier Safety Margin" subtitle="Distance to forward invariant barrier boundary">
        <Plot
          data={[
            {
              x: times,
              y: margins,
              type: "scatter",
              mode: "lines",
              fill: "tozeroy",
              fillcolor: "rgba(0, 229, 255, 0.1)",
              line: { color: "#00E5FF", width: 2 },
              name: "Safety Margin (m)",
            },
          ]}
          layout={{
            autosize: true,
            height: height,
            margin: { l: 40, r: 20, t: 10, b: 30 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            xaxis: { gridcolor: "#1E293B", tickfont: { color: "#9FB6CC", family: "monospace" } },
            yaxis: {
              title: { text: "Margin (m)", font: { color: "#00E5FF", size: 10 } },
              gridcolor: "#1E293B",
              tickfont: { color: "#00E5FF", family: "monospace" },
            },
            legend: { font: { color: "#F5FAFF", family: "monospace", size: 9 } },
          }}
          useResizeHandler={true}
          className="w-full"
          config={{ responsive: true, displayModeBar: false }}
        />
      </Card>
    </div>
  );
};
