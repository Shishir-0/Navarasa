"""
NAVRASA Birds-Eye-View (BEV) Interactive World Canvas Component.
"""

from __future__ import annotations
import math
from typing import Optional
import numpy as np
import plotly.graph_objects as go

from backend.core.types import FrameBundle, ActorType
from backend.core.math_utils import compute_obb_corners


def render_bev_canvas(bundle: FrameBundle) -> go.Figure:
    """Renders 2D interactive BEV canvas with Ego, tracks, LiDAR, planned path, and predictions."""
    fig = go.Figure()

    ego = bundle.ego_state
    ex, ey = ego.position.x, ego.position.y

    # 1. Plot Risk Field Contours (if available)
    if bundle.risk_map is not None:
        rm = bundle.risk_map
        x_grid = np.linspace(rm.origin_x, rm.origin_x + rm.width * rm.resolution, rm.width)
        y_grid = np.linspace(rm.origin_y, rm.origin_y + rm.height * rm.resolution, rm.height)
        z_data = np.array(rm.data)

        fig.add_trace(go.Contour(
            x=x_grid,
            y=y_grid,
            z=z_data,
            colorscale="Viridis",
            opacity=0.35,
            showscale=False,
            contours=dict(start=0.1, end=0.9, size=0.15),
            hoverinfo="skip"
        ))

    # 2. Plot Raw LiDAR Detections
    lidar_pts = [d for d in bundle.raw_detections if d.sensor_type == "LIDAR"]
    if lidar_pts:
        lx = [d.position.x for d in lidar_pts]
        ly = [d.position.y for d in lidar_pts]
        fig.add_trace(go.Scatter(
            x=lx, y=ly,
            mode="markers",
            marker=dict(size=4, color="#00ffff", symbol="circle-open", opacity=0.8),
            name="LiDAR Points",
            hoverinfo="text",
            hovertext=[f"LiDAR Hit: ({x:.1f}, {y:.1f})" for x, y in zip(lx, ly)]
        ))

    # 3. Plot Ego Vehicle Footprint
    ego_obb = compute_obb_corners(ex, ey, ego.heading, ego.bbox.length, ego.bbox.width)
    ego_poly_x = list(ego_obb[:, 0]) + [ego_obb[0, 0]]
    ego_poly_y = list(ego_obb[:, 1]) + [ego_obb[0, 1]]

    fig.add_trace(go.Scatter(
        x=ego_poly_x, y=ego_poly_y,
        mode="lines",
        fill="toself",
        fillcolor="rgba(0, 255, 128, 0.4)",
        line=dict(color="#00ff80", width=2.5),
        name="Ego Vehicle",
        hovertext=f"Ego: {ego.speed*3.6:.1f} km/h"
    ))

    # Ego heading arrow
    hx = ex + 3.0 * math.cos(ego.heading)
    hy = ey + 3.0 * math.sin(ego.heading)
    fig.add_trace(go.Scatter(
        x=[ex, hx], y=[ey, hy],
        mode="lines",
        line=dict(color="#00ff80", width=3, dash="solid"),
        showlegend=False
    ))

    # 4. Plot Active Tracked Participants
    color_map = {
        ActorType.AUTORICKSHAW: ("#ffaa00", "Autorickshaw"),
        ActorType.TWO_WHEELER: ("#ff5500", "Two-Wheeler"),
        ActorType.PEDESTRIAN: ("#ff00ff", "Pedestrian"),
        ActorType.CATTLE: ("#aa00ff", "Cattle"),
        ActorType.BUS: ("#0088ff", "Bus"),
        ActorType.CAR: ("#ffcc00", "Car"),
        ActorType.STATIC_OBSTACLE: ("#888888", "Obstacle")
    }

    for t in bundle.tracks:
        obb = compute_obb_corners(t.position.x, t.position.y, t.heading, t.bbox.length, t.bbox.width)
        poly_x = list(obb[:, 0]) + [obb[0, 0]]
        poly_y = list(obb[:, 1]) + [obb[0, 1]]

        col, label = color_map.get(t.actor_type, ("#ffffff", "Actor"))
        fig.add_trace(go.Scatter(
            x=poly_x, y=poly_y,
            mode="lines",
            fill="toself",
            fillcolor=f"rgba{tuple(list(int(col.lstrip('#')[i:i+2], 16) for i in (0, 2, 4)) + [0.3])}",
            line=dict(color=col, width=2),
            name=f"{label} ({t.track_id})",
            hovertext=f"{t.track_id} | {label} | Speed: {t.speed*3.6:.1f} km/h | Status: {t.status.value}"
        ))

    # 5. Plot Future Road Composer Predictions
    for actor_id, pred in bundle.predictions.predictions.items():
        for hyp in pred.hypotheses:
            hx = [wp.x for wp in hyp.waypoints]
            hy = [wp.y for wp in hyp.waypoints]
            fig.add_trace(go.Scatter(
                x=hx, y=hy,
                mode="lines",
                line=dict(width=1.5, dash="dot"),
                opacity=max(0.3, hyp.probability),
                name=f"{actor_id}: {hyp.maneuver_name} ({hyp.probability:.2f})",
                showlegend=False
            ))

    # 6. Plot Planned Hybrid A* / Spline Trajectory
    if bundle.planned_trajectory and bundle.planned_trajectory.waypoints:
        px = [wp.x for wp in bundle.planned_trajectory.waypoints]
        py = [wp.y for wp in bundle.planned_trajectory.waypoints]
        fig.add_trace(go.Scatter(
            x=px, y=py,
            mode="lines+markers",
            marker=dict(size=3, color="#00e5ff"),
            line=dict(color="#00e5ff", width=3),
            name="Planned Trajectory"
        ))

    # Layout styling (Dark High-Tech Glassmorphic)
    fig.update_layout(
        template="plotly_dark",
        margin=dict(l=10, r=10, t=30, b=10),
        xaxis=dict(
            title="Global X (meters)",
            range=[ex - 35, ex + 35],
            scaleanchor="y",
            scaleratio=1,
            gridcolor="#222738"
        ),
        yaxis=dict(
            title="Global Y (meters)",
            range=[ey - 25, ey + 25],
            gridcolor="#222738"
        ),
        paper_bgcolor="rgba(15, 18, 28, 0.95)",
        plot_bgcolor="rgba(10, 12, 20, 0.95)",
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1,
            font=dict(size=10)
        ),
        height=520
    )

    return fig
