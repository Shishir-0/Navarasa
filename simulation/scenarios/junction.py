try:
    from simulation.scenarios.base_scenario import BaseScenario
except ImportError:
    from base_scenario import BaseScenario

try:
    import carla
except ImportError:
    import simulation.carla_shim as carla
import random

class JunctionScenario(BaseScenario):
    """
    Signal-less Junction scenario.
    Corner Case: Auto-rickshaw proxy stops abruptly 25 m ahead of ego
    after ~2 seconds of movement, simulating an Indian auto dropping a passenger.
    """
    def __init__(self):
        super().__init__(
            map_name='Town03',
            weather=carla.WeatherParameters.CloudyNoon,
            num_vehicles=25,
            num_pedestrians=20,
            scenario_name='junction',
        )
        self._abrupt_actor = None
        self._brake_tick   = 40     # tick at which abrupt stop fires (~2 s at 20 FPS)
        self._tick_count   = 0

    def _spawn_dynamic_actors(self):
        super()._spawn_dynamic_actors()
        self._spawn_abrupt_auto()

    def _spawn_abrupt_auto(self):
        if not self.ego_vehicle:
            return
        bp_lib = self.world.get_blueprint_library()

        # Best available proxy for auto-rickshaw: small van / compact
        for query in ['vehicle.volkswagen.t2', 'vehicle.nissan.micra',
                      'vehicle.mini.cooperst', 'vehicle.*']:
            bps = bp_lib.filter(query)
            if bps:
                auto_bp = random.choice(bps)
                break

        ego_tf    = self.ego_vehicle.get_transform()
        spawn_loc = ego_tf.location + ego_tf.get_forward_vector() * 25.0
        spawn_tf  = carla.Transform(spawn_loc, ego_tf.rotation)

        auto = self.world.try_spawn_actor(auto_bp, spawn_tf)
        if auto:
            auto.set_autopilot(True)
            self.spawned_actors.append(auto)
            self._export_actors.append(auto)
            self._abrupt_actor = auto
            print(f"[junction] Abrupt-stop auto spawned (id={auto.id}), "
                  f"will brake at tick {self._brake_tick}.")
        else:
            print("[junction] WARNING: could not spawn abrupt-stop auto.")

    def step(self):
        super().step()
        self._tick_count += 1
        if self._abrupt_actor is not None and self._tick_count == self._brake_tick:
            try:
                if self._abrupt_actor.is_alive:
                    self._abrupt_actor.set_autopilot(False)
                    ctrl = carla.VehicleControl(throttle=0.0, brake=1.0)
                    self._abrupt_actor.apply_control(ctrl)
                    print("[junction] Auto stopped abruptly!")
            except Exception as exc:
                print(f"[junction] WARNING: abrupt brake failed: {exc}")


if __name__ == '__main__':
    JunctionScenario().run(duration_seconds=20.0)
