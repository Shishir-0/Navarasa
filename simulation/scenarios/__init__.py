"""
NAVRASA Simulation Scenarios Suite.
Exposes benchmark loader functions and individual CARLA scenario classes.
"""

from __future__ import annotations
import os
import yaml
from typing import List, Dict, Any, Optional

from simulation.scenarios.base_scenario import BaseScenario
from simulation.scenarios.market import MarketScenario
from simulation.scenarios.village import VillageScenario
from simulation.scenarios.highway import HighwayScenario
from simulation.scenarios.junction import JunctionScenario
from simulation.scenarios.rain import RainScenario
from simulation.scenarios.cattle import CattleScenario
from simulation.scenarios.wrong_way import WrongWayScenario
from simulation.scenarios.pothole import PotholeScenario


def load_all_scenarios(config_path: str = "configs/scenarios.yaml") -> List[Dict[str, Any]]:
    """Loads all defined Indian road scenario benchmarks."""
    if not os.path.exists(config_path):
        return []
    with open(config_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
        return data.get("scenarios", [])


def get_scenario_by_id(scenario_id: str, config_path: str = "configs/scenarios.yaml") -> Optional[Dict[str, Any]]:
    """Fetches a specific scenario configuration by ID."""
    scenarios = load_all_scenarios(config_path)
    for s in scenarios:
        if s["id"] == scenario_id:
            return s
    return None


__all__ = [
    "BaseScenario",
    "MarketScenario",
    "VillageScenario",
    "HighwayScenario",
    "JunctionScenario",
    "RainScenario",
    "CattleScenario",
    "WrongWayScenario",
    "PotholeScenario",
    "load_all_scenarios",
    "get_scenario_by_id",
]
