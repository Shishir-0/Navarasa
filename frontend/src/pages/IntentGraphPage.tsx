import React from "react";
import { IntentGraphFlow } from "../components/graph/IntentGraphFlow";
import { ActorInspector } from "../components/graph/ActorInspector";
import { Card } from "../components/common/Card";
import { EdgeBadge, Badge } from "../components/common/Badge";
import { useTelemetryStore } from "../store/telemetryStore";
import { EDGE_COLOR_MAP } from "../utils/colors";
import { Network, Cpu, Zap, Activity } from "lucide-react";
import { IntentEdgeType } from "../types/navrasa";

export const IntentGraphPage: React.FC = () => {
  const { latestFrame } = useTelemetryStore();
  const graphState = latestFrame?.intent_graph;

  const nodeCount = graphState ? Object.keys(graphState.nodes).length : 0;
  const edgeCount = graphState ? graphState.edges.length : 0;
  const conflictCount = graphState ? graphState.edges.filter((e) => e.edge_type === "CONFLICT").length : 0;

  return (
    <div className="p-6 space-y-5 min-h-full font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F7FA] flex items-center gap-2">
              <Network className="w-6 h-6 text-[#4DA3FF]" />
              Road Intent Graph & Relational GNN
            </h1>
            <Badge variant="cyan">ATTENTION V4</Badge>
          </div>
          <p className="text-[13px] text-[#9BA6B2] mt-1">
            Dynamic spatio-temporal interaction graph computing implicit right-of-way negotiation and conflict attention weights.
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-mono">
          <span className="px-3 py-1.5 rounded-xl bg-[#12161E]/80 backdrop-blur-md border border-white/[0.08] text-[#9BA6B2]">
            Nodes: <strong className="text-[#4DA3FF] font-semibold">{nodeCount}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-[#12161E]/80 backdrop-blur-md border border-white/[0.08] text-[#9BA6B2]">
            Edges: <strong className="text-[#34D399] font-semibold">{edgeCount}</strong>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-[#12161E]/80 backdrop-blur-md border border-white/[0.08] text-[#9BA6B2]">
            Conflicts: <strong className="text-[#FF5C7A] font-semibold">{conflictCount}</strong>
          </span>
        </div>
      </div>

      {/* Main Flow Canvas + Actor Inspector Drawer */}
      <div className="flex gap-4">
        <div className="flex-1">
          <IntentGraphFlow height="h-[620px]" />
        </div>
        <ActorInspector />
      </div>

      {/* Relational Edge Semantics & GNN Reasoning Bar */}
      <Card title="Relational Interaction Taxonomy" subtitle="Spatial-temporal edge classifications & attention weights">
        <div className="flex flex-wrap gap-2.5 pt-1">
          {(Object.keys(EDGE_COLOR_MAP) as IntentEdgeType[]).map((etype) => (
            <EdgeBadge key={etype} type={etype} className="px-3 py-1.5" />
          ))}
        </div>
      </Card>
    </div>
  );
};
