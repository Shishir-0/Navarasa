import React from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { Radio } from "lucide-react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

export const RadarSweepWidget: React.FC<{ size?: number; className?: string }> = ({
  size = 140,
  className,
}) => {
  const latestFrame = useTelemetryStore((state) => state.latestFrame);
  const tracks = latestFrame?.tracks || [];
  const ego = latestFrame?.ego_state;

  const egoX = ego?.position.x ?? 0.0;
  const egoY = ego?.position.y ?? 0.0;
  const maxRange = 35.0; // meters

  return (
    <div
      className={clsx(
        "relative rounded-full border border-cyber-cyan/30 bg-slate-950/80 backdrop-blur-md overflow-hidden flex items-center justify-center font-mono shadow-[inset_0_0_20px_rgba(0,240,255,0.15)]",
        className
      )}
      style={{ width: size, height: size }}
      title="360° FMCW Radar & LiDAR Spatial Proximity Sweep"
    >
      {/* Concentric Distance Rings */}
      <div className="absolute inset-2 rounded-full border border-cyber-cyan/15 border-dashed pointer-events-none" />
      <div className="absolute inset-6 rounded-full border border-cyber-cyan/20 pointer-events-none" />
      <div className="absolute inset-10 rounded-full border border-cyber-cyan/25 pointer-events-none" />

      {/* Axis Crosshairs */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full h-px bg-cyber-cyan/15" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-full w-px bg-cyber-cyan/15" />
      </div>

      {/* Rotating Radar Sweep Beam */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{
          background: "conic-gradient(from 0deg, rgba(0, 240, 255, 0.4) 0deg, transparent 60deg)",
        }}
      />

      {/* Ego Vehicle Center Blip */}
      <div className="relative z-10 w-2.5 h-2.5 rounded-full bg-cyber-emerald shadow-[0_0_8px_#00ff88]" />

      {/* Dynamic Actor Blips */}
      {tracks.map((t) => {
        const dx = t.position.x - egoX;
        const dy = t.position.y - egoY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxRange) return null;

        // Normalized to pixel position
        const radiusPx = (size / 2) - 8;
        const normX = (dx / maxRange) * radiusPx;
        const normY = -(dy / maxRange) * radiusPx; // screen Y is inverted

        return (
          <div
            key={t.track_id}
            className="absolute z-10 w-2 h-2 rounded-full bg-cyber-amber border border-white/60 shadow-[0_0_6px_#ffb700] transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${(size / 2) + normX}px`,
              top: `${(size / 2) + normY}px`,
            }}
            title={`${t.track_id} (${(t.speed * 3.6).toFixed(1)} km/h)`}
          />
        );
      })}

      {/* Top Range Label */}
      <div className="absolute top-1 text-[8px] text-cyber-cyan/60 pointer-events-none">
        35m
      </div>
    </div>
  );
};
