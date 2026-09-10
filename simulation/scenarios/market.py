try:
    from simulation.scenarios.base_scenario import BaseScenario
except ImportError:
    from base_scenario import BaseScenario

try:
    import carla
except ImportError:
    import simulation.carla_shim as carla
import random

class MarketScenario(BaseScenario):
    """
    Crowded Market Street scenario.
    Corner Cases:
      1. Sudden pedestrian crossing (8-12 m ahead of ego)
      2. Motorcycle squeezing through traffic gap
      3. Dense market crowd on footpath
    """
    def __init__(self):
        super().__init__(
            map_name='Town02',
            weather=carla.WeatherParameters.ClearNoon,
            num_vehicles=30,
            num_pedestrians=50,
            scenario_name='market',
        )

    def _spawn_dynamic_actors(self):
        super()._spawn_dynamic_actors()
        self._spawn_sudden_pedestrian()
        self._spawn_squeezing_motorcycle()
        self._spawn_dense_crowd()

    def _spawn_sudden_pedestrian(self):
        """Pedestrian on the kerb who walks across the road in front of ego."""
        if not self.ego_vehicle:
            return
        bp_lib  = self.world.get_blueprint_library()
        ped_bp  = random.choice(bp_lib.filter('walker.pedestrian.*'))
        ctrl_bp = bp_lib.find('controller.ai.walker')

        ego_tf  = self.ego_vehicle.get_transform()
        loc     = ego_tf.location + ego_tf.get_forward_vector() * random.uniform(8.0, 12.0)
        loc.y  -= 3.0   # start on the kerbside

        ped = self.world.try_spawn_actor(ped_bp, carla.Transform(loc))
        if ped:
            self.spawned_actors.append(ped)
            self._export_actors.append(ped)
            ctrl = self.world.try_spawn_actor(ctrl_bp, carla.Transform(), attach_to=ped)
            if ctrl:
                ctrl.start()
                cross = carla.Location(loc.x, loc.y + 6.0, loc.z)
                ctrl.go_to_location(cross)
                ctrl.set_max_speed(random.uniform(1.2, 2.5))
                self.spawned_actors.append(ctrl)
            print(f"[market] Sudden pedestrian spawned (id={ped.id}).")

    def _spawn_squeezing_motorcycle(self):
        """Motorcycle weaving between vehicles in the narrow market lane."""
        if not self.ego_vehicle:
            return
        bp_lib = self.world.get_blueprint_library()
        for query in ['vehicle.yamaha.yzf', 'vehicle.kawasaki.ninja',
                      'vehicle.bh.crossbike', 'vehicle.harley-davidson.low_rider']:
            bps = bp_lib.filter(query)
            if bps:
                bike_bp = bps[0]
                break
        else:
            print("[market] No motorcycle blueprint found — skipping squeeze case.")
            return

        ego_tf    = self.ego_vehicle.get_transform()
        spawn_loc = ego_tf.location + ego_tf.get_forward_vector() * 20.0
        spawn_loc.y += 1.0
        spawn_tf  = carla.Transform(spawn_loc, ego_tf.rotation)

        bike = self.world.try_spawn_actor(bike_bp, spawn_tf)
        if bike:
            bike.set_autopilot(True)
            self.spawned_actors.append(bike)
            self._export_actors.append(bike)
            print(f"[market] Squeezing motorcycle spawned (id={bike.id}).")

    def _spawn_dense_crowd(self):
        """15 pedestrians clustered on the footpath beside the ego vehicle."""
        if not self.ego_vehicle:
            return
        bp_lib  = self.world.get_blueprint_library()
        ped_bps = bp_lib.filter('walker.pedestrian.*')
        ego_loc = self.ego_vehicle.get_location()
        count   = 0

        for _ in range(15):
            loc = carla.Location(
                x=ego_loc.x + random.uniform(-5, 5),
                y=ego_loc.y + random.uniform(3, 6),
                z=ego_loc.z,
            )
            ped = self.world.try_spawn_actor(random.choice(ped_bps),
                                             carla.Transform(loc))
            if ped:
                self.spawned_actors.append(ped)
                self._export_actors.append(ped)
                count += 1

        print(f"[market] Dense crowd: {count} pedestrians spawned.")


if __name__ == '__main__':
    MarketScenario().run(duration_seconds=20.0)
