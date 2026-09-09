import React, { useState } from "react";
import Plot from "react-plotly.js";
import { useTelemetryStore } from "../../store/telemetryStore";
import { Card } from "../common/Card";
import { Layers, Activity } from "lucide-react";
import { clsx } from "clsx";

export const RiskHeatmapPlot: React.FC<{ height?: number }> = ({ height = 440 }) => {
  const { latestFrame } = useTelemetryStore();
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");

  const riskMap = latestFrame?.risk_map;
  if (!riskMap || !riskMap.data || riskMap.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm font-mono text-[#9BA6B2]">
        <Activity className="w-5 h-5 text-[#4DA3FF] animate-spin mr-2" />
        Synthesizing Dynamic Spatial Risk Field...
      </div>
    );
  }

  const zData = riskMap.data;
  const xCoords = Array.from({ length: riskMap.width }, (_, i) => riskMap.origin_x + i * riskMap.resolution);
  const yCoords = Array.from({ length: riskMap.height }, (_, i) => riskMap.origin_y + i * riskMap.resolution);

  // Apple-grade Blue -> Amber -> Red Risk Scale
  const appleColorscale = [
    [0.0, "rgba(5, 7, 11, 0.9)"],
    [0.15, "rgba(77, 163, 255, 0.45)"],
    [0.45, "rgba(77, 163, 255, 0.85)"],
    [0.7, "rgba(251, 191, 36, 0.9)"],
    [0.9, "rgba(255, 92, 122, 0.95)"],
    [1.0, "rgba(255, 255, 255, 1.0)"],
  ];

  const plotData: any[] =
    viewMode === "2d"
      ? [
          {
            z: zData,
            x: xCoords,
            y: yCoords,
            type: "contour",
            colorscale: appleColorscale,
            contours: {
              coloring: "heatmap",
              showlabels: true,
              labelfont: { family: "Inter, monospace", size: 10, color: "#F5F7FA" },
              start: 0.1,
              end: 1.0,
              size: 0.15,
            },
            colorbar: {
              title: { text: "R(x,y)", font: { color: "#F5F7FA", family: "Inter, sans-serif", size: 12 } },
              tickfont: { color: "#9BA6B2", family: "monospace" },
              thickness: 14,
              len: 0.85,
            },
          },
        ]
      : [
          {
            z: zData,
            x: xCoords,
            y: yCoords,
            type: "surface",
            colorscale: appleColorscale,
            showscale: false,
            contours: {
              z: { show: true, usecolormap: true, highlightcolor: "#4DA3FF", project: { z: true } },
            },
          },
        ];

  return (
    <Card
      title="Dynamic 2D/3D Spatial Risk Potential Field"
      subtitle="Unified spatial risk potential R(x,y) blending TTC, momentum, covariance, and occlusion fields"
      action={
        <div className="flex items-center gap-1 bg-[#05070B] border border-white/[0.08] rounded-xl p-1 shadow-inner">
          <button
            onClick={() => setViewMode("2d")}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
              viewMode === "2d"
                ? "bg-[#4DA3FF]/20 text-[#4DA3FF] font-semibold shadow-[0_2px_8px_rgba(77,163,255,0.2)]"
                : "text-[#9BA6B2] hover:text-white"
            )}
          >
            2D Contour
          </button>
          <button
            onClick={() => setViewMode("3d")}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
              viewMode === "3d"
                ? "bg-[#4DA3FF]/20 text-[#4DA3FF] font-semibold shadow-[0_2px_8px_rgba(77,163,255,0.2)]"
                : "text-[#9BA6B2] hover:text-white"
            )}
          >
            3D Surface
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
            scene: {
              xaxis: { gridcolor: "rgba(255,255,255,0.08)", color: "#9BA6B2" },
              yaxis: { gridcolor: "rgba(255,255,255,0.08)", color: "#9BA6B2" },
              zaxis: { gridcolor: "rgba(255,255,255,0.08)", color: "#9BA6B2" },
              camera: { eye: { x: 1.4, y: 1.4, z: 1.1 } },
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
