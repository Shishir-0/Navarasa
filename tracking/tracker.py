"""
NAVRASA Multi-Target Tracking (MTT) & Lifecycle Manager.

Integrates state estimation (KF / UKF), statistical Mahalanobis gating,
Hungarian bipartite matching, and rigorous track lifecycle management
(Tentative -> Confirmed -> Coasting -> Deleted).
"""

from __future__ import annotations
import math
from typing import List, Dict, Optional, Tuple, Union
import numpy as np

from backend.core.types import (
    ActorType,
    TrackStatus,
    TrackState,
    SensorDetection,
    Vector2D,
    BoundingBox3D
)
from backend.core.config import TrackingConfig
from tracking.kalman_filter import LinearKalmanFilter
from tracking.ukf import UnscentedKalmanFilter
from tracking.matching import associate_detections_to_tracks
from tracking.gating import is_detection_within_gate


class Track:
    """Internal tracked object instance holding filter state and lifecycle metadata."""

    def __init__(
        self,
        track_id: str,
        detection: SensorDetection,
        filter_type: str = "UKF"
    ):
        self.track_id = track_id
        self.actor_type = ActorType.CAR  # Default semantic classification
        self.bbox = detection.bbox
        self.status = TrackStatus.TENTATIVE
        self.age = 1
        self.hits = 1
        self.misses = 0
        self.time_since_update = 0.0
        self.last_mahalanobis_d2 = 0.0
        self.filter_type = filter_type

        init_yaw = detection.heading if detection.heading is not None else 0.0
        init_vx = detection.velocity.x if detection.velocity is not None else 0.0
        init_vy = detection.velocity.y if detection.velocity is not None else 0.0
        init_speed = math.hypot(init_vx, init_vy)

        if filter_type == "UKF":
            self.kf: Union[LinearKalmanFilter, UnscentedKalmanFilter] = UnscentedKalmanFilter(
                init_x=detection.position.x,
                init_y=detection.position.y,
                init_v=init_speed,
                init_yaw=init_yaw
            )
        else:
            self.kf = LinearKalmanFilter(
                init_x=detection.position.x,
                init_y=detection.position.y,
                init_vx=init_vx,
                init_vy=init_vy
            )

    def predict(self, dt: float):
        """Advances state prediction by dt."""
        self.kf.predict(dt)
        self.age += 1
        self.time_since_update += dt

    def update(self, detection: SensorDetection, min_hits_confirm: int = 3):
        """Updates track with a matched detection."""
        self.bbox = detection.bbox
        R = np.array(detection.covariance, dtype=np.float64)
        d_m2 = self.kf.update_position(detection.position.x, detection.position.y, R_matrix=R)
        self.last_mahalanobis_d2 = d_m2
        self.hits += 1
        self.misses = 0
        self.time_since_update = 0.0

        if self.status == TrackStatus.TENTATIVE and self.hits >= min_hits_confirm:
            self.status = TrackStatus.CONFIRMED
        elif self.status == TrackStatus.COASTING:
            self.status = TrackStatus.CONFIRMED

    def mark_missed(self, max_age_misses: int = 5):
        """Marks track as missed when no sensor detection matches."""
        self.misses += 1
        if self.status == TrackStatus.CONFIRMED:
            self.status = TrackStatus.COASTING
        if self.misses > max_age_misses:
            self.status = TrackStatus.DELETED

    def to_track_state(self) -> TrackState:
        px, py = self.kf.position
        vx, vy = self.kf.velocity
        speed = self.kf.speed
        heading = self.kf.heading
        yaw_rate = getattr(self.kf, "yaw_rate", 0.0)

        cov_list = self.kf.P.tolist()
        state_vec = self.kf.x.tolist()

        return TrackState(
            track_id=self.track_id,
            actor_type=self.actor_type,
            status=self.status,
            state_vector=state_vec,
            covariance_matrix=cov_list,
            position=Vector2D(x=px, y=py),
            velocity=Vector2D(x=vx, y=vy),
            speed=speed,
            heading=heading,
            yaw_rate=yaw_rate,
            bbox=self.bbox,
            age=self.age,
            hits=self.hits,
            misses=self.misses,
            time_since_update=self.time_since_update,
            mahalanobis_distance=float(np.sqrt(max(0.0, self.last_mahalanobis_d2)))
        )


class MultiTargetTracker:
    """Autonomous multi-target tracker coordinating track initialization, updates, and deletion."""

    def __init__(self, config: Optional[TrackingConfig] = None):
        self.config = config or TrackingConfig()
        self.tracks: Dict[str, Track] = {}
        self._next_track_id = 1

    def step(self, detections: List[SensorDetection], dt: float = 0.05) -> List[TrackState]:
        """
        Executes one tracking cycle:
        1. Predict all existing tracks forward by dt.
        2. Solve bipartite data association against incoming sensor detections.
        3. Update matched tracks.
        4. Initialize new tentative tracks for unmatched detections.
        5. Mark unmatched tracks as missed and prune deleted tracks.
        """
        # 1. Predict
        for track in self.tracks.values():
            track.predict(dt)

        active_track_ids = [tid for tid, t in self.tracks.items() if t.status != TrackStatus.DELETED]
        track_positions = [self.tracks[tid].kf.position for tid in active_track_ids]
        detection_positions = [(d.position.x, d.position.y) for d in detections]

        # 2. Hungarian Data Association
        matched, unmatched_t_idxs, unmatched_d_idxs = associate_detections_to_tracks(
            track_positions=track_positions,
            detection_positions=detection_positions,
            max_distance_threshold=3.5
        )

        # 3. Update Matched Tracks
        for t_idx, d_idx in matched:
            tid = active_track_ids[t_idx]
            det = detections[d_idx]
            self.tracks[tid].update(det, min_hits_confirm=self.config.min_hits_confirm)

        # 4. Handle Unmatched Tracks
        for t_idx in unmatched_t_idxs:
            tid = active_track_ids[t_idx]
            self.tracks[tid].mark_missed(max_age_misses=self.config.max_age_misses)

        # 5. Initialize New Tracks for Unmatched Detections
        for d_idx in unmatched_d_idxs:
            det = detections[d_idx]
            new_id = f"trk_{self._next_track_id:04d}"
            self._next_track_id += 1
            new_track = Track(new_id, det, filter_type=self.config.filter_type)
            self.tracks[new_id] = new_track

        # 6. Prune Deleted Tracks
        self.tracks = {tid: t for tid, t in self.tracks.items() if t.status != TrackStatus.DELETED}

        # Return confirmed and coasting tracks (filter out tentative unless requested)
        return [t.to_track_state() for t in self.tracks.values() if t.status in (TrackStatus.CONFIRMED, TrackStatus.COASTING)]
