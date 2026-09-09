import React from "react";
import { DigitalTwinCanvas } from "../components/3d/DigitalTwinCanvas";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { useTelemetryStore } from "../store/telemetryStore";
import { useUIStore } from "../store/uiStore";
import { Layers, Camera, Crosshair, Cpu, Radio, Sparkles } from "lucide-react";
import { clsx } from "clsx";

export const DigitalTwinPage: React.FC = () => {
  const { latestFrame } = useTelemetryStore();
  const { cameraMode, setCameraMode, toggleLayer, showLidar, showBoxes, showTrajectories, showRisk } = useUIStore();

  const tracks = latestFrame?.tracks ?? [];
  const lidarCount = latestFrame?.raw_detections?.filter((d) => d.sensor_type === "LIDAR").length ?? 0;

  return (
    <div className="p-6 space-y-5 min-h-full font-sans">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F7FA] flex items-center gap-2">
              <Camera className="w-6 h-6 text-[#4DA3FF]" />
              3D Digital Twin & Sensor Fusion
            </h1>
            <Badge variant="cyan">WEBGL HERO</Badge>
            <Badge variant="outline">60 FPS TARGET</Badge>
          </div>
          <p className="text-[13px] text-[#9BA6B2] mt-1">
            Physically based WebGL rendering with reflective asphalt, HDR lighting, dynamic bounding boxes, and multi-sensor PiP overlays.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#9BA6B2]">
          <span className="px-3 py-1.5 rounded-xl bg-[#12161E]/80 backdrop-blur-md border border-white/[0.08]">
            LiDAR Points: <strong className="text-[#4DA3FF] font-semibold">{lidarCount}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-[#12161E]/80 backdrop-blur-md border border-white/[0.08]">
            Dynamic Actors: <strong className="text-[#FBBF24] font-semibold">{tracks.length}</strong>
          </span>
        </div>
      </div>

      {/* Fullscreen 3D Scene */}
      <DigitalTwinCanvas height="h-[640px]" />

      {/* Layer Controls & Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Camera Perspectives" subtitle="Instant viewpoint interpolation">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {(["orbit", "chase", "firstPerson", "topDown"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setCameraMode(mode)}
                className={clsx(
                  "p-2 rounded-xl border text-center transition-all capitalize font-medium",
                  cameraMode === mode
                    ? "bg-[#4DA3FF]/20 border-[#4DA3FF]/50 text-[#4DA3FF] shadow-[0_2px_12px_rgba(77,163,255,0.2)] font-semibold"
                    : "bg-[#05070B]/60 border-white/[0.06] text-[#9BA6B2] hover:text-white"
                )}
              >
                {mode === "firstPerson" ? "FSD Cabin" : mode === "topDown" ? "Ortho 2D" : mode}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Sensor Layers" subtitle="Toggle visual primitives">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <button
              onClick={() => toggleLayer("showLidar")}
              className={clsx(
                "p-2 rounded-xl border transition-all font-medium",
                showLidar
                  ? "bg-[#4DA3FF]/20 border-[#4DA3FF]/50 text-[#4DA3FF]"
                  : "bg-[#05070B]/60 border-white/[0.06] text-[#9BA6B2]/60"
              )}
            >
              LiDAR ({lidarCount})
            </button>
            <button
              onClick={() => toggleLayer("showBoxes")}
              className={clsx(
                "p-2 rounded-xl border transition-all font-medium",
                showBoxes
                  ? "bg-[#FBBF24]/20 border-[#FBBF24]/50 text-[#FBBF24]"
                  : "bg-[#05070B]/60 border-white/[0.06] text-[#9BA6B2]/60"
              )}
            >
              3D OBBs ({tracks.length})
            </button>
            <button
              onClick={() => toggleLayer("showTrajectories")}
              className={clsx(
                "p-2 rounded-xl border transition-all font-medium",
                showTrajectories
                  ? "bg-[#34D399]/20 border-[#34D399]/50 text-[#34D399]"
                  : "bg-[#05070B]/60 border-white/[0.06] text-[#9BA6B2]/60"
              )}
            >
              Trajectories
            </button>
            <button
              onClick={() => toggleLayer("showRisk")}
              className={clsx(
                "p-2 rounded-xl border transition-all font-medium",
                showRisk
                  ? "bg-[#FF5C7A]/20 border-[#FF5C7A]/50 text-[#FF5C7A]"
                  : "bg-[#05070B]/60 border-white/[0.06] text-[#9BA6B2]/60"
              )}
            >
              Risk Map
            </button>
          </div>
        </Card>

        <Card title="Pose Telemetry" subtitle="Vehicle SE(2) state" className="col-span-2">
          <div className="grid grid-cols-3 gap-2.5 text-xs font-mono pt-1">
            <div className="bg-[#05070B]/70 p-2.5 rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-[#9BA6B2] uppercase font-sans">Global Position</span>
              <div className="text-[#4DA3FF] font-semibold mt-0.5">
                X: {latestFrame?.ego_state.position.x.toFixed(2)}m
              </div>
              <div className="text-[#4DA3FF] font-semibold">
                Y: {latestFrame?.ego_state.position.y.toFixed(2)}m
              </div>
            </div>
            <div className="bg-[#05070B]/70 p-2.5 rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-[#9BA6B2] uppercase font-sans">Speed & Accel</span>
              <div className="text-[#34D399] font-semibold mt-0.5">
                {((latestFrame?.ego_state.speed ?? 0) * 3.6).toFixed(1)} km/h
              </div>
              <div className="text-[#34D399] font-semibold">
                {(latestFrame?.control_command?.acceleration ?? 0).toFixed(2)} m/s²
              </div>
            </div>
            <div className="bg-[#05070B]/70 p-2.5 rounded-xl border border-white/[0.06]">
              <span className="text-[10px] text-[#9BA6B2] uppercase font-sans">Orientation</span>
              <div className="text-[#FBBF24] font-semibold mt-0.5">
                Yaw: {(((latestFrame?.ego_state.heading ?? 0) * 180) / Math.PI).toFixed(1)}°
              </div>
              <div className="text-[#FBBF24] font-semibold">
                Steer: {(((latestFrame?.control_command?.steering_angle ?? 0) * 180) / Math.PI).toFixed(1)}°
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
