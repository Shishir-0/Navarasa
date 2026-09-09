"""
NAVRASA Global Bipartite Data Association & Hungarian Matching Engine.

Solves the maximum bipartite matching problem for Multi-Target Tracking
using the Munkres / Hungarian / Jonker-Volgenant algorithm via Scipy.
"""

from __future__ import annotations
import math
from typing import List, Tuple, Dict, Optional
import numpy as np
from scipy.optimize import linear_sum_assignment


def associate_detections_to_tracks(
    track_positions: List[Tuple[float, float]],
    detection_positions: List[Tuple[float, float]],
    max_distance_threshold: float = 4.0,
    cost_matrix_override: Optional[np.ndarray] = None
) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
    """
    Performs global optimal assignment between existing tracks and incoming sensor detections.

    Args:
        track_positions: List of (x, y) coordinates for existing tracks.
        detection_positions: List of (x, y) coordinates for new sensor detections.
        max_distance_threshold: Maximum gating distance (meters). Pairs exceeding this are unassigned.
        cost_matrix_override: Optional precomputed NxM cost matrix (e.g. Mahalanobis distance).

    Returns:
        matched_indices: List of (track_idx, detection_idx) matched pairs.
        unmatched_tracks: List of track indices that received no detection.
        unmatched_detections: List of detection indices that did not match any track.
    """
    num_tracks = len(track_positions)
    num_detections = len(detection_positions)

    if num_tracks == 0:
        return [], [], list(range(num_detections))
    if num_detections == 0:
        return [], list(range(num_tracks)), []

    if cost_matrix_override is not None:
        cost_matrix = cost_matrix_override
    else:
        # Build Euclidean distance cost matrix
        cost_matrix = np.zeros((num_tracks, num_detections), dtype=np.float64)
        for t_idx, (tx, ty) in enumerate(track_positions):
            for d_idx, (dx, dy) in enumerate(detection_positions):
                cost_matrix[t_idx, d_idx] = math.hypot(tx - dx, ty - dy)

    # Solve linear sum assignment problem in O(N^3)
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    matched: List[Tuple[int, int]] = []
    unmatched_tracks = set(range(num_tracks))
    unmatched_detections = set(range(num_detections))

    for r, c in zip(row_ind, col_ind):
        if cost_matrix[r, c] <= max_distance_threshold:
            matched.append((int(r), int(c)))
            unmatched_tracks.discard(int(r))
            unmatched_detections.discard(int(c))

    return matched, sorted(list(unmatched_tracks)), sorted(list(unmatched_detections))
