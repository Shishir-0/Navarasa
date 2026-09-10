try:
    from simulation.scenarios.base_scenario import BaseScenario
except ImportError:
    from base_scenario import BaseScenario

try:
    import carla
except ImportError:
    import simulation.carla_shim as carla
import random

class PotholeScenario(BaseScenario):
    """
    Pothole / Degraded Road scenario.
    CARLA does not support road surface deformation.
    Simulation uses traffic cone props placed in a zigzag pattern,
    forcing autopilot vehicles to swerve — visually representing pothole avoidance.
    """
    def __init__(self):
        super().__init__(
            map_name='Town01',
            weather=carla.WeatherParameters.ClearNoon,
            num_vehicles=10,
            num_pedestrians=5,
            scenario_name='pothole',
        )

    def _spawn_dynamic_actors(self):
        super()._spawn_dynamic_actors()
        self._spawn_pothole_cones()
        self._spawn_swerving_vehicles()

    def _spawn_pothole_cones(self):
        """Traffic cones in a zigzag pattern simulating pothole markers."""
        if not self.ego_vehicle:
            return
        bp_lib  = self.world.get_blueprint_library()
        cone_bp = bp_lib.find('static.prop.trafficcone01')

        if cone_bp is None:
            # Try alternate prop name
            cone_bp = bp_lib.find('static.prop.trafficwarning')

        if cone_bp is None:
            print("[pothole] WARNING: no traffic cone blueprint found — skipping cones.")
            return

        ego_tf  = self.ego_vehicle.get_transform()
        forward = ego_tf.get_forward_vector()
        placed  = 0

        for i, dist in enumerate([10.0, 15.0, 20.0, 25.0]):
            loc    = ego_tf.location + forward * dist
            loc.y += 1.0 if i % 2 == 0 else -1.0
            cone = self.world.try_spawn_actor(cone_bp, carla.Transform(loc))
            if cone:
                self.spawned_actors.append(cone)   # for cleanup; props have no useful data
                placed += 1

        print(f"[pothole] {placed} traffic cones placed in road.")

    def _spawn_swerving_vehicles(self):
        """Two vehicles ahead who visibly swerve around the cones."""
        if not self.ego_vehicle:
            return
        bp_lib  = self.world.get_blueprint_library()
        car_bps = bp_lib.filter('vehicle.*')
        ego_tf  = self.ego_vehicle.get_transform()
        forward = ego_tf.get_forward_vector()
        placed  = 0

        for dist in [30.0, 45.0]:
            loc = ego_tf.location + forward * dist
            bp  = random.choice(car_bps)
            v   = self.world.try_spawn_actor(bp, carla.Transform(loc, ego_tf.rotation))
            if v:
                v.set_autopilot(True)
                self.spawned_actors.append(v)
                self._export_actors.append(v)
                placed += 1

        print(f"[pothole] {placed} swerving vehicles spawned ahead.")


if __name__ == '__main__':
    PotholeScenario().run(duration_seconds=20.0)
