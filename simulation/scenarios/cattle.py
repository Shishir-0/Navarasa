try:
    from simulation.scenarios.base_scenario import BaseScenario
except ImportError:
    from base_scenario import BaseScenario

try:
    import carla
except ImportError:
    import simulation.carla_shim as carla
import random

class CattleScenario(BaseScenario):
    """
    Cattle Crossing scenario — Indian village road.
    Corner Case: 8 pedestrian proxies cross the road slowly in a spread line,
    blocking the ego vehicle — simulating a herd of cattle.
    """
    def __init__(self):
        super().__init__(
            map_name='Town01',
            weather=carla.WeatherParameters.ClearNoon,
            num_vehicles=5,
            num_pedestrians=5,
            scenario_name='cattle',
        )

    def _spawn_dynamic_actors(self):
        super()._spawn_dynamic_actors()
        self._spawn_cattle_herd()

    def _spawn_cattle_herd(self):
        if not self.ego_vehicle:
            return
        bp_lib   = self.world.get_blueprint_library()
        ped_bps  = bp_lib.filter('walker.pedestrian.*')
        ctrl_bp  = bp_lib.find('controller.ai.walker')
        ego_tf   = self.ego_vehicle.get_transform()
        forward  = ego_tf.get_forward_vector()
        right    = ego_tf.get_right_vector()
        count    = 0

        for i in range(8):
            offset = (i - 4) * 1.5   # spread -6 m to +6 m across road
            loc    = ego_tf.location + forward * 20.0 + right * offset
            loc.z  = ego_tf.location.z

            ped = self.world.try_spawn_actor(random.choice(ped_bps),
                                             carla.Transform(loc))
            if ped:
                self.spawned_actors.append(ped)
                self._export_actors.append(ped)
                ctrl = self.world.try_spawn_actor(ctrl_bp, carla.Transform(),
                                                  attach_to=ped)
                if ctrl:
                    ctrl.start()
                    cross_dest = carla.Location(loc.x, loc.y + 12.0, loc.z)
                    ctrl.go_to_location(cross_dest)
                    ctrl.set_max_speed(random.uniform(0.5, 1.2))
                    self.spawned_actors.append(ctrl)
                count += 1

        print(f"[cattle] Cattle herd: {count} actors crossing road.")


if __name__ == '__main__':
    CattleScenario().run(duration_seconds=20.0)
