try:
    from simulation.scenarios.base_scenario import BaseScenario
except ImportError:
    from base_scenario import BaseScenario

try:
    import carla
except ImportError:
    import simulation.carla_shim as carla
import random

class VillageScenario(BaseScenario):
    """
    Village Road — narrow unmarked road, low traffic, high pedestrian activity.
    Corner Case: Group of pedestrians walking in the middle of the road,
    which is common on Indian village roads without footpaths.
    """
    def __init__(self):
        super().__init__(
            map_name='Town01',
            weather=carla.WeatherParameters.ClearSunset,
            num_vehicles=5,
            num_pedestrians=10,
            scenario_name='village',
        )

    def _spawn_dynamic_actors(self):
        super()._spawn_dynamic_actors()
        self._spawn_road_walking_group()

    def _spawn_road_walking_group(self):
        if not self.ego_vehicle:
            return

        bp_lib = self.world.get_blueprint_library()
        ped_bps = bp_lib.filter('walker.pedestrian.*')
        ctrl_bp = bp_lib.find('controller.ai.walker')
        ego_tf  = self.ego_vehicle.get_transform()
        forward = ego_tf.get_forward_vector()
        count   = 0

        for _ in range(4):
            dist   = random.uniform(12.0, 20.0)
            spread = random.uniform(-1.0, 1.0)
            loc    = ego_tf.location + forward * dist
            loc.y += spread

            ped = self.world.try_spawn_actor(random.choice(ped_bps),
                                             carla.Transform(loc))
            if ped:
                self.spawned_actors.append(ped)
                self._export_actors.append(ped)
                ctrl = self.world.try_spawn_actor(ctrl_bp, carla.Transform(),
                                                  attach_to=ped)
                if ctrl:
                    ctrl.start()
                    dest = loc + forward * 30.0
                    ctrl.go_to_location(dest)
                    ctrl.set_max_speed(random.uniform(0.8, 1.4))
                    self.spawned_actors.append(ctrl)
                count += 1

        print(f"[village] Pedestrian road-walking group: {count} actors.")


if __name__ == '__main__':
    VillageScenario().run(duration_seconds=20.0)
