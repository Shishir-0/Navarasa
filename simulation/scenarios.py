"""
NAVRASA Scenario Definitions and Benchmark Loader.
"""

from __future__ import annotations
import os
import yaml
from typing import List, Dict, Any, Optional


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
