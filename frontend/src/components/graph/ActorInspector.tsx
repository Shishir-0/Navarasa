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
    <div className="w-80 border-l border-white/[0.08] bg-[#12161E]/95 backdrop-blur-2xl p-4 flex flex-col justify-between font-sans z-20 shrink-0 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#4DA3FF]" />
            <h3 className="text-sm font-semibold text-[#F5F7FA] tracking-tight">{selectedActorId}</h3>
          </div>
          <button
            onClick={() => setIsInspectorOpen(false)}
            className="p-1 rounded-lg hover:bg-white/[0.08] text-[#9BA6B2] hover:text-white transition-colors"
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
        <div className="space-y-2 mb-4 text-xs bg-[#05070B]/70 p-3 rounded-2xl border border-white/[0.06]">
          <div className="text-[11px] text-[#9BA6B2] uppercase tracking-wider font-semibold mb-1">
            Tracking Estimation
          </div>
          <div className="flex justify-between">
            <span className="text-[#9BA6B2]">Filter Status:</span>
            <span className="text-[#34D399] font-semibold">{status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9BA6B2]">Hits / Age:</span>
            <span className="text-[#F5F7FA] font-mono">{hits} frames</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9BA6B2]">Mahalanobis d:</span>
            <span className="text-[#FBBF24] font-mono">{mahalanobis.toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#9BA6B2]">Priority Score:</span>
            <span className="text-[#4DA3FF] font-mono">{(node?.priority_score ?? 0.5).toFixed(2)}</span>
          </div>
        </div>

        {/* Connected Relational Edges */}
        <div className="text-xs">
          <div className="text-[11px] text-[#9BA6B2] uppercase tracking-wider font-semibold mb-2">
            GNN Interaction Edges
          </div>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {latestFrame.intent_graph.edges
              .filter((e) => e.source_id === selectedActorId || e.target_id === selectedActorId)
              .map((e, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#05070B]/60 border border-white/[0.05] text-[11px]">
                  <div className="flex justify-between font-semibold">
                    <span className="text-[#4DA3FF]">{e.source_id} → {e.target_id}</span>
                    <span className="text-[#FBBF24]">{e.edge_type}</span>
                  </div>
                  <div className="flex justify-between text-[#9BA6B2] mt-1 font-mono text-[10px]">
                    <span>TTC: {e.time_to_collision ? `${e.time_to_collision.toFixed(1)}s` : "None"}</span>
                    <span>Attention: {e.attention_weight.toFixed(3)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-white/[0.08] text-[11px] text-[#9BA6B2] text-center font-normal">
        NAVRASA Relational GNN Reasoner
      </div>
    </div>
  );
};
