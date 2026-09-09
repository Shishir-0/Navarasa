"""
NAVRASA Maneuver Intent Modes & Heuristics for Unstructured Traffic.
"""

from __future__ import annotations
from enum import Enum


class ManeuverMode(str, Enum):
    """Multi-modal discrete maneuver hypotheses."""
    CRUISE_STRAIGHT = "CRUISE_STRAIGHT"
    AGGRESSIVE_CUT_IN = "AGGRESSIVE_CUT_IN"
    LATERAL_SWERVE_LEFT = "LATERAL_SWERVE_LEFT"
    LATERAL_SWERVE_RIGHT = "LATERAL_SWERVE_RIGHT"
    SUDDEN_BRAKE = "SUDDEN_BRAKE"
    YIELD_DECELERATE = "YIELD_DECELERATE"
    PEDESTRIAN_CROSSING = "PEDESTRIAN_CROSSING"
    NUDGE_OBSTACLE = "NUDGE_OBSTACLE"
