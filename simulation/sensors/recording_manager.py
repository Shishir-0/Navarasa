"""
Phase 8 — Multi-View Recording Manager

Attaches three RGB cameras to the ego vehicle and saves PNG frames to disk:
  exports/recordings/driver/         — forward driver POV
  exports/recordings/third_person/   — behind-and-above follow cam
  exports/recordings/top_down/       — bird's-eye, 25 m above

save_frame() is called once per simulation tick from base_scenario.step().
Frame counter is monotonic per run so frames align 1-to-1 with actors.json.

NOTE: Does NOT import PIL or numpy — uses CARLA's built-in .save_to_disk().
"""

try:
    import carla
except ImportError:
    import simulation.carla_shim as carla
import os
import weakref


class RecordingManager:
    VIEWS = {
        'driver': {
            'transform': carla.Transform(carla.Location(x=0.5, z=1.5)),
            'fov': 90,
        },
        'third_person': {
            'transform': carla.Transform(
                carla.Location(x=-6.0, z=4.0),
                carla.Rotation(pitch=-15.0)
            ),
            'fov': 90,
        },
        'top_down': {
            'transform': carla.Transform(
                carla.Location(x=0.0, z=25.0),
                carla.Rotation(pitch=-90.0)
            ),
            'fov': 120,
        },
    }

    def __init__(self, world, ego_vehicle, output_dir, width=800, height=600):
        self.world        = world
        self.ego_vehicle  = ego_vehicle
        self.output_dir   = output_dir
        self.width        = width
        self.height       = height
        self.frame_counter = 0
        self.cameras      = {}   # name → {'sensor': actor, 'latest_image': image|None}

        for name in self.VIEWS:
            os.makedirs(os.path.join(self.output_dir, name), exist_ok=True)

        self._attach_cameras()

    def _attach_cameras(self):
        bp_lib = self.world.get_blueprint_library()
        for name, cfg in self.VIEWS.items():
            bp = bp_lib.find('sensor.camera.rgb')
            bp.set_attribute('image_size_x', str(self.width))
            bp.set_attribute('image_size_y', str(self.height))
            bp.set_attribute('fov', str(cfg['fov']))

            sensor = self.world.spawn_actor(
                bp, cfg['transform'], attach_to=self.ego_vehicle
            )
            self.cameras[name] = {'sensor': sensor, 'latest_image': None}

            weak_ref = weakref.ref(self)
            sensor.listen(
                lambda img, n=name: RecordingManager._on_image(weak_ref, img, n)
            )
            print(f"[Recording] {name} camera attached (id={sensor.id}).")

    @staticmethod
    def _on_image(weak_ref, image, name):
        mgr = weak_ref()
        if mgr:
            mgr.cameras[name]['latest_image'] = image

    def save_frame(self):
        """Save latest image from each view. Call once per tick."""
        for name, cam in self.cameras.items():
            image = cam['latest_image']
            if image is None:
                continue
            filepath = os.path.join(
                self.output_dir, name,
                f'{name}_{self.frame_counter:06d}.png'
            )
            try:
                image.save_to_disk(filepath)
            except Exception as exc:
                print(f"[Recording] WARNING: could not save {name} frame {self.frame_counter}: {exc}")
        self.frame_counter += 1

    def destroy(self):
        for name, cam in self.cameras.items():
            sensor = cam.get('sensor')
            try:
                if sensor is not None and sensor.is_alive:
                    sensor.stop()
                    sensor.destroy()
                    print(f"[Recording] {name} camera destroyed.")
            except Exception as exc:
                print(f"[Recording] WARNING: could not destroy {name} camera: {exc}")
        self.cameras.clear()
