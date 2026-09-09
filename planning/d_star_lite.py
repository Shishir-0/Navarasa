"""
NAVRASA D* Lite Dynamic Incremental Replanner.

Mathematical Foundation:
------------------------
Koenig & Likhachev D* Lite algorithm:
  Backward search from s_goal to s_start.
  Maintains RHS values: rhs(s) = min_{s' in Succ(s)} ( c(s, s') + g(s') )
  Key(s) = [ min(g(s), rhs(s)) + h(s_start, s) + k_m,  min(g(s), rhs(s)) ]
  When edge costs change dynamically (obstacle pop-outs), updates k_m and re-evaluates
  only affected inconsistent vertices without re-planning the whole graph from scratch.
"""

from __future__ import annotations
import heapq
import math
from typing import Dict, List, Tuple, Optional, Set


class DStarLite:
    """Incremental heuristic replanner for dynamic obstacle insertion."""

    def __init__(self, resolution: float = 0.5):
        self.res = resolution
        self.g: Dict[Tuple[int, int], float] = {}
        self.rhs: Dict[Tuple[int, int], float] = {}
        self.U: List[Tuple[Tuple[float, float], Tuple[int, int]]] = []
        self.km = 0.0
        self.s_start: Tuple[int, int] = (0, 0)
        self.s_goal: Tuple[int, int] = (0, 0)
        self.s_last: Tuple[int, int] = (0, 0)
        self.obstacles: Set[Tuple[int, int]] = set()

    def _heuristic(self, s1: Tuple[int, int], s2: Tuple[int, int]) -> float:
        return math.hypot(s1[0] - s2[0], s1[1] - s2[1]) * self.res

    def _calculate_key(self, s: Tuple[int, int]) -> Tuple[float, float]:
        g_val = self.g.get(s, float("inf"))
        rhs_val = self.rhs.get(s, float("inf"))
        min_val = min(g_val, rhs_val)
        k1 = min_val + self._heuristic(self.s_start, s) + self.km
        k2 = min_val
        return (k1, k2)

    def _cost(self, u: Tuple[int, int], v: Tuple[int, int]) -> float:
        if u in self.obstacles or v in self.obstacles:
            return float("inf")
        dx = abs(u[0] - v[0])
        dy = abs(u[1] - v[1])
        if dx == 1 and dy == 1:
            return 1.4142 * self.res
        elif dx + dy == 1:
            return 1.0 * self.res
        return float("inf")

    def _neighbors(self, s: Tuple[int, int]) -> List[Tuple[int, int]]:
        motions = [
            (1, 0), (-1, 0), (0, 1), (0, -1),
            (1, 1), (1, -1), (-1, 1), (-1, -1)
        ]
        return [(s[0] + dx, s[1] + dy) for dx, dy in motions]

    def _update_vertex(self, u: Tuple[int, int]):
        if u != self.s_goal:
            min_rhs = float("inf")
            for sprime in self._neighbors(u):
                c = self._cost(u, sprime)
                val = c + self.g.get(sprime, float("inf"))
                if val < min_rhs:
                    min_rhs = val
            self.rhs[u] = min_rhs

        # Remove u from U
        self.U = [item for item in self.U if item[1] != u]
        heapq.heapify(self.U)

        g_u = self.g.get(u, float("inf"))
        rhs_u = self.rhs.get(u, float("inf"))

        if not math.isclose(g_u, rhs_u, abs_tol=1e-6):
            heapq.heappush(self.U, (self._calculate_key(u), u))

    def _compute_shortest_path(self, max_iterations: int = 50000):
        iterations = 0
        while self.U and iterations < max_iterations:
            iterations += 1
            k_old, u = self.U[0]
            k_new = self._calculate_key(u)

            k_start = self._calculate_key(self.s_start)
            g_start = self.g.get(self.s_start, float("inf"))
            rhs_start = self.rhs.get(self.s_start, float("inf"))

            if k_old >= k_start and math.isclose(g_start, rhs_start, abs_tol=1e-6):
                break

            if k_old < k_new:
                heapq.heappop(self.U)
                heapq.heappush(self.U, (k_new, u))
            else:
                heapq.heappop(self.U)
                g_u = self.g.get(u, float("inf"))
                rhs_u = self.rhs.get(u, float("inf"))

                if g_u > rhs_u:
                    self.g[u] = rhs_u
                    for sprime in self._neighbors(u):
                        self._update_vertex(sprime)
                else:
                    self.g[u] = float("inf")
                    self._update_vertex(u)
                    for sprime in self._neighbors(u):
                        self._update_vertex(sprime)

    def initialize(self, start_pos: Tuple[float, float], goal_pos: Tuple[float, float]):
        """Initializes D* Lite search from start to goal."""
        self.g.clear()
        self.rhs.clear()
        self.U.clear()
        self.km = 0.0

        self.s_start = (int(round(start_pos[0] / self.res)), int(round(start_pos[1] / self.res)))
        self.s_goal = (int(round(goal_pos[0] / self.res)), int(round(goal_pos[1] / self.res)))
        self.s_last = self.s_start

        self.rhs[self.s_goal] = 0.0
        heapq.heappush(self.U, (self._calculate_key(self.s_goal), self.s_goal))
        self._compute_shortest_path()

    def update_obstacle(self, obs_pos: Tuple[float, float], is_obstacle: bool = True):
        """Dynamically inserts or clears an obstacle cell and incrementally updates paths."""
        obs_node = (int(round(obs_pos[0] / self.res)), int(round(obs_pos[1] / self.res)))
        if is_obstacle:
            self.obstacles.add(obs_node)
        else:
            self.obstacles.discard(obs_node)

        self.km += self._heuristic(self.s_last, self.s_start)
        self.s_last = self.s_start
        self._update_vertex(obs_node)
        for nbr in self._neighbors(obs_node):
            self._update_vertex(nbr)

        self._compute_shortest_path()

    def extract_path(self, max_steps: int = 500) -> List[Tuple[float, float]]:
        """Extracts current optimal path from s_start to s_goal."""
        path = [(self.s_start[0] * self.res, self.s_start[1] * self.res)]
        curr = self.s_start
        steps = 0

        while curr != self.s_goal and steps < max_steps:
            steps += 1
            best_nbr = None
            min_cost = float("inf")

            for nbr in self._neighbors(curr):
                c = self._cost(curr, nbr)
                val = c + self.g.get(nbr, float("inf"))
                if val < min_cost:
                    min_cost = val
                    best_nbr = nbr

            if best_nbr is None or min_cost == float("inf"):
                break

            curr = best_nbr
            path.append((curr[0] * self.res, curr[1] * self.res))

        return path
