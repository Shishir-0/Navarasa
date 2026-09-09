"""
NAVRASA Road Intent Graph (RIG) Interactive Visualization Component.
"""

from __future__ import annotations
import math
from typing import Dict
import plotly.graph_objects as go

from backend.core.types import RoadIntentGraphState, IntentEdgeType


def render_intent_graph_view(graph_state: RoadIntentGraphState) -> go.Figure:
    """Renders interactive 2D node-link topology of the Road Intent Graph."""
    fig = go.Figure()

    edge_color_map = {
        IntentEdgeType.CONFLICT: "#ff0055",
        IntentEdgeType.LATERAL_ENCROACHMENT: "#ff7700",
        IntentEdgeType.FOLLOWING: "#00ccff",
        IntentEdgeType.CROSSING: "#ffcc00",
        IntentEdgeType.OVERTAKING: "#aa00ff",
        IntentEdgeType.YIELD_NEGOTIATION: "#00ff88",
        IntentEdgeType.PROXIMITY: "#445577"
    }

    # 1. Plot Edges
    for edge in graph_state.edges:
        if edge.source_id not in graph_state.nodes or edge.target_id not in graph_state.nodes:
            continue
        n_src = graph_state.nodes[edge.source_id]
        n_dst = graph_state.nodes[edge.target_id]

        col = edge_color_map.get(edge.edge_type, "#556688")
        width = max(1.0, edge.weight * 3.5)

        fig.add_trace(go.Scatter(
            x=[n_src.position.x, n_dst.position.x, None],
            y=[n_src.position.y, n_dst.position.y, None],
            mode="lines",
            line=dict(color=col, width=width),
            hoverinfo="text",
            hovertext=f"Edge: {edge.source_id} -> {edge.target_id}<br>Type: {edge.edge_type.value}<br>Weight: {edge.weight:.2f}<br>TTC: {edge.time_to_collision or 'N/A'}<br>Attention: {edge.attention_weight:.3f}",
            showlegend=False
        ))

    # 2. Plot Nodes
    node_x = []
    node_y = []
    node_text = []
    node_colors = []
    node_sizes = []

    for nid, node in graph_state.nodes.items():
        node_x.append(node.position.x)
        node_y.append(node.position.y)
        node_text.append(f"<b>Node: {nid}</b><br>Type: {node.node_type.value}<br>Speed: {node.speed*3.6:.1f} km/h<br>Priority: {node.priority_score:.2f}")

        if nid == "ego":
            node_colors.append("#00ff80")
            node_sizes.append(18)
        else:
            node_colors.append("#ffaa00" if node.priority_score > 0.6 else "#00aaff")
            node_sizes.append(14)

    fig.add_trace(go.Scatter(
        x=node_x, y=node_y,
        mode="markers+text",
        marker=dict(size=node_sizes, color=node_colors, line=dict(color="#ffffff", width=1.5)),
        text=[nid for nid in graph_state.nodes.keys()],
        textposition="top center",
        textfont=dict(color="#ffffff", size=10),
        hoverinfo="text",
        hovertext=node_text,
        name="Intent Nodes"
    ))

    fig.update_layout(
        template="plotly_dark",
        margin=dict(l=10, r=10, t=30, b=10),
        xaxis=dict(showgrid=True, gridcolor="#222738", zeroline=False),
        yaxis=dict(showgrid=True, gridcolor="#222738", zeroline=False),
        paper_bgcolor="rgba(15, 18, 28, 0.95)",
        plot_bgcolor="rgba(10, 12, 20, 0.95)",
        height=320
    )

    return fig
