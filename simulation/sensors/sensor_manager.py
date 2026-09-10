"""
Sensor classes for the NAVRASA simulation pipeline.

SensorManager  — lifecycle manager for all attached sensors
CameraSensor   — RGB camera, stores latest carla.Image in .image_data
LidarSensor    — Raycast LiDAR, stores latest carla.LidarMeasurement in .lidar_data
RadarSensor    — Radar, stores latest carla.RadarMeasurement in .radar_data

All sensors use weakref callbacks to avoid circular references and GC issues.
Sensor data is raw CARLA objects — downstream code accesses .image_data /
.lidar_data / .radar_data attributes directly.

NOTE: These sensors are for ground-truth algorithm input.
      The RecordingManager (recording_manager.py) handles screenshot cameras separately.
"""

try:
    import carla
except ImportError:
    import simulation.carla_shim as carla
import weakref


class SensorManager:
    """Tracks all sensor actors so they can be cleanly destroyed together."""

    def __init__(self, world, ego_vehicle):
        self.world       = world
        self.ego_vehicle = ego_vehicle
        self.sensors     = []   # list of carla.Actor

    def destroy(self):
        for sensor in self.sensors:
            try:
                if sensor is not None and sensor.is_alive:
                    sensor.stop()
                    sensor.destroy()
            except Exception as exc:
                print(f"[SensorManager] WARNING: could not destroy sensor {getattr(sensor, 'id', '?')}: {exc}")
        self.sensors.clear()


class CameraSensor:
    """RGB camera attached to ego vehicle."""

    def __init__(self, sensor_manager, width, height, fov, transform):
        self.image_data    = None
        self.sensor_manager = sensor_manager

        bp = sensor_manager.world.get_blueprint_library().find('sensor.camera.rgb')
        bp.set_attribute('image_size_x', str(width))
        bp.set_attribute('image_size_y', str(height))
        bp.set_attribute('fov', str(fov))

        self.sensor = sensor_manager.world.spawn_actor(
            bp, transform, attach_to=sensor_manager.ego_vehicle
        )
        sensor_manager.sensors.append(self.sensor)

        weak_self = weakref.ref(self)
        self.sensor.listen(lambda img: CameraSensor._on_image(weak_self, img))

    @staticmethod
    def _on_image(weak_self, image):
        obj = weak_self()
        if obj:
            obj.image_data = image


class LidarSensor:
    """32-channel raycast LiDAR attached to ego vehicle."""

    def __init__(self, sensor_manager, range_m, transform):
        self.lidar_data    = None
        self.sensor_manager = sensor_manager

        bp = sensor_manager.world.get_blueprint_library().find('sensor.lidar.ray_cast')
        bp.set_attribute('range',             str(range_m))
        bp.set_attribute('channels',          '32')
        bp.set_attribute('points_per_second', '100000')
        bp.set_attribute('rotation_frequency', str(int(1 / settings_fps())))

        self.sensor = sensor_manager.world.spawn_actor(
            bp, transform, attach_to=sensor_manager.ego_vehicle
        )
        sensor_manager.sensors.append(self.sensor)

        weak_self = weakref.ref(self)
        self.sensor.listen(lambda data: LidarSensor._on_data(weak_self, data))

    @staticmethod
    def _on_data(weak_self, data):
        obj = weak_self()
        if obj:
            obj.lidar_data = data


class RadarSensor:
    """Forward-facing radar attached to ego vehicle."""

    def __init__(self, sensor_manager, range_m, transform):
        self.radar_data    = None
        self.sensor_manager = sensor_manager

        bp = sensor_manager.world.get_blueprint_library().find('sensor.other.radar')
        bp.set_attribute('horizontal_fov', '35')
        bp.set_attribute('vertical_fov',   '20')
        bp.set_attribute('range',          str(range_m))

        self.sensor = sensor_manager.world.spawn_actor(
            bp, transform, attach_to=sensor_manager.ego_vehicle
        )
        sensor_manager.sensors.append(self.sensor)

        weak_self = weakref.ref(self)
        self.sensor.listen(lambda data: RadarSensor._on_data(weak_self, data))

    @staticmethod
    def _on_data(weak_self, data):
        obj = weak_self()
        if obj:
            obj.radar_data = data


def settings_fps():
    """Return simulation FPS from settings without importing carla."""
    try:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from config import settings
        return 1.0 / settings.FIXED_DELTA_SECONDS
    except Exception:
        return 20.0
