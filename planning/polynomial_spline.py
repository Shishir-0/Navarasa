"""
NAVRASA Quintic Polynomial Trajectory Optimization & Jerk Minimization.

Mathematical Foundation:
------------------------
For 1D coordinate p(t) over horizon T:
  p(t)   = a0 + a1*t + a2*t^2 + a3*t^3 + a4*t^4 + a5*t^5
  v(t)   = a1 + 2*a2*t + 3*a3*t^2 + 4*a4*t^3 + 5*a5*t^4
  a(t)   = 2*a2 + 6*a3*t + 12*a4*t^2 + 20*a5*t^3
  jerk(t)= 6*a3 + 24*a4*t + 60*a5*t^2

Boundary Conditions:
  p(0) = p0,  v(0) = v0,  a(0) = a0
  p(T) = p1,  v(T) = v1,  a(T) = a1

Linear System:
  [ T^3   T^4   T^5  ] [a3]   [ p1 - p0 - v0*T - 0.5*a0*T^2 ]
  [ 3T^2  4T^3  5T^4 ] [a4] = [ v1 - v0 - a0*T              ]
  [ 6T    12T^2 20T^3] [a5]   [ a1 - a0                     ]

Objective:
  Minimizes integral_0^T ( jerk(t) )^2 dt
"""

from __future__ import annotations
import math
from typing import List, Tuple
import numpy as np

from backend.core.types import TrajectoryPoint


class QuinticPolynomial1D:
    """1D Quintic Polynomial trajectory segment."""

    def __init__(
        self,
        p0: float,
        v0: float,
        a0: float,
        p1: float,
        v1: float,
        a1: float,
        T: float
    ):
        self.T = max(1e-3, T)
        self.a0 = p0
        self.a1 = v0
        self.a2 = 0.5 * a0

        # Solve for a3, a4, a5
        A = np.array([
            [self.T**3,      self.T**4,       self.T**5      ],
            [3.0 * self.T**2, 4.0 * self.T**3, 5.0 * self.T**4],
            [6.0 * self.T,   12.0 * self.T**2, 20.0 * self.T**3]
        ], dtype=np.float64)

        b = np.array([
            p1 - self.a0 - self.a1 * self.T - self.a2 * self.T**2,
            v1 - self.a1 - 2.0 * self.a2 * self.T,
            a1 - 2.0 * self.a2
        ], dtype=np.float64)

        x = np.linalg.solve(A, b)
        self.a3 = float(x[0])
        self.a4 = float(x[1])
        self.a5 = float(x[2])

    def calc_point(self, t: float) -> float:
        return self.a0 + self.a1 * t + self.a2 * t**2 + self.a3 * t**3 + self.a4 * t**4 + self.a5 * t**5

    def calc_first_derivative(self, t: float) -> float:
        return self.a1 + 2.0 * self.a2 * t + 3.0 * self.a3 * t**2 + 4.0 * self.a4 * t**3 + 5.0 * self.a5 * t**4

    def calc_second_derivative(self, t: float) -> float:
        return 2.0 * self.a2 + 6.0 * self.a3 * t + 12.0 * self.a4 * t**2 + 20.0 * self.a5 * t**3

    def calc_third_derivative(self, t: float) -> float:
        return 6.0 * self.a3 + 24.0 * self.a4 * t + 60.0 * self.a5 * t**2


class QuinticTrajectoryOptimizer:
    """2D Trajectory generation and smoothing via coupled quintic polynomials."""

    def optimize_path(
        self,
        start_state: Tuple[float, float, float, float, float, float],  # (x0, y0, vx0, vy0, ax0, ay0)
        goal_state: Tuple[float, float, float, float, float, float],   # (x1, y1, vx1, vy1, ax1, ay1)
        horizon_T: float = 3.0,
        num_points: int = 30
    ) -> List[TrajectoryPoint]:
        """
        Generates a smooth C^2 continuous trajectory from start to goal minimizing jerk.
        """
        x0, y0, vx0, vy0, ax0, ay0 = start_state
        x1, y1, vx1, vy1, ax1, ay1 = goal_state

        poly_x = QuinticPolynomial1D(x0, vx0, ax0, x1, vx1, ax1, horizon_T)
        poly_y = QuinticPolynomial1D(y0, vy0, ay0, y1, vy1, ay1, horizon_T)

        times = np.linspace(0.0, horizon_T, num_points)
        trajectory: List[TrajectoryPoint] = []

        for t in times:
            px = poly_x.calc_point(t)
            py = poly_y.calc_point(t)
            vx = poly_x.calc_first_derivative(t)
            vy = poly_y.calc_first_derivative(t)
            ax = poly_x.calc_second_derivative(t)
            ay = poly_y.calc_second_derivative(t)
            jx = poly_x.calc_third_derivative(t)
            jy = poly_y.calc_third_derivative(t)

            speed = math.hypot(vx, vy)
            yaw = math.atan2(vy, vx) if speed > 1e-3 else 0.0
            accel = math.hypot(ax, ay)
            jerk = math.hypot(jx, jy)

            # Curvature: kappa = (vx*ay - vy*ax) / (vx^2 + vy^2)^(3/2)
            denom = max(1e-4, speed**3)
            curvature = (vx * ay - vy * ax) / denom

            trajectory.append(TrajectoryPoint(
                x=float(px),
                y=float(py),
                v=float(speed),
                yaw=float(yaw),
                curvature=float(curvature),
                acceleration=float(accel),
                jerk=float(jerk),
                time=float(t)
            ))

        return trajectory
