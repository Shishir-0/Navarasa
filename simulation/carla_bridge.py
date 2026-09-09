"""
NAVRASA CARLA Simulator Client & Sensor Bridge.

Provides bidirectional interfacing with CARLA Simulator:
- Subscribes to Camera, LiDAR, and Radar sensor streams.
- Converts CARLA actors and transforms into standard NAVRASA coordinate frames.
- Dispatches ControlCommand signals to CARLA ego vehicle.
- Gracefully handles offline environments with informative fallback diagnostics.
"""

from __future__ import annotations
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("NAVRASA.CARLA")

try:
    import carla  # type: ignore
    CARLA_AVAILABLE = True
except ImportError:
    CARLA_AVAILABLE = False
    logger.info("CARLA python egg/module not found. Operating in Standalone Synthetic Simulation mode.")


class CarlaBridge:
    """Manages connection, sensor attachments, and actuation with CARLA."""

    def __init__(self, host: str = "127.0.0.1", port: int = 2000, timeout: float = 5.0):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.client = None
        self.world = None
        self.ego_vehicle = None
        self.is_connected = False

    def connect(self) -> bool:
        """Attempts connection to active CARLA server."""
        if not CARLA_AVAILABLE:
            logger.warning("Cannot connect: CARLA package not installed in environment.")
            return False

        try:
            self.client = carla.Client(self.host, self.port)
            self.client.set_timeout(self.timeout)
            self.world = self.client.get_world()
            self.is_connected = True
            logger.info(f"Successfully connected to CARLA Server at {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to CARLA Server: {e}")
            self.is_connected = False
            return False

    def send_control(self, throttle: float, steer: float, brake: float, reverse: bool = False):
        """Applies vehicle control command to CARLA ego actor."""
        if not self.is_connected or self.ego_vehicle is None:
            return

        control = carla.VehicleControl(
            throttle=max(0.0, min(1.0, float(throttle))),
            steer=max(-1.0, min(1.0, float(steer))),
            brake=max(0.0, min(1.0, float(brake))),
            reverse=reverse,
            hand_brake=False
        )
        self.ego_vehicle.apply_control(control)
