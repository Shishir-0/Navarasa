"""
NAVRASA High-Fidelity Synthetic Simulation Engine for Unstructured Indian Roads.

Simulates heterogeneous road participants (Autorickshaws, Two-Wheelers, Pedestrians,
Cattle, Buses, Cars) with non-lane-abiding behaviors, sudden lateral swerves,
occluded pop-outs, and noisy multi-sensor streams (LiDAR, Camera, Radar).
"""

from __future__ import annotations
import math
import random
from typing import List, Dict, Optional, Tuple
import numpy as np

from backend.core.types import (
    ActorType,
    ActorState,
    Vector2D,
    BoundingBox3D,
    SensorDetection
)
from backend.core.math_utils import (
    wrap_to_pi,
    compute_obb_corners,
    check_sat_collision,
    raycast_polygon
)


class SyntheticActor:
    """Internal dynamic agent in the simulation."""
    def __init__(
        self,
        actor_id: str,
        actor_type: ActorType,
        x: float,
        y: float,
        heading: float,
        speed: float,
        behavior: str = "CRUISE",
        length: float = 4.0,
        width: float = 1.8,
        height: float = 1.5,
        trigger_time_s: float = 0.0
    ):
        self.actor_id = actor_id
        self.actor_type = actor_type
        self.x = x
        self.y = y
        self.heading = heading
        self.speed = speed
        self.yaw_rate = 0.0
        self.acceleration = 0.0
        self.behavior = behavior
        self.length = length
        self.width = width
        self.height = height
        self.trigger_time_s = trigger_time_s
        self.is_occluded = False

    def update(self, dt: float, sim_time: float, ego_x: float, ego_y: float):
        """Updates agent physics and Indian road behavioral heuristics."""
        if sim_time < self.trigger_time_s:
            return

        if self.behavior == "CUT_IN":
            # Accelerates and steers diagonally into ego's lane
            if self.y > 0.1:
                self.heading = wrap_to_pi(self.heading - 0.15 * dt)
                self.speed = max(4.0, self.speed + 0.5 * dt)
            else:
                # Straighten out and decelerate
                self.heading = wrap_to_pi(self.heading * 0.9)
                self.speed = max(2.5, self.speed - 2.0 * dt)
        elif self.behavior == "CROSSING":
            # Pedestrian crosswalk or jaywalk
            self.speed = 1.4
            self.heading = -math.pi / 2.0  # Crossing laterally
        elif self.behavior == "WRONG_WAY":
            # Two-wheeler driving against the standard traffic direction
            self.heading = math.pi
            self.speed = 6.0
        elif self.behavior == "SWERVE_LATERAL":
            # Abrupt lateral nudge around a road defect / pothole
            self.y += 0.8 * math.sin(sim_time * 2.0) * dt
        elif self.behavior == "STATIC":
            self.speed = 0.0
            self.yaw_rate = 0.0

        # Kinematic unicycle motion model
        vx = self.speed * math.cos(self.heading)
        vy = self.speed * math.sin(self.heading)
        self.x += vx * dt
        self.y += vy * dt

    def to_actor_state(self) -> ActorState:
        return ActorState(
            actor_id=self.actor_id,
            actor_type=self.actor_type,
            position=Vector2D(x=self.x, y=self.y),
            heading=self.heading,
            velocity=Vector2D(x=self.speed * math.cos(self.heading), y=self.speed * math.sin(self.heading)),
            speed=self.speed,
            yaw_rate=self.yaw_rate,
            acceleration=self.acceleration,
            bbox=BoundingBox3D(length=self.length, width=self.width, height=self.height),
            is_occluded=self.is_occluded,
            confidence=1.0
        )


