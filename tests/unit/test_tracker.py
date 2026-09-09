"""
Unit tests for MultiTargetTracker and track lifecycle transitions.
"""

import pytest
from tracking.tracker import MultiTargetTracker
from backend.core.types import SensorDetection, Vector2D, BoundingBox3D, TrackStatus


def test_tracker_lifecycle_confirmation():
    tracker = MultiTargetTracker()
    bbox = BoundingBox3D(length=4.0, width=1.8, height=1.5)

    # Frame 1: Initial detection -> Tentative
    det1 = SensorDetection(
        detection_id="d1",
        sensor_type="LIDAR",
        position=Vector2D(x=10.0, y=0.0),
        bbox=bbox
    )
    tracks_f1 = tracker.step([det1], dt=0.1)
    # Tentative tracks are not in confirmed list yet
    assert len(tracks_f1) == 0
    assert len(tracker.tracks) == 1
    t_id = list(tracker.tracks.keys())[0]
    assert tracker.tracks[t_id].status == TrackStatus.TENTATIVE

    # Frame 2: Second detection
    det2 = SensorDetection(
        detection_id="d2",
        sensor_type="LIDAR",
        position=Vector2D(x=11.0, y=0.0),
        bbox=bbox
    )
    tracks_f2 = tracker.step([det2], dt=0.1)
    assert tracker.tracks[t_id].hits == 2

    # Frame 3: Third detection -> Confirmed!
    det3 = SensorDetection(
        detection_id="d3",
        sensor_type="LIDAR",
        position=Vector2D(x=12.0, y=0.0),
        bbox=bbox
    )
    tracks_f3 = tracker.step([det3], dt=0.1)
    assert len(tracks_f3) == 1
    assert tracks_f3[0].status == TrackStatus.CONFIRMED
    assert tracks_f3[0].track_id == t_id


def test_tracker_coasting_and_deletion():
    tracker = MultiTargetTracker()
    bbox = BoundingBox3D(length=4.0, width=1.8, height=1.5)

    # Confirm a track over 3 frames
    for i in range(3):
        det = SensorDetection(
            detection_id=f"d_{i}",
            sensor_type="LIDAR",
            position=Vector2D(x=10.0 + i, y=0.0),
            bbox=bbox
        )
        tracker.step([det], dt=0.1)

    t_id = list(tracker.tracks.keys())[0]
    assert tracker.tracks[t_id].status == TrackStatus.CONFIRMED

    # Miss detections -> Coasting
    tracks_coast = tracker.step([], dt=0.1)
    assert len(tracks_coast) == 1
    assert tracks_coast[0].status == TrackStatus.COASTING
    assert tracker.tracks[t_id].misses == 1

    # Miss 5 more frames -> Deletion
    for _ in range(5):
        tracker.step([], dt=0.1)

    assert len(tracker.tracks) == 0
