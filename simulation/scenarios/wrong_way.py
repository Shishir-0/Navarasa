try:
    from simulation.scenarios.base_scenario import BaseScenario
except ImportError:
    from base_scenario import BaseScenario

try:
    import carla
except ImportError:
    import simulation.carla_shim as carla

class WrongWayScenario(BaseScenario):
    """
    Wrong-Way Motorcycle corner case.
    A motorcycle is spawned 30 m ahead of the ego vehicle, facing the opposite
    direction, and given a constant forward velocity toward the ego.
    """
    def __init__(self):
        super().__init__(
            map_name='Town02',
            weather=carla.WeatherParameters.ClearNoon,
            num_vehicles=10,
            num_pedestrians=5,
            scenario_name='wrong_way',
        )

    def _spawn_dynamic_actors(self):
        super()._spawn_dynamic_actors()
        self._spawn_wrong_way_bike()

    def _spawn_wrong_way_bike(self):
        if not self.ego_vehicle:
            return

        bp_lib = self.world.get_blueprint_library()

        # Try specific models, fall back gracefully to any two-wheeler
        for query in ['vehicle.yamaha.yzf', 'vehicle.kawasaki.ninja',
                      'vehicle.harley-davidson.low_rider', 'vehicle.bh.crossbike']:
            bps = bp_lib.filter(query)
            if bps:
                bike_bp = bps[0]
                break
        else:
            print("[wrong_way] WARNING: no motorcycle blueprint found — skipping corner case.")
            return

        ego_tf = self.ego_vehicle.get_transform()
        spawn_loc = ego_tf.location + ego_tf.get_forward_vector() * 30.0

        # Face the motorcycle toward the ego (yaw +180)
        spawn_rot = carla.Rotation(
            pitch=ego_tf.rotation.pitch,
            yaw=ego_tf.rotation.yaw + 180.0,
            roll=ego_tf.rotation.roll
        )
        spawn_tf = carla.Transform(spawn_loc, spawn_rot)

        bike = self.world.try_spawn_actor(bike_bp, spawn_tf)
        if bike:
            # Drive toward ego at ~36 km/h (10 m/s)
            fwd = spawn_tf.get_forward_vector()
            bike.set_target_velocity(carla.Vector3D(fwd.x * 10.0,
                                                    fwd.y * 10.0,
                                                    fwd.z * 10.0))
            self.spawned_actors.append(bike)
            self._export_actors.append(bike)
            print(f"[wrong_way] Wrong-way motorcycle spawned (id={bike.id}).")
        else:
            print("[wrong_way] WARNING: could not spawn wrong-way motorcycle at chosen point.")


if __name__ == '__main__':
    scenario = WrongWayScenario()
    scenario.run(duration_seconds=20.0)