class SyntheticWorld:
    """Micro-simulation world containing Ego vehicle, heterogeneous traffic, and sensors."""

    def __init__(self, seed: int = 42):
        random.seed(seed)
        np.random.seed(seed)
        self.sim_time = 0.0
        self.dt = 0.05
        self.actors: Dict[str, SyntheticActor] = {}
        self.ego = SyntheticActor(
            actor_id="ego",
            actor_type=ActorType.EGO,
            x=0.0,
            y=0.0,
            heading=0.0,
            speed=8.0,
            length=4.8,
            width=2.0
        )

    def load_scenario(self, scenario_dict: dict):
        """Initializes agents from a scenario definition dictionary."""
        self.sim_time = 0.0
        self.actors.clear()

        ego_cfg = scenario_dict.get("ego_start", {})
        self.ego.x = ego_cfg.get("x", 0.0)
        self.ego.y = ego_cfg.get("y", 0.0)
        self.ego.heading = ego_cfg.get("heading", 0.0)
        self.ego.speed = ego_cfg.get("speed", 8.0)

        type_dim_map = {
            ActorType.AUTORICKSHAW: (2.8, 1.4, 1.8),
            ActorType.TWO_WHEELER: (1.9, 0.8, 1.4),
            ActorType.PEDESTRIAN: (0.6, 0.6, 1.7),
            ActorType.CATTLE: (2.2, 1.1, 1.5),
            ActorType.BUS: (10.5, 2.6, 3.2),
            ActorType.TRUCK: (8.0, 2.5, 3.0),
            ActorType.CAR: (4.5, 1.9, 1.5),
            ActorType.STATIC_OBSTACLE: (1.0, 1.0, 0.8),
        }

        for a_dict in scenario_dict.get("actors", []):
            atype = ActorType(a_dict["type"])
            dims = type_dim_map.get(atype, (4.0, 1.8, 1.5))
            actor = SyntheticActor(
                actor_id=a_dict["id"],
                actor_type=atype,
                x=a_dict["start_x"],
                y=a_dict["start_y"],
                heading=a_dict["heading"],
                speed=a_dict.get("speed", 0.0),
                behavior=a_dict.get("behavior", "CRUISE"),
                length=dims[0],
                width=dims[1],
                height=dims[2],
                trigger_time_s=a_dict.get("trigger_time_s", 0.0)
            )
            self.actors[actor.actor_id] = actor

    def step(self, ego_steer: float = 0.0, ego_accel: float = 0.0, dt: Optional[float] = None):
        """Advances physics and kinematic states by dt."""
        step_dt = dt or self.dt
        self.sim_time += step_dt

        # Update Ego vehicle via non-linear Kinematic Bicycle model
        wheelbase = 2.8
        self.ego.speed = max(0.0, min(20.0, self.ego.speed + ego_accel * step_dt))
        self.ego.yaw_rate = (self.ego.speed / wheelbase) * math.tan(ego_steer)
        self.ego.heading = wrap_to_pi(self.ego.heading + self.ego.yaw_rate * step_dt)
        self.ego.x += self.ego.speed * math.cos(self.ego.heading) * step_dt
        self.ego.y += self.ego.speed * math.sin(self.ego.heading) * step_dt

        # Update all dynamic participants
        for actor in self.actors.values():
            actor.update(step_dt, self.sim_time, self.ego.x, self.ego.y)

        # Compute Line-of-Sight Occlusion
        self._compute_occlusions()

    def _compute_occlusions(self):
        """Ray-casts from ego sensor to each actor center to check if occluded by larger bodies."""
        ego_pos = np.array([self.ego.x, self.ego.y], dtype=np.float64)

        # Collect potential occluders (Buses, Trucks, Cars)
        occluders = []
        for a in self.actors.values():
            if a.actor_type in (ActorType.BUS, ActorType.TRUCK, ActorType.CAR):
                poly = compute_obb_corners(a.x, a.y, a.heading, a.length, a.width)
                occluders.append((a.actor_id, poly))

        for a in self.actors.values():
            target_pos = np.array([a.x, a.y], dtype=np.float64)
            ray = target_pos - ego_pos
            dist_to_target = np.linalg.norm(ray)
            if dist_to_target < 1e-3:
                a.is_occluded = False
                continue

            ray_dir = ray / dist_to_target
            is_blocked = False
            for occluder_id, poly in occluders:
                if occluder_id == a.actor_id:
                    continue
                hit_dist = raycast_polygon(ego_pos, ray_dir, poly, max_range=dist_to_target - 0.5)
                if hit_dist is not None and hit_dist < dist_to_target - 0.5:
                    is_blocked = True
                    break
            a.is_occluded = is_blocked

    def generate_sensor_detections(
        self,
        lidar_noise_std: float = 0.1,
        camera_noise_std: float = 0.3,
        radar_noise_std: float = 0.25
    ) -> List[SensorDetection]:
        """
        Simulates noisy measurements from multi-modal sensor suite (LiDAR, Camera, Radar).
        """
        detections: List[SensorDetection] = []
        det_idx = 0

        for a in self.actors.values():
            # If severely occluded, measurement drop probability is high
            if a.is_occluded and random.random() < 0.75:
                continue

            # Distance to ego
            dist = math.hypot(a.x - self.ego.x, a.y - self.ego.y)
            if dist > 60.0:
                continue  # Out of sensor range

            # 1. LiDAR Detection (High spatial precision)
            lidar_x = a.x + np.random.normal(0, lidar_noise_std)
            lidar_y = a.y + np.random.normal(0, lidar_noise_std)
            detections.append(SensorDetection(
                detection_id=f"det_lidar_{det_idx}",
                sensor_type="LIDAR",
                position=Vector2D(x=float(lidar_x), y=float(lidar_y)),
                bbox=BoundingBox3D(length=a.length, width=a.width, height=a.height),
                heading=float(a.heading + np.random.normal(0, 0.05)),
                confidence=0.95 if not a.is_occluded else 0.4,
                covariance=[[lidar_noise_std**2, 0.0], [0.0, lidar_noise_std**2]]
            ))
            det_idx += 1

            # 2. Radar Detection (Direct Doppler velocity measurement)
            if random.random() < 0.90:  # Radar detection probability
                rad_x = a.x + np.random.normal(0, radar_noise_std)
                rad_y = a.y + np.random.normal(0, radar_noise_std)
                vx = a.speed * math.cos(a.heading) + np.random.normal(0, 0.2)
                vy = a.speed * math.sin(a.heading) + np.random.normal(0, 0.2)
                detections.append(SensorDetection(
                    detection_id=f"det_radar_{det_idx}",
                    sensor_type="RADAR",
                    position=Vector2D(x=float(rad_x), y=float(rad_y)),
                    bbox=BoundingBox3D(length=a.length, width=a.width, height=a.height),
                    velocity=Vector2D(x=float(vx), y=float(vy)),
                    confidence=0.85,
                    covariance=[[radar_noise_std**2, 0.0], [0.0, radar_noise_std**2]]
                ))
                det_idx += 1

        return detections

    def get_ego_state(self) -> ActorState:
        return self.ego.to_actor_state()

    def get_all_actor_states(self) -> List[ActorState]:
        return [a.to_actor_state() for a in self.actors.values()]
