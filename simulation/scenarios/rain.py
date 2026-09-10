try:
    from simulation.scenarios.base_scenario import BaseScenario
except ImportError:
    from base_scenario import BaseScenario

try:
    import carla
except ImportError:
    import simulation.carla_shim as carla
import random

class RainScenario(BaseScenario):
    """
    Rain & Low Visibility scenario — heavy rain, fog, night.
    Corner Case: A pedestrian appears only 8 m ahead of the ego in dense fog,
    giving near-zero reaction time — stress-tests perception and braking.
    """
    def __init__(self):
        rain_weather = carla.WeatherParameters(
            cloudiness=100.0,
            precipitation=100.0,
            precipitation_deposits=80.0,
            wind_intensity=70.0,
            sun_altitude_angle=-10.0,   # night
            fog_density=60.0,
            fog_distance=10.0,
            wetness=100.0,
        )
        super().__init__(
            map_name='Town01',
            weather=rain_weather,
            num_vehicles=15,
            num_pedestrians=5,
            scenario_name='rain',
        )

    def _spawn_dynamic_actors(self):
        super()._spawn_dynamic_actors()
        self._spawn_fog_pedestrian()

    def _spawn_fog_pedestrian(self):
        """Pedestrian materialises 8 m ahead in the fog and crosses the road."""
        if not self.ego_vehicle:
            return
        bp_lib  = self.world.get_blueprint_library()
        ped_bp  = random.choice(bp_lib.filter('walker.pedestrian.*'))
        ctrl_bp = bp_lib.find('controller.ai.walker')

        ego_tf   = self.ego_vehicle.get_transform()
        spawn_loc = ego_tf.location + ego_tf.get_forward_vector() * 8.0
        spawn_tf  = carla.Transform(spawn_loc)

        ped = self.world.try_spawn_actor(ped_bp, spawn_tf)
        if ped:
            self.spawned_actors.append(ped)
            self._export_actors.append(ped)
            ctrl = self.world.try_spawn_actor(ctrl_bp, carla.Transform(), attach_to=ped)
            if ctrl:
                ctrl.start()
                cross_dest = carla.Location(spawn_loc.x, spawn_loc.y + 8.0, spawn_loc.z)
                ctrl.go_to_location(cross_dest)
                ctrl.set_max_speed(random.uniform(0.8, 1.5))
                self.spawned_actors.append(ctrl)
            print(f"[rain] Low-visibility pedestrian spawned 8 m ahead (id={ped.id}).")
        else:
            print("[rain] WARNING: could not spawn fog pedestrian.")


if __name__ == '__main__':
    RainScenario().run(duration_seconds=20.0)
