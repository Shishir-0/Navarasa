"""
Base simulation engine for all NAVRASA scenarios.

Execution order (run() method):
  setup() → _spawn_ego_vehicle() → _setup_sensors() → _spawn_dynamic_actors()
          → [step() × N ticks] → tear_down()

Subclasses override _spawn_dynamic_actors() to add scenario-specific actors.
Subclasses may override step() to add per-tick logic (e.g., abrupt brake triggers).
"""

try:
    import carla
    CARLA_AVAILABLE = True
except ImportError:
    import simulation.carla_shim as carla
    CARLA_AVAILABLE = False

try:
    from simulation.config import settings
    from simulation.sensors.sensor_manager import SensorManager, CameraSensor, LidarSensor, RadarSensor
    from simulation.sensors.recording_manager import RecordingManager
    from simulation.exports.data_exporter import DataExporter
except ImportError:
    # Ensure parent dir is on path so config/sensors/exports are importable if run directly
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from config import settings
    from sensors.sensor_manager import SensorManager, CameraSensor, LidarSensor, RadarSensor
    from sensors.recording_manager import RecordingManager
    from exports.data_exporter import DataExporter


class BaseScenario:
    # Types that should be excluded from the actor export list
    _SKIP_ROLES = {'controller'}

    def __init__(self,
                 map_name=None,
                 weather=carla.WeatherParameters.ClearNoon,
                 num_vehicles=10,
                 num_pedestrians=10,
                 scenario_name='base',
                 seed=None):
        """
        Parameters
        ----------
        map_name       : CARLA town name e.g. 'Town01', or None to use loaded map
        weather        : carla.WeatherParameters preset or custom instance
        num_vehicles   : background vehicle count
        num_pedestrians: background pedestrian count
        scenario_name  : tag written into every exported frame
        seed           : int seed for random; if None, a random seed is chosen and logged
        """
        self.map_name        = map_name
        self.weather         = weather
        self.num_vehicles    = num_vehicles
        self.num_pedestrians = num_pedestrians
        self.scenario_name   = scenario_name
        self.seed            = seed if seed is not None else random.randint(0, 2**31)

        self.client           = None
        self.world            = None
        self.ego_vehicle      = None
        self.sensor_manager   = None
        self.recording_manager = None
        self.data_exporter    = None    # created in setup() after export_dir is known
        self.spawned_actors   = []      # ALL actors inc. controllers — for cleanup
        self._export_actors   = []      # subset passed to data_exporter (no controllers)

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------

    def setup(self):
        random.seed(self.seed)
        print(f"[{self.scenario_name}] seed={self.seed}")

        # Build absolute export dir from settings (anchored to scenarios/ dir)
        scenarios_dir = os.path.dirname(os.path.abspath(__file__))
        export_dir = os.path.normpath(os.path.join(scenarios_dir, settings.EXPORT_DIR))
        os.makedirs(export_dir, exist_ok=True)

        # Initialise exporter NOW (after export_dir is resolved)
        self.data_exporter = DataExporter(
            export_dir=export_dir,
            scenario_name=self.scenario_name,
            seed=self.seed,
            json_filename=settings.ACTORS_JSON_FILE,
            csv_filename=settings.TRACKS_CSV_FILE,
        )

        # CARLA connection
        print(f"[{self.scenario_name}] Connecting to CARLA {settings.HOST}:{settings.PORT} ...")
        self.client = carla.Client(settings.HOST, settings.PORT)
        self.client.set_timeout(settings.TIMEOUT)

        if self.map_name:
            self.world = self.client.load_world(self.map_name)
            # Wait for the world to finish loading
            time.sleep(1.0)
        else:
            self.world = self.client.get_world()

        # Apply weather
        self.world.set_weather(self.weather)

        # Synchronous mode
        if settings.SYNC_MODE:
            sim_settings = self.world.get_settings()
            sim_settings.synchronous_mode = True
            sim_settings.fixed_delta_seconds = settings.FIXED_DELTA_SECONDS
            self.world.apply_settings(sim_settings)
            print(f"[{self.scenario_name}] Sync mode ON @ {1/settings.FIXED_DELTA_SECONDS:.0f} FPS")

        self._spawn_ego_vehicle()
        self._setup_sensors()
        self._spawn_dynamic_actors()

        # Recording cameras (Phase 8)
        if self.ego_vehicle:
            recordings_dir = os.path.join(export_dir, settings.RECORDINGS_SUBDIR)
            self.recording_manager = RecordingManager(
                self.world, self.ego_vehicle, recordings_dir
            )

        # CARLA server-side recorder (.log for replay)
        log_path = os.path.join(export_dir, settings.RECORDING_FILE)
        self.client.start_recorder(log_path)
        print(f"[{self.scenario_name}] CARLA recorder started → {log_path}")

        # Write run metadata (seed, scenario, map, weather summary)
        self._write_run_metadata(export_dir)

    def _write_run_metadata(self, export_dir):
        """Writes a small JSON file so consumers know how this run was configured."""
        weather = self.weather
        meta = {
            'scenario':             self.scenario_name,
            'seed':                 self.seed,
            'map':                  self.map_name or 'preloaded',
            'num_vehicles':         self.num_vehicles,
            'num_pedestrians':      self.num_pedestrians,
            'fixed_delta_seconds':  settings.FIXED_DELTA_SECONDS,
            'weather': {
                'cloudiness':             getattr(weather, 'cloudiness', None),
                'precipitation':          getattr(weather, 'precipitation', None),
                'sun_altitude_angle':     getattr(weather, 'sun_altitude_angle', None),
                'fog_density':            getattr(weather, 'fog_density', None),
                'fog_distance':           getattr(weather, 'fog_distance', None),
                'wetness':                getattr(weather, 'wetness', None),
            }
        }
        meta_path = os.path.join(export_dir, settings.METADATA_FILE)
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)
        print(f"[{self.scenario_name}] Run metadata → {meta_path}")

    # ------------------------------------------------------------------
    # Spawning
    # ------------------------------------------------------------------

    def _spawn_ego_vehicle(self):
        blueprint_library = self.world.get_blueprint_library()
        # Pick a car (not bikes/trucks) for the ego to keep sensor mounts sensible
        car_blueprints = blueprint_library.filter('vehicle.tesla.*') or \
                         blueprint_library.filter('vehicle.audi.*') or \
                         blueprint_library.filter('vehicle.*')
        spawn_points = self.world.get_map().get_spawn_points()

        if not spawn_points:
            print(f"[{self.scenario_name}] ERROR: No spawn points found — ego not spawned.")
            return

        ego_bp = random.choice(car_blueprints)
        ego_bp.set_attribute('role_name', 'ego')
        ego_spawn = random.choice(spawn_points)

        self.ego_vehicle = self.world.try_spawn_actor(ego_bp, ego_spawn)
        if self.ego_vehicle is None:
            # Try remaining spawn points
            random.shuffle(spawn_points)
            for sp in spawn_points:
                self.ego_vehicle = self.world.try_spawn_actor(ego_bp, sp)
                if self.ego_vehicle:
                    break

        if self.ego_vehicle:
            self.ego_vehicle.set_autopilot(True)
            self.spawned_actors.append(self.ego_vehicle)
            print(f"[{self.scenario_name}] Ego vehicle spawned: {self.ego_vehicle.type_id} id={self.ego_vehicle.id}")
        else:
            print(f"[{self.scenario_name}] ERROR: Could not spawn ego vehicle after trying all spawn points.")

    def _setup_sensors(self):
        if not self.ego_vehicle:
            print(f"[{self.scenario_name}] WARNING: Skipping sensors — no ego vehicle.")
            return

        self.sensor_manager = SensorManager(self.world, self.ego_vehicle)

        cam_tf   = carla.Transform(carla.Location(x=1.5, z=2.4))
        lidar_tf = carla.Transform(carla.Location(x=1.5, z=2.4))
        radar_tf = carla.Transform(carla.Location(x=2.0, z=1.0))

        self.camera = CameraSensor(self.sensor_manager, settings.CAMERA_RES_X,
                                   settings.CAMERA_RES_Y, settings.CAMERA_FOV, cam_tf)
        self.lidar  = LidarSensor(self.sensor_manager, settings.LIDAR_RANGE, lidar_tf)
        self.radar  = RadarSensor(self.sensor_manager, settings.RADAR_RANGE, radar_tf)

        print(f"[{self.scenario_name}] Sensors attached (camera, lidar, radar).")

    def _spawn_dynamic_actors(self):
        """
        Spawn background traffic + pedestrians.
        Subclasses call super() then add scenario-specific actors.
        """
        blueprint_library = self.world.get_blueprint_library()
        spawn_points = self.world.get_map().get_spawn_points()

        if not spawn_points:
            print(f"[{self.scenario_name}] WARNING: No spawn points — skipping traffic spawn.")
            return

        # Vehicles
        vehicles_spawned = 0
        random.shuffle(spawn_points)
        for sp in spawn_points[:self.num_vehicles]:
            bp = random.choice(blueprint_library.filter('vehicle.*'))
            v  = self.world.try_spawn_actor(bp, sp)
            if v:
                v.set_autopilot(True)
                self.spawned_actors.append(v)
                self._export_actors.append(v)
                vehicles_spawned += 1

        # Pedestrians
        pedestrians_spawned = 0
        walker_ctrl_bp = blueprint_library.find('controller.ai.walker')
        for _ in range(self.num_pedestrians):
            loc = self.world.get_random_location_from_navigation()
            if loc is None:
                continue
            bp  = random.choice(blueprint_library.filter('walker.pedestrian.*'))
            sp  = carla.Transform(loc)
            ped = self.world.try_spawn_actor(bp, sp)
            if ped:
                self.spawned_actors.append(ped)
                self._export_actors.append(ped)
                ctrl = self.world.try_spawn_actor(walker_ctrl_bp,
                                                  carla.Transform(), attach_to=ped)
                if ctrl:
                    self.spawned_actors.append(ctrl)  # for cleanup only
                    ctrl.start()
                    dest = self.world.get_random_location_from_navigation()
                    if dest:
                        ctrl.go_to_location(dest)
                    ctrl.set_max_speed(random.uniform(0.5, 1.8))
                pedestrians_spawned += 1

        print(f"[{self.scenario_name}] Spawned {vehicles_spawned} vehicles, "
              f"{pedestrians_spawned} pedestrians.")

    # ------------------------------------------------------------------
    # Simulation loop
    # ------------------------------------------------------------------

    def step(self):
        if settings.SYNC_MODE:
            self.world.tick()
        else:
            self.world.wait_for_tick()

        if not self.ego_vehicle:
            return

        snapshot  = self.world.get_snapshot()
        timestamp = snapshot.timestamp.elapsed_seconds

        # Filter: export only valid, alive actors (no controllers)
        alive_actors = [
            a for a in self._export_actors
            if a.is_alive and not a.type_id.startswith('controller.')
        ]

        self.data_exporter.export_frame(
            timestamp=timestamp,
            ego_vehicle=self.ego_vehicle,
            actors=alive_actors,
            weather_params=self.weather,
        )

        if self.recording_manager:
            self.recording_manager.save_frame()

    # ------------------------------------------------------------------
    # Teardown
    # ------------------------------------------------------------------

    def tear_down(self):
        print(f"[{self.scenario_name}] Tearing down ...")

        # Stop CARLA recorder first
        if self.client:
            try:
                self.client.stop_recorder()
            except Exception as exc:
                print(f"[{self.scenario_name}] WARNING: stop_recorder failed: {exc}")

        # Destroy recording cameras
        if self.recording_manager:
            try:
                self.recording_manager.destroy()
            except Exception as exc:
                print(f"[{self.scenario_name}] WARNING: recording_manager.destroy failed: {exc}")

        # Destroy algorithm sensors
        if self.sensor_manager:
            try:
                self.sensor_manager.destroy()
            except Exception as exc:
                print(f"[{self.scenario_name}] WARNING: sensor_manager.destroy failed: {exc}")

        # Destroy all spawned actors (reverse order — controllers before their walkers)
        for actor in reversed(self.spawned_actors):
            try:
                if actor is not None and actor.is_alive:
                    actor.destroy()
            except Exception as exc:
                print(f"[{self.scenario_name}] WARNING: could not destroy actor {getattr(actor, 'id', '?')}: {exc}")

        # Restore async mode
        if settings.SYNC_MODE and self.world:
            try:
                sim_settings = self.world.get_settings()
                sim_settings.synchronous_mode = False
                sim_settings.fixed_delta_seconds = None
                self.world.apply_settings(sim_settings)
                print(f"[{self.scenario_name}] CARLA world settings restored.")
            except Exception as exc:
                print(f"[{self.scenario_name}] WARNING: failed to restore world settings: {exc}")

        # Flush export data
        if self.data_exporter:
            try:
                self.data_exporter.close()
                self.data_exporter.save_json()
            except Exception as exc:
                print(f"[{self.scenario_name}] WARNING: export flush failed: {exc}")

        print(f"[{self.scenario_name}] Teardown complete.")

    # ------------------------------------------------------------------
    # Entry point
    # ------------------------------------------------------------------

    def run(self, duration_seconds=20.0):
        try:
            self.setup()
            start    = time.time()
            frames   = 0
            while time.time() - start < duration_seconds:
                self.step()
                frames += 1
            print(f"[{self.scenario_name}] Finished: {frames} frames in {duration_seconds}s.")
        except Exception as exc:
            print(f"[{self.scenario_name}] FATAL ERROR during run: {exc}")
            raise
        finally:
            self.tear_down()
