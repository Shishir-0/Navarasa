import React, { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useTelemetryStore } from "../../store/telemetryStore";
import { useUIStore } from "../../store/uiStore";
import { ActorNode } from "./ActorNode";
import { EDGE_COLOR_MAP } from "../../utils/colors";

const nodeTypes: any = {
  actorNode: ActorNode,
};

export const IntentGraphFlow: React.FC<{ height?: string }> = ({ height = "h-[600px]" }) => {
  const { latestFrame } = useTelemetryStore();
  const { setSelectedActorId } = useUIStore();

  const graphState = latestFrame?.intent_graph;

  // Convert intent graph nodes to React Flow Nodes with circular/radial layout around Ego
  const nodes: Node[] = useMemo(() => {
    if (!graphState) return [];

    const result: Node[] = [];
    const nodeEntries = Object.entries(graphState.nodes);
    const nonEgoEntries = nodeEntries.filter(([id]) => id !== "ego");

    // Center Ego at (400, 250)
    if (graphState.nodes["ego"]) {
      result.push({
        id: "ego",
        type: "actorNode",
        position: { x: 400, y: 250 },
        data: { node: graphState.nodes["ego"] },
      });
    }

    // Distribute surrounding participants radially
    const radius = 260;
    nonEgoEntries.forEach(([id, node], idx) => {
      const angle = (idx / Math.max(1, nonEgoEntries.length)) * Math.PI * 2;
      const x = 400 + radius * Math.cos(angle);
      const y = 250 + radius * Math.sin(angle);

      result.push({
        id,
        type: "actorNode",
        position: { x, y },
        data: { node },
      });
    });

    return result;
  }, [graphState]);

  // Convert intent edges to React Flow Edges
  const edges: Edge[] = useMemo(() => {
    if (!graphState) return [];

    return graphState.edges.map((edge, idx) => {
      const meta = EDGE_COLOR_MAP[edge.edge_type] || { hex: "#64748B", label: edge.edge_type };
      const isConflict = edge.edge_type === "CONFLICT";

      return {
        id: `e_${edge.source_id}_${edge.target_id}_${idx}`,
        source: edge.source_id,
        target: edge.target_id,
        animated: isConflict || edge.weight > 0.6,
        label: `${edge.edge_type} (${(edge.weight * 100).toFixed(0)}%)`,
        style: {
          stroke: meta.hex,
          strokeWidth: Math.max(1.5, edge.weight * 3.5),
        },
        labelStyle: {
          fill: meta.hex,
          fontFamily: "monospace",
          fontSize: 10,
          fontWeight: 700,
        },
        labelBgStyle: {
          fill: "#0B1220",
          fillOpacity: 0.85,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: meta.hex,
          width: 14,
          height: 14,
        },
      };
    });
  }, [graphState]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedActorId(node.id);
    },
    [setSelectedActorId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedActorId(null);
  }, [setSelectedActorId]);

  return (
    <div className={`w-full ${height} rounded-xl border border-slate-800 bg-[#050811] relative overflow-hidden`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1E293B" gap={24} size={1} />
        <Controls className="!bg-panel !border-slate-800 !text-hud-text !fill-hud-text" />
        <MiniMap
          nodeColor={(n) => (n.id === "ego" ? "#00FF88" : "#00E5FF")}
          maskColor="rgba(5, 8, 17, 0.8)"
          className="!bg-panel/90 !border-slate-800"
        />
      </ReactFlow>
    </div>
  );
};
