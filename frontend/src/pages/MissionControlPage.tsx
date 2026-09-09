import React from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { usePlaybackStore } from "../store/playbackStore";
import { MetricPill } from "../components/common/MetricPill";
import { Card } from "../components/common/Card";
import { DigitalTwinCanvas } from "../components/3d/DigitalTwinCanvas";
import { IntentGraphFlow } from "../components/graph/IntentGraphFlow";
import { ActorBadge } from "../components/common/Badge";
import {
  Gauge,
  Navigation,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Compass,
  Zap,
} from "lucide-react";

export const MissionControlPage: React.FC = () => {
  const { latestFrame, frameBuffer } = useTelemetryStore();
  const { isReplayMode, scrubberIndex } = usePlaybackStore();

  const currentFrame = isReplayMode && frameBuffer[scrubberIndex]
    ? frameBuffer[scrubberIndex]
    : latestFrame;

  const ego = currentFrame?.ego_state;
  const cmd = currentFrame?.control_command;
  const metrics = currentFrame?.metrics;
  const cbfActive = cmd?.cbf_active ?? false;

  return (
    <div className="space-y-4">
      {/* Top Telemetry KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricPill
          label="Ego Speed"
          value={((ego?.speed ?? 0) * 3.6).toFixed(1)}
          unit="km/h"
          icon={<Gauge className="w-4 h-4" />}
          accentColor="emerald"
        />
        <MetricPill
          label="Steering Angle"
          value={(((cmd?.steering_angle ?? 0) * 180) / Math.PI).toFixed(1)}
          unit="deg"
          icon={<Navigation className="w-4 h-4" />}
          accentColor="cyan"
        />
        <MetricPill
          label="Acceleration"
          value={(cmd?.acceleration ?? 0).toFixed(2)}
          unit="m/s²"
          icon={<Activity className="w-4 h-4" />}
          accentColor={cmd && cmd.acceleration < 0 ? "crimson" : "cyan"}
        />
        <MetricPill
          label="Active Tracks"
          value={currentFrame?.tracks.length ?? 0}
          unit="agents"
          icon={<Compass className="w-4 h-4" />}
          accentColor="amber"
        />
        <MetricPill
          label="CBF Margin"
          value={(cmd?.cbf_safety_margin ?? 5.0).toFixed(1)}
          unit="m"
          icon={cbfActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          accentColor={cbfActive ? "crimson" : "emerald"}
        />
        <MetricPill
          label="Pipeline FPS"
          value={(metrics?.fps ?? 0).toFixed(1)}
          unit="Hz"
          icon={<Zap className="w-4 h-4" />}
          accentColor="cyan"
        />
      </div>

      {/* Main Operations Split: 3D Twin + Intelligence Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 3D Digital Twin Viewport */}
        <div className="lg:col-span-8 space-y-4">
          <DigitalTwinCanvas height="h-[520px]" />

          {/* Real-time Explainability Narrative Bar */}
          <Card
            title="Reasoning & Explainability Log"
            glow={cbfActive ? "crimson" : "cyan"}
            className="border-l-4 border-l-cyber-cyan"
          >
            <div className="flex items-start gap-3 text-xs font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800 shrink-0 text-cyber-cyan font-bold">
                Frame #{currentFrame?.frame_id ?? 0} [t={currentFrame?.timestamp.toFixed(2) ?? "0.00"}s]
              </div>
              <div className="flex-1 text-hud-text pt-1 leading-relaxed">
                {currentFrame?.decision_narrative || "System operating in nominal tracking mode."}
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Road Intent Graph + Future Hypotheses */}
        <div className="lg:col-span-4 space-y-4">
          {/* Mini Road Intent Graph */}
          <Card
            title="Road Intent Graph (RIG)"
            subtitle="NetworkX dynamic relational graph with GNN attention weights"
          >
            <IntentGraphFlow height="h-[280px]" />
          </Card>

          {/* Future Road Composer Probabilities */}
          <Card
            title="Future Road Composer"
            subtitle="Top-K probabilistic trajectory hypotheses"
          >
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {currentFrame?.predictions?.predictions && Object.keys(currentFrame.predictions.predictions).length > 0 ? (
                Object.values(currentFrame.predictions.predictions).map((pred) => (
                  <div key={pred.actor_id} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-cyber-cyan">{pred.actor_id}</span>
                      <ActorBadge type={pred.actor_type} />
                    </div>
                    <div className="space-y-1.5">
                      {pred.hypotheses.map((hyp) => (
                        <div key={hyp.hypothesis_id}>
                          <div className="flex justify-between text-[11px] mb-0.5">
                            <span className="text-slate-300">{hyp.maneuver_name}</span>
                            <span className="text-cyber-amber font-bold">{(hyp.probability * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyber-cyan to-cyber-amber rounded-full"
                              style={{ width: `${hyp.probability * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs font-mono text-slate-500 text-center py-6">
                  No dynamic actors in prediction horizon.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
