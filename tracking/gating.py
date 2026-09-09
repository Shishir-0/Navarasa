"""
NAVRASA Statistical Gating & Mahalanobis Distance Validation.

Eliminates spurious detections and clutter prior to data association using
Chi-squared distribution thresholds.
"""

from __future__ import annotations
import numpy as np
from scipy.stats import chi2


CHI2_LOOKUP_99 = {
    1: 6.63,
    2: 9.21,    # Standard 2D position (x, y) gating threshold (p=0.01)
    3: 11.34,
    4: 13.28,   # 4D state (x, y, vx, vy)
    5: 15.09
}


def compute_mahalanobis_distance_sq(
    innovation: np.ndarray,
    innovation_covariance: np.ndarray
) -> float:
    """
    Computes d_M^2 = y^T * S^{-1} * y.
    """
    try:
        S_inv = np.linalg.inv(innovation_covariance)
        d2 = float(innovation.T @ S_inv @ innovation)
        return max(0.0, d2)
    except np.linalg.LinAlgError:
        return float("inf")


def is_detection_within_gate(
    d_mahalanobis_sq: float,
    dof: int = 2,
    confidence_level: float = 0.99
) -> bool:
    """
    Validates whether a measurement falls within the statistical validation region.
    """
    threshold = CHI2_LOOKUP_99.get(dof, chi2.ppf(confidence_level, df=dof))
    return d_mahalanobis_sq <= threshold
