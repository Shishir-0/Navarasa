import React from "react";
import { useTelemetryStore } from "../../store/telemetryStore";
import { useUIStore } from "../../store/uiStore";
import { ActorBadge } from "../common/Badge";
import { MetricPill } from "../common/MetricPill";
import { X, Activity, Radio, Cpu, Compass } from "lucide-react";

export const ActorInspector: React.FC = () => {
  const { latestFrame } = useTelemetryStore();
  const { selectedActorId, isInspectorOpen, setIsInspectorOpen } = useUIStore();

  if (!isInspectorOpen || !selectedActorId || !latestFrame) return null;

  const isEgo = selectedActorId === "ego";
  const ego = latestFrame.ego_state;
  const track = latestFrame.tracks.find((t) => t.track_id === selectedActorId);
  const node = latestFrame.intent_graph.nodes[selectedActorId];

  const actorType = isEgo ? "EGO" : track?.actor_type || node?.actor_type || "CAR";
  const speed = isEgo ? ego.speed : track?.speed ?? node?.speed ?? 0;
  const heading = isEgo ? ego.heading : track?.heading ?? node?.heading ?? 0;
  const posX = isEgo ? ego.position.x : track?.position.x ?? node?.position.x ?? 0;
  const posY = isEgo ? ego.position.y : track?.position.y ?? node?.position.y ?? 0;
  const hits = track?.hits ?? (isEgo ? 100 : 1);
  const status = track?.status ?? "CONFIRMED";
  const mahalanobis = track?.mahalanobis_distance ?? 0;

  return (
    <div className="w-80 border-l border-slate-800/80 bg-panel/95 backdrop-blur-md p-4 flex flex-col justify-between font-mono z-20 shrink-0 shadow-2xl">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyber-cyan" />
            <h3 className="text-sm font-bold text-hud-text uppercase">{selectedActorId}</h3>
          </div>
          <button
            onClick={() => setIsInspectorOpen(false)}
            className="p-1 rounded hover:bg-slate-800 text-hud-secondary hover:text-hud-text"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Semantic Badge */}
        <div className="mb-4">
          <ActorBadge type={actorType} className="text-xs py-1 px-3" />
        </div>

        {/* State Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <MetricPill label="Speed" value={(speed * 3.6).toFixed(1)} unit="km/h" accentColor="cyan" />
          <MetricPill label="Heading" value={((heading * 180) / Math.PI).toFixed(1)} unit="deg" accentColor="emerald" />
          <MetricPill label="Pos X" value={posX.toFixed(2)} unit="m" />
          <MetricPill label="Pos Y" value={posY.toFixed(2)} unit="m" />
        </div>

        {/* Filter & Estimation Telemetry */}
        <div className="space-y-2 mb-4 text-xs bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div className="text-[11px] text-hud-secondary uppercase tracking-wider font-bold mb-1">
            Tracking Lifecycle
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Status:</span>
            <span className="text-cyber-emerald font-bold">{status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Hits / Age:</span>
            <span className="text-hud-text">{hits} frames</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Mahalanobis d:</span>
            <span className="text-cyber-amber">{mahalanobis.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Priority Score:</span>
            <span className="text-cyber-cyan">{(node?.priority_score ?? 0.5).toFixed(2)}</span>
          </div>
        </div>

        {/* Connected Relational Edges */}
        <div className="text-xs">
          <div className="text-[11px] text-hud-secondary uppercase tracking-wider font-bold mb-2">
            Interactions in Graph
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {latestFrame.intent_graph.edges
              .filter((e) => e.source_id === selectedActorId || e.target_id === selectedActorId)
              .map((e, idx) => (
                <div key={idx} className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[11px]">
                  <div className="flex justify-between font-bold">
                    <span className="text-cyber-cyan">{e.source_id} → {e.target_id}</span>
                    <span className="text-cyber-amber">{e.edge_type}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 mt-1">
                    <span>TTC: {e.time_to_collision ? `${e.time_to_collision.toFixed(1)}s` : "None"}</span>
                    <span>Attention: {e.attention_weight.toFixed(3)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center">
        NAVRASA Relational GNN Inspection Node
      </div>
    </div>
  );
};
