"""
NAVRASA Simulation Package.

Provides high-fidelity CARLA simulator integration, sensor pipelines,
scenario definitions, live streaming publisher, and synthetic fallback dynamics.
"""

from simulation.carla_bridge import CarlaBridge, CARLA_AVAILABLE
from simulation.synthetic_world import SyntheticWorld
from simulation.scenarios import load_all_scenarios, get_scenario_by_id

__all__ = [
    "CarlaBridge",
    "CARLA_AVAILABLE",
    "SyntheticWorld",
    "load_all_scenarios",
    "get_scenario_by_id",
]
