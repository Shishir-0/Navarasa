"""
NAVRASA 2D Grid Baseline A* Planner.

Mathematical Foundation:
------------------------
Minimizes f(n) = g(n) + h(n) on a 2D discretized grid:
  g(n): Path cost from start to node n, including spatial risk penalties.
  h(n): Euclidean distance heuristic from node n to goal.

Complexity:
  Time: O(|V| log |V|) using priority queue.
  Space: O(|V|)
"""

from __future__ import annotations
import heapq
import math
from typing import List, Tuple, Optional, Set, Dict
import numpy as np

from backend.core.types import TrajectoryPoint, PlanState, RiskGridMap


class AStarPlanner:
    """Standard 2D Grid A* baseline planner for global connectivity."""

    def __init__(self, resolution: float = 0.5):
        self.res = resolution

    def plan(
        self,
        start_pos: Tuple[float, float],
        goal_pos: Tuple[float, float],
        risk_map: Optional[RiskGridMap] = None,
        max_iterations: int = 50000
    ) -> Optional[List[Tuple[float, float]]]:
        """
        Plans a 2D path from start_pos to goal_pos.

        Returns:
            List of (x, y) coordinates or None if no path found.
        """
        start_node = (round(start_pos[0] / self.res), round(start_pos[1] / self.res))
        goal_node = (round(goal_pos[0] / self.res), round(goal_pos[1] / self.res))

        open_set = []
        heapq.heappush(open_set, (0.0, start_node))
        came_from: Dict[Tuple[int, int], Tuple[int, int]] = {}
        g_score: Dict[Tuple[int, int], float] = {start_node: 0.0}

        # 8-connected grid motions
        motions = [
            (1, 0, 1.0), (-1, 0, 1.0), (0, 1, 1.0), (0, -1, 1.0),
            (1, 1, 1.4142), (1, -1, 1.4142), (-1, 1, 1.4142), (-1, -1, 1.4142)
        ]

        iterations = 0
        while open_set and iterations < max_iterations:
            iterations += 1
            current_f, current = heapq.heappop(open_set)

            if current == goal_node:
                # Reconstruct path
                path = []
                curr = current
                while curr in came_from:
                    path.append((curr[0] * self.res, curr[1] * self.res))
                    curr = came_from[curr]
                path.append((start_node[0] * self.res, start_node[1] * self.res))
                path.reverse()
                return path

            for dx, dy, cost in motions:
                neighbor = (current[0] + dx, current[1] + dy)
                wx = neighbor[0] * self.res
                wy = neighbor[1] * self.res

                # Additional risk potential penalty
                risk_cost = 0.0
                if risk_map is not None:
                    col = int((wx - risk_map.origin_x) / risk_map.resolution)
                    row = int((wy - risk_map.origin_y) / risk_map.resolution)
                    if 0 <= row < risk_map.height and 0 <= col < risk_map.width:
                        r_val = risk_map.data[row][col]
                        if r_val > 0.85:  # Impassable obstacle
                            continue
                        risk_cost = r_val * 10.0

                tentative_g = g_score[current] + cost * self.res + risk_cost

                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    h = math.hypot(neighbor[0] - goal_node[0], neighbor[1] - goal_node[1]) * self.res
                    heapq.heappush(open_set, (tentative_g + h, neighbor))

        return None
