import React from "react";
import { DigitalTwinCanvas } from "../components/3d/DigitalTwinCanvas";
import { Card } from "../components/common/Card";
import { useTelemetryStore } from "../store/telemetryStore";
import { useUIStore } from "../store/uiStore";
import { Layers, Camera, Crosshair, Cpu } from "lucide-react";

export const DigitalTwinPage: React.FC = () => {
  const { latestFrame } = useTelemetryStore();
  const { cameraMode, setCameraMode, toggleLayer, showLidar, showBoxes, showTrajectories, showRisk } = useUIStore();

  const tracks = latestFrame?.tracks ?? [];
  const lidarCount = latestFrame?.raw_detections?.filter((d) => d.sensor_type === "LIDAR").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-mono text-hud-text uppercase tracking-wider">
            3D Digital Twin World Space
          </h2>
          <p className="text-xs font-mono text-hud-secondary">
            High-fidelity real-time WebGL LiDAR point cloud simulation and kinematic mesh viewer
          </p>
        </div>
      </div>

      {/* Fullscreen 3D Scene */}
      <DigitalTwinCanvas height="h-[640px]" />

      {/* Layer Controls & Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Camera Perspectives" subtitle="Instant viewpoint switching">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {(["orbit", "chase", "firstPerson", "topDown"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setCameraMode(mode)}
                className={`p-2 rounded border uppercase font-bold text-center transition-all ${
                  cameraMode === mode
                    ? "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan shadow-cyan-glow"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Sensor Layers" subtitle="Toggle visual primitives">
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <button
              onClick={() => toggleLayer("showLidar")}
              className={`p-2 rounded border font-bold ${
                showLidar
                  ? "bg-cyber-cyan/20 border-cyber-cyan text-cyber-cyan"
                  : "bg-slate-900/60 border-slate-800 text-slate-500"
              }`}
            >
              LiDAR ({lidarCount})
            </button>
            <button
              onClick={() => toggleLayer("showBoxes")}
              className={`p-2 rounded border font-bold ${
                showBoxes
                  ? "bg-cyber-amber/20 border-cyber-amber text-cyber-amber"
                  : "bg-slate-900/60 border-slate-800 text-slate-500"
              }`}
            >
              3D OBBs ({tracks.length})
            </button>
            <button
              onClick={() => toggleLayer("showTrajectories")}
              className={`p-2 rounded border font-bold ${
                showTrajectories
                  ? "bg-cyber-emerald/20 border-cyber-emerald text-cyber-emerald"
                  : "bg-slate-900/60 border-slate-800 text-slate-500"
              }`}
            >
              Trajectories
            </button>
            <button
              onClick={() => toggleLayer("showRisk")}
              className={`p-2 rounded border font-bold ${
                showRisk
                  ? "bg-cyber-crimson/20 border-cyber-crimson text-cyber-crimson"
                  : "bg-slate-900/60 border-slate-800 text-slate-500"
              }`}
            >
              Risk Map
            </button>
          </div>
        </Card>

        <Card title="Pose Telemetry" subtitle="Vehicle SE(2) state" className="col-span-2">
          <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-400">Position:</span>
              <div className="text-cyber-cyan font-bold">
                X: {latestFrame?.ego_state.position.x.toFixed(2)}m
              </div>
              <div className="text-cyber-cyan font-bold">
                Y: {latestFrame?.ego_state.position.y.toFixed(2)}m
              </div>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-400">Velocity:</span>
              <div className="text-cyber-emerald font-bold">
                Speed: {((latestFrame?.ego_state.speed ?? 0) * 3.6).toFixed(1)} km/h
              </div>
              <div className="text-cyber-emerald font-bold">
                Accel: {(latestFrame?.control_command?.acceleration ?? 0).toFixed(2)} m/s²
              </div>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <span className="text-slate-400">Orientation:</span>
              <div className="text-cyber-amber font-bold">
                Yaw: {(((latestFrame?.ego_state.heading ?? 0) * 180) / Math.PI).toFixed(1)}°
              </div>
              <div className="text-cyber-amber font-bold">
                Steer: {(((latestFrame?.control_command?.steering_angle ?? 0) * 180) / Math.PI).toFixed(1)}°
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
