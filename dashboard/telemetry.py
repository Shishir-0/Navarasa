"""
NAVRASA Telemetry & Latency Profiling Components for Mission Control.
"""

from __future__ import annotations
import plotly.graph_objects as go
from backend.core.types import SystemMetrics, ControlCommand


def render_latency_breakdown_chart(metrics: SystemMetrics) -> go.Figure:
    """Renders horizontal bar chart breaking down stage-by-stage pipeline latencies."""
    stages = [
        "Control (MPC+CBF)",
        "Planning (Hybrid A*)",
        "Risk Field",
        "Prediction (FRC)",
        "Intent Graph (GNN)",
        "Tracking (UKF/KF)"
    ]
    latencies = [
        metrics.control_latency_ms,
        metrics.planning_latency_ms,
        metrics.risk_latency_ms,
        metrics.prediction_latency_ms,
        metrics.graph_latency_ms,
        metrics.tracking_latency_ms
    ]

    fig = go.Figure(go.Bar(
        x=latencies,
        y=stages,
        orientation="h",
        marker=dict(
            color=["#00e5ff", "#00ff88", "#ffaa00", "#ff007f", "#aa00ff", "#0088ff"],
            line=dict(color="#ffffff", width=0.5)
        )
    ))

    fig.update_layout(
        template="plotly_dark",
        margin=dict(l=10, r=10, t=25, b=10),
        xaxis=dict(title="Latency (ms)", gridcolor="#222738"),
        paper_bgcolor="rgba(15, 18, 28, 0.95)",
        plot_bgcolor="rgba(10, 12, 20, 0.95)",
        height=220
    )

    return fig


def render_safety_margin_gauge(cmd: Optional[ControlCommand]) -> go.Figure:
    """Renders safety margin indicator showing distance to Control Barrier boundary."""
    margin = cmd.cbf_safety_margin if cmd else 5.0
    cbf_active = cmd.cbf_active if cmd else False

    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=min(10.0, max(0.0, margin)),
        title={"text": "CBF Safety Margin (m)", "font": {"size": 14}},
        gauge={
            "axis": {"range": [0, 10], "tickwidth": 1, "tickcolor": "white"},
            "bar": {"color": "#ff0055" if cbf_active else "#00ff88"},
            "steps": [
                {"range": [0, 1.5], "color": "rgba(255, 0, 85, 0.4)"},
                {"range": [1.5, 4.0], "color": "rgba(255, 170, 0, 0.4)"},
                {"range": [4.0, 10.0], "color": "rgba(0, 255, 136, 0.4)"}
            ],
            "threshold": {
                "line": {"color": "white", "width": 3},
                "thickness": 0.75,
                "value": 1.2
            }
        }
    ))

    fig.update_layout(
        template="plotly_dark",
        margin=dict(l=15, r=15, t=30, b=15),
        paper_bgcolor="rgba(15, 18, 28, 0.95)",
        height=200
    )

    return fig
