"""
NAVRASA CARLA Fallback Shim.
Provides fallback mock types and data structures when the CARLA PythonAPI egg is not installed.
"""

from typing import Any, Optional, Dict, List


class Location:
    def __init__(self, x: float = 0.0, y: float = 0.0, z: float = 0.0):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)

    def __add__(self, other):
        if hasattr(other, "x"):
            return Location(self.x + other.x, self.y + other.y, self.z + getattr(other, "z", 0.0))
        return Location(self.x + other, self.y + other, self.z + other)

    def __sub__(self, other):
        if hasattr(other, "x"):
            return Location(self.x - other.x, self.y - other.y, self.z - getattr(other, "z", 0.0))
        return Location(self.x - other, self.y - other, self.z - other)

    def __mul__(self, scalar):
        return Location(self.x * scalar, self.y * scalar, self.z * scalar)

    def distance(self, other) -> float:
        import math
        return math.sqrt((self.x - other.x)**2 + (self.y - other.y)**2 + (self.z - other.z)**2)


class Rotation:
    def __init__(self, pitch: float = 0.0, yaw: float = 0.0, roll: float = 0.0):
        self.pitch = float(pitch)
        self.yaw = float(yaw)
        self.roll = float(roll)


class Vector3D:
    def __init__(self, x: float = 0.0, y: float = 0.0, z: float = 0.0):
        self.x = float(x)
        self.y = float(y)
        self.z = float(z)

    def __mul__(self, scalar):
        return Vector3D(self.x * scalar, self.y * scalar, self.z * scalar)


class Transform:
    def __init__(self, location: Optional[Location] = None, rotation: Optional[Rotation] = None):
        self.location = location or Location()
        self.rotation = rotation or Rotation()

    def get_forward_vector(self) -> Vector3D:
        import math
        yaw_rad = math.radians(self.rotation.yaw)
        pitch_rad = math.radians(self.rotation.pitch)
        return Vector3D(
            math.cos(pitch_rad) * math.cos(yaw_rad),
            math.cos(pitch_rad) * math.sin(yaw_rad),
            math.sin(pitch_rad)
        )


class VehicleControl:
    def __init__(
        self,
        throttle: float = 0.0,
        steer: float = 0.0,
        brake: float = 0.0,
        hand_brake: bool = False,
        reverse: bool = False,
        manual_gear_shift: bool = False,
        gear: int = 0
    ):
        self.throttle = throttle
        self.steer = steer
        self.brake = brake
        self.hand_brake = hand_brake
        self.reverse = reverse
        self.manual_gear_shift = manual_gear_shift
        self.gear = gear


class WeatherParameters:
    def __init__(
        self,
        cloudiness: float = 0.0,
        precipitation: float = 0.0,
        precipitation_deposits: float = 0.0,
        wind_intensity: float = 0.0,
        sun_altitude_angle: float = 90.0,
        fog_density: float = 0.0,
        fog_distance: float = 0.0,
        wetness: float = 0.0
    ):
        self.cloudiness = cloudiness
        self.precipitation = precipitation
        self.precipitation_deposits = precipitation_deposits
        self.wind_intensity = wind_intensity
        self.sun_altitude_angle = sun_altitude_angle
        self.fog_density = fog_density
        self.fog_distance = fog_distance
        self.wetness = wetness

    ClearNoon = None
    WetNoon = None
    HardRainNoon = None


WeatherParameters.ClearNoon = WeatherParameters(cloudiness=10.0, precipitation=0.0, sun_altitude_angle=75.0)
WeatherParameters.WetNoon = WeatherParameters(cloudiness=50.0, precipitation=30.0, wetness=80.0)
WeatherParameters.HardRainNoon = WeatherParameters(cloudiness=90.0, precipitation=90.0, wetness=100.0)


class Client:
    def __init__(self, host: str = "127.0.0.1", port: int = 2000):
        self.host = host
        self.port = port

    def set_timeout(self, seconds: float):
        pass

    def get_world(self):
        return None

    def load_world(self, map_name: str):
        return None
