"""
Unit tests for Mahalanobis gating and Hungarian matching.
"""

import numpy as np
import pytest
from tracking.gating import compute_mahalanobis_distance_sq, is_detection_within_gate
from tracking.matching import associate_detections_to_tracks


def test_mahalanobis_gating():
    # Innovation y=[0, 0] -> d2 = 0
    y = np.array([0.0, 0.0])
    S = np.eye(2)
    d2 = compute_mahalanobis_distance_sq(y, S)
    assert d2 == 0.0
    assert is_detection_within_gate(d2, dof=2) is True

    # Outlier y=[10, 10] -> d2 = 200 > 9.21
    y_out = np.array([10.0, 10.0])
    d2_out = compute_mahalanobis_distance_sq(y_out, S)
    assert is_detection_within_gate(d2_out, dof=2) is False


def test_hungarian_matching_exact():
    tracks = [(0.0, 0.0), (10.0, 10.0), (20.0, 0.0)]
    detections = [(10.1, 9.9), (0.1, -0.1), (20.05, 0.05)]

    matched, unmatched_t, unmatched_d = associate_detections_to_tracks(
        tracks, detections, max_distance_threshold=2.0
    )

    assert len(matched) == 3
    assert len(unmatched_t) == 0
    assert len(unmatched_d) == 0

    # Check correct pair assignments
    matched_dict = dict(matched)
    assert matched_dict[0] == 1  # Track 0 (0,0) matches Det 1 (0.1, -0.1)
    assert matched_dict[1] == 0  # Track 1 (10,10) matches Det 0 (10.1, 9.9)
    assert matched_dict[2] == 2  # Track 2 (20,0) matches Det 2 (20.05, 0.05)


def test_hungarian_matching_unmatched_outlier():
    tracks = [(0.0, 0.0)]
    detections = [(50.0, 50.0)]  # Beyond 4m threshold

    matched, unmatched_t, unmatched_d = associate_detections_to_tracks(
        tracks, detections, max_distance_threshold=4.0
    )

    assert len(matched) == 0
    assert len(unmatched_t) == 1
    assert len(unmatched_d) == 1
