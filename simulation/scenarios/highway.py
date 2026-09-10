try:
    from simulation.scenarios.base_scenario import BaseScenario
except ImportError:
    from base_scenario import BaseScenario

try:
    import carla
except ImportError:
    import simulation.carla_shim as carla
import random

class HighwayScenario(BaseScenario):
    """
    Highway Merge scenario — high-speed multi-lane road.
    Corner Cases:
      1. Large truck diagonally straddling the merge lane, blocking sight lines.
      2. Two vehicles merging into the same lane simultaneously from opposite sides.
    """
    def __init__(self):
        super().__init__(
            map_name='Town04',
            weather=carla.WeatherParameters.ClearNoon,
            num_vehicles=50,
            num_pedestrians=0,
            scenario_name='highway',
        )

    def _spawn_dynamic_actors(self):
        super()._spawn_dynamic_actors()
        self._spawn_blocking_truck()
        self._spawn_merge_conflict()

    def _spawn_blocking_truck(self):
        """Large truck angled across merge lane, blocking sight line."""
        if not self.ego_vehicle:
            return
        bp_lib = self.world.get_blueprint_library()

        for query in ['vehicle.carlamotors.carlacola', 'vehicle.tesla.cybertruck',
                      'vehicle.mercedes.actros', 'vehicle.*']:
            bps = bp_lib.filter(query)
            if bps:
                truck_bp = random.choice(bps)
                break

        ego_tf    = self.ego_vehicle.get_transform()
        spawn_loc = ego_tf.location + ego_tf.get_forward_vector() * 35.0
        spawn_loc.y += 2.0
        spawn_rot = carla.Rotation(pitch=ego_tf.rotation.pitch,
                                   yaw=ego_tf.rotation.yaw + 10.0,
                                   roll=ego_tf.rotation.roll)

        truck = self.world.try_spawn_actor(truck_bp,
                                           carla.Transform(spawn_loc, spawn_rot))
        if truck:
            truck.set_autopilot(True)
            self.spawned_actors.append(truck)
            self._export_actors.append(truck)
            print(f"[highway] Blocking truck spawned (id={truck.id}).")
        else:
            print("[highway] WARNING: could not spawn blocking truck.")

    def _spawn_merge_conflict(self):
        """Two vehicles merging into the centre lane at the same time."""
        if not self.ego_vehicle:
            return
        bp_lib = self.world.get_blueprint_library()
        car_bps = bp_lib.filter('vehicle.*')
        ego_tf  = self.ego_vehicle.get_transform()
        forward = ego_tf.get_forward_vector()

        for side_offset in [-3.5, 3.5]:
            loc = ego_tf.location + forward * 40.0
            loc.y += side_offset
            bp = random.choice(car_bps)
            v  = self.world.try_spawn_actor(bp, carla.Transform(loc, ego_tf.rotation))
            if v:
                v.set_autopilot(True)
                self.spawned_actors.append(v)
                self._export_actors.append(v)
                print(f"[highway] Merge-conflict vehicle spawned (id={v.id}, offset={side_offset}m).")


if __name__ == '__main__':
    HighwayScenario().run(duration_seconds=20.0)
