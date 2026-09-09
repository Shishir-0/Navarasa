import React, { useState } from "react";
import Plot from "react-plotly.js";
import { useTelemetryStore } from "../../store/telemetryStore";
import { Card } from "../common/Card";
import { Eye, Layers } from "lucide-react";
import { clsx } from "clsx";

export const RiskHeatmapPlot: React.FC<{ height?: number }> = ({ height = 420 }) => {
  const { latestFrame } = useTelemetryStore();
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");

  const riskMap = latestFrame?.risk_map;
  if (!riskMap || !riskMap.data || riskMap.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm font-mono text-hud-secondary">
        Initializing Spatial Risk Field...
      </div>
    );
  }

  const zData = riskMap.data;
  const xCoords = Array.from({ length: riskMap.width }, (_, i) => riskMap.origin_x + i * riskMap.resolution);
  const yCoords = Array.from({ length: riskMap.height }, (_, i) => riskMap.origin_y + i * riskMap.resolution);

  const plotData: any[] =
    viewMode === "2d"
      ? [
          {
            z: zData,
            x: xCoords,
            y: yCoords,
            type: "contour",
            colorscale: [
              [0, "#050811"],
              [0.2, "#00E5FF"],
              [0.5, "#FFB700"],
              [0.8, "#FF0055"],
              [1.0, "#FFFFFF"],
            ],
            contours: {
              coloring: "heatmap",
              showlabels: true,
              labelfont: { family: "monospace", size: 10, color: "white" },
            },
            colorbar: {
              title: { text: "R(x,y)", font: { color: "white", family: "monospace" } },
              tickfont: { color: "white", family: "monospace" },
            },
          },
        ]
      : [
          {
            z: zData,
            x: xCoords,
            y: yCoords,
            type: "surface",
            colorscale: "Viridis",
            showscale: false,
          },
        ];

  return (
    <Card
      title="Dynamic 2D/3D Spatial Risk Potential Field"
      subtitle="Continuous potential R(x,y) combining TTC, kinetic momentum, prediction uncertainty, and occlusion"
      action={
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded p-0.5">
          <button
            onClick={() => setViewMode("2d")}
            className={clsx(
              "px-2 py-0.5 rounded text-[10px] font-mono",
              viewMode === "2d" ? "bg-cyber-cyan/20 text-cyber-cyan font-bold" : "text-slate-400"
            )}
          >
            2D CONTOUR
          </button>
          <button
            onClick={() => setViewMode("3d")}
            className={clsx(
              "px-2 py-0.5 rounded text-[10px] font-mono",
              viewMode === "3d" ? "bg-cyber-cyan/20 text-cyber-cyan font-bold" : "text-slate-400"
            )}
          >
            3D SURFACE
          </button>
        </div>
      }
    >
      <div className="w-full">
        <Plot
          data={plotData}
          layout={{
            autosize: true,
            height: height,
            margin: { l: 40, r: 20, t: 10, b: 40 },
            paper_bgcolor: "transparent",
            plot_bgcolor: "transparent",
            xaxis: {
              title: { text: "Global X (m)", font: { color: "#9FB6CC", family: "monospace", size: 11 } },
              gridcolor: "#1E293B",
              tickfont: { color: "#9FB6CC", family: "monospace" },
            },
            yaxis: {
              title: { text: "Global Y (m)", font: { color: "#9FB6CC", family: "monospace", size: 11 } },
              gridcolor: "#1E293B",
              tickfont: { color: "#9FB6CC", family: "monospace" },
            },
            scene: {
              xaxis: { gridcolor: "#1E293B", color: "#9FB6CC" },
              yaxis: { gridcolor: "#1E293B", color: "#9FB6CC" },
              zaxis: { gridcolor: "#1E293B", color: "#9FB6CC" },
              camera: { eye: { x: 1.5, y: 1.5, z: 1.2 } },
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
