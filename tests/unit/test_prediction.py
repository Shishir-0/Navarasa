"""
Unit tests for Future Road Composer probabilistic predictor.
"""

import math
import pytest
from backend.core.types import (
    ActorType,
    TrackState,
    TrackStatus,
    Vector2D,
    BoundingBox3D
)
from prediction.future_composer import FutureRoadComposer


def test_future_road_composer_hypotheses():
    frc = FutureRoadComposer()
    bbox = BoundingBox3D(length=4.0, width=1.8, height=1.5)

    track = TrackState(
        track_id="trk_01",
        actor_type=ActorType.AUTORICKSHAW,
        status=TrackStatus.CONFIRMED,
        state_vector=[10.0, 2.0, 8.0, 0.0],
        covariance_matrix=[[0.1, 0.0], [0.0, 0.1]],
        position=Vector2D(x=10.0, y=2.0),
        velocity=Vector2D(x=8.0, y=0.0),
        speed=8.0,
        heading=0.0,
        yaw_rate=0.0,
        bbox=bbox
    )

    pred = frc.predict_actor_futures(track)
    assert pred.actor_id == "trk_01"
    assert len(pred.hypotheses) == 3

    # Check probabilities sum to 1.0
    prob_sum = sum(h.probability for h in pred.hypotheses)
    assert math.isclose(prob_sum, 1.0, abs_tol=1e-5)

    # Check waypoints horizon length (3.0s / 0.1s = 30 points)
    for h in pred.hypotheses:
        assert len(h.waypoints) == 30
        # Check monotonic time progression
        times = [wp.time for wp in h.waypoints]
        assert times[0] == pytest.approx(0.1)
        assert times[-1] == pytest.approx(3.0)
        # Check uncertainty growth
        assert h.waypoints[-1].std_x > h.waypoints[0].std_x
