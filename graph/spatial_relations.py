"""
NAVRASA Spatial & Temporal Relation Classifier for Road Intent Graph.

Computes physical interactions between road participants in unstructured traffic:
- Time-to-Collision (TTC)
- Lateral Encroachment / Squeezing
- Lead-Follower Longitudinal Coupling
- Crossing & Merging Conflict Angles
- Yielding & Right-of-Way Negotiation
"""

from __future__ import annotations
import math
from typing import Tuple, Optional
import numpy as np
from backend.core.types import (
    IntentEdgeType,
    ActorState,
    TrackState,
    Vector2D
)
from backend.core.math_utils import wrap_to_pi


def compute_ttc(
    pos_a: Tuple[float, float],
    vel_a: Tuple[float, float],
    pos_b: Tuple[float, float],
    vel_b: Tuple[float, float]
) -> Optional[float]:
    """
    Computes instantaneous Time-to-Collision (TTC) between two objects assuming constant velocity.

    TTC = - (dp . dv) / ||dv||^2    when converging (dp . dv < 0)
    """
    dp = np.array([pos_b[0] - pos_a[0], pos_b[1] - pos_a[1]], dtype=np.float64)
    dv = np.array([vel_b[0] - vel_a[0], vel_b[1] - vel_a[1]], dtype=np.float64)

    dv_norm_sq = float(np.dot(dv, dv))
    if dv_norm_sq < 1e-4:
        return None  # Negligible relative velocity

    dp_dot_dv = float(np.dot(dp, dv))
    if dp_dot_dv >= 0.0:
        return None  # Diverging or parallel

    ttc = -dp_dot_dv / dv_norm_sq
    return float(ttc) if ttc > 0.0 else None


def classify_spatial_relation(
    pos_i: Tuple[float, float],
    vel_i: Tuple[float, float],
    heading_i: float,
    pos_j: Tuple[float, float],
    vel_j: Tuple[float, float],
    heading_j: float,
    proximity_thresh: float = 25.0,
    ttc_critical: float = 4.0
) -> Tuple[IntentEdgeType, float, Optional[float]]:
    """
    Classifies the dominant interaction between entity i and entity j.

    Returns:
        (edge_type, edge_weight, ttc)
    """
    dx = pos_j[0] - pos_i[0]
    dy = pos_j[1] - pos_i[1]
    dist = math.hypot(dx, dy)

    if dist > proximity_thresh:
        return IntentEdgeType.PROXIMITY, 0.0, None

    # Forward and lateral unit vectors for entity i
    u_lon = np.array([math.cos(heading_i), math.sin(heading_i)], dtype=np.float64)
    u_lat = np.array([-math.sin(heading_i), math.cos(heading_i)], dtype=np.float64)

    dp = np.array([dx, dy], dtype=np.float64)
    d_lon = float(np.dot(dp, u_lon))
    d_lat = abs(float(np.dot(dp, u_lat)))

    # Heading difference
    d_yaw = abs(wrap_to_pi(heading_j - heading_i))

    # TTC
    ttc = compute_ttc(pos_i, vel_i, pos_j, vel_j)

    # 1. Critical Conflict
    if ttc is not None and ttc < ttc_critical:
        weight = max(0.1, min(1.0, 1.0 - (ttc / ttc_critical)))
        return IntentEdgeType.CONFLICT, weight, ttc

    # 2. Lateral Encroachment / Squeezing (Typical Indian lane sharing)
    if d_lat < 2.0 and abs(d_lon) < 6.0:
        weight = max(0.2, 1.0 - (d_lat / 2.0))
        return IntentEdgeType.LATERAL_ENCROACHMENT, weight, ttc

    # 3. Following (Lead vehicle in front within cone)
    if d_lon > 0.0 and d_lat < 2.5 and d_yaw < math.pi / 4.0:
        weight = max(0.1, min(1.0, 1.0 - (dist / proximity_thresh)))
        return IntentEdgeType.FOLLOWING, weight, ttc

    # 4. Crossing (Intersecting angle ~90 deg)
    if math.pi / 4.0 <= d_yaw <= 3.0 * math.pi / 4.0:
        weight = max(0.1, min(1.0, 1.0 - (dist / proximity_thresh)))
        return IntentEdgeType.CROSSING, weight, ttc

    # 5. Overtaking (Lateral offset + speed differential)
    speed_i = math.hypot(vel_i[0], vel_i[1])
    speed_j = math.hypot(vel_j[0], vel_j[1])
    if d_lat < 3.5 and abs(speed_i - speed_j) > 2.0 and d_yaw < math.pi / 4.0:
        return IntentEdgeType.OVERTAKING, 0.7, ttc

    # 6. Yield Negotiation
    if dist < 12.0 and (speed_i < 3.0 or speed_j < 3.0):
        return IntentEdgeType.YIELD_NEGOTIATION, 0.6, ttc

    # Default Proximity
    norm_weight = max(0.05, 1.0 - (dist / proximity_thresh))
    return IntentEdgeType.PROXIMITY, norm_weight, ttc
