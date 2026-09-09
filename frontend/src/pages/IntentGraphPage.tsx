import React from "react";
import { IntentGraphFlow } from "../components/graph/IntentGraphFlow";
import { ActorInspector } from "../components/graph/ActorInspector";
import { Card } from "../components/common/Card";
import { EdgeBadge } from "../components/common/Badge";
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold font-mono text-hud-text uppercase tracking-wider">
            Road Intent Graph & Relational GNN Reasoner
          </h2>
          <p className="text-xs font-mono text-hud-secondary">
            Dynamic spatial-temporal interaction graph computing implicit right-of-way negotiation and conflict attention
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-hud-secondary">
            Nodes: <strong className="text-cyber-cyan">{nodeCount}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-hud-secondary">
            Edges: <strong className="text-cyber-emerald">{edgeCount}</strong>
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-hud-secondary">
            Conflicts: <strong className="text-cyber-crimson">{conflictCount}</strong>
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
      <Card title="Relational Interaction Taxonomy" subtitle="Spatial-temporal edge classifications">
        <div className="flex flex-wrap gap-2 pt-1">
          {(Object.keys(EDGE_COLOR_MAP) as IntentEdgeType[]).map((etype) => (
            <EdgeBadge key={etype} type={etype} className="px-3 py-1" />
          ))}
        </div>
      </Card>
    </div>
  );
};
