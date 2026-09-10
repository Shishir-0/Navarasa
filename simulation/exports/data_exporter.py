"""
Data Export Pipeline — Phase 5
Writes per-frame ground-truth actor data to JSON and CSV.

OUTPUT CONTRACT (for downstream NAVRASA modules):
------------------------------------------------------
actors.json   — array of frame objects, one per simulation tick
tracks.csv    — flat table, one row per (frame, actor)

JSON frame schema:
{
  "frame":       int,          # monotonic frame index (0-based)
  "timestamp":   float,        # elapsed simulation seconds
  "scenario":    str,          # scenario name tag
  "seed":        int,          # random seed used for this run
  "weather": {
    "cloudiness":            float,  # 0-100
    "precipitation":         float,  # 0-100
    "precipitation_deposits": float, # 0-100
    "wind_intensity":        float,  # 0-100
    "sun_altitude_angle":    float,  # degrees, -90 to 90
    "fog_density":           float,  # 0-100
    "fog_distance":          float,  # metres
    "wetness":               float   # 0-100
  },
  "ego": <actor_entry>,
  "actors": [ <actor_entry>, ... ]
}

actor_entry schema:
{
  "id":       int,    # stable CARLA actor ID for this run
  "is_ego":   bool,
  "type":     str,    # CARLA blueprint type_id, e.g. "vehicle.tesla.model3"
  "role":     str,    # "ego" | "vehicle" | "pedestrian" | "prop"
  "x":        float,  # metres (CARLA UE4 X = forward)
  "y":        float,  # metres (CARLA UE4 Y = right)
  "z":        float,  # metres (CARLA UE4 Z = up)
  "vx":       float,  # m/s
  "vy":       float,  # m/s
  "vz":       float,  # m/s
  "speed":    float,  # m/s — scalar magnitude of (vx, vy, vz)
  "heading":  float,  # degrees, yaw in CARLA convention
  "bbox_x":   float,  # bounding box half-extent, metres (or null)
  "bbox_y":   float,
  "bbox_z":   float
}

CSV columns:
  frame, timestamp, scenario, seed, actor_id, is_ego, role, type,
  x, y, z, vx, vy, vz, speed, heading, bbox_x, bbox_y, bbox_z

COORDINATE SYSTEM: CARLA UE4 left-handed  (X fwd, Y right, Z up).
UNITS: positions=metres, velocities=m/s, heading=degrees.
"""

import json
import csv
import os
import math

# Role classification by blueprint prefix
def _classify_role(type_id: str) -> str:
    if type_id.startswith('vehicle.'):
        return 'vehicle'
    if type_id.startswith('walker.'):
        return 'pedestrian'
    if type_id.startswith('controller.'):
        return 'controller'    # controllers should be filtered out upstream
    if type_id.startswith('static.'):
        return 'prop'
    return 'unknown'


class DataExporter:
    CSV_HEADERS = [
        'frame', 'timestamp', 'scenario', 'seed',
        'actor_id', 'is_ego', 'role', 'type',
        'x', 'y', 'z', 'vx', 'vy', 'vz', 'speed', 'heading',
        'bbox_x', 'bbox_y', 'bbox_z'
    ]

    def __init__(self, export_dir, scenario_name='unknown', seed=0,
                 json_filename='actors.json', csv_filename='tracks.csv'):
        """
        Parameters
        ----------
        export_dir    : directory to write outputs into (created if missing)
        scenario_name : human-readable tag written into every frame
        seed          : random seed used for this run (for reproducibility)
        """
        self.export_dir    = export_dir
        self.scenario_name = scenario_name
        self.seed          = seed
        self.frame_index   = 0

        os.makedirs(self.export_dir, exist_ok=True)

        self.json_path = os.path.join(self.export_dir, json_filename)
        self.csv_path  = os.path.join(self.export_dir, csv_filename)

        # Open files — truncate at start of run only
        self._json_data = []
        self._csv_file  = open(self.csv_path, 'w', newline='', encoding='utf-8')
        self._csv_writer = csv.DictWriter(self._csv_file, fieldnames=self.CSV_HEADERS)
        self._csv_writer.writeheader()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def export_frame(self, timestamp: float, ego_vehicle, actors: list,
                     weather_params) -> None:
        """
        Record one simulation frame.

        Parameters
        ----------
        timestamp     : float — world.get_snapshot().timestamp.elapsed_seconds
        ego_vehicle   : carla.Actor or None
        actors        : list of carla.Actor (excludes ego, excludes controllers)
        weather_params: carla.WeatherParameters
        """
        frame = self.frame_index
        self.frame_index += 1

        weather_dict = self._extract_weather(weather_params)
        ego_entry    = self._extract_actor_entry(ego_vehicle, is_ego=True) if ego_vehicle else None
        actor_entries = []
        for actor in actors:
            try:
                entry = self._extract_actor_entry(actor, is_ego=False)
                actor_entries.append(entry)
            except Exception as exc:
                print(f"[DataExporter] WARNING: could not extract actor {getattr(actor, 'id', '?')}: {exc}")

        frame_obj = {
            'frame':     frame,
            'timestamp': round(timestamp, 4),
            'scenario':  self.scenario_name,
            'seed':      self.seed,
            'weather':   weather_dict,
            'ego':       ego_entry,
            'actors':    actor_entries,
        }
        self._json_data.append(frame_obj)

        # Write CSV rows immediately (no buffering — safe against crashes)
        common = {'frame': frame, 'timestamp': round(timestamp, 4),
                  'scenario': self.scenario_name, 'seed': self.seed}
        if ego_entry:
            self._csv_writer.writerow({**common, **self._flatten_entry(ego_entry)})
        for entry in actor_entries:
            self._csv_writer.writerow({**common, **self._flatten_entry(entry)})
        self._csv_file.flush()

    def save_json(self) -> None:
        """Flush accumulated frame data to actors.json."""
        with open(self.json_path, 'w', encoding='utf-8') as f:
            json.dump(self._json_data, f, indent=2)
        print(f"[DataExporter] Saved {len(self._json_data)} frames → {self.json_path}")

    def close(self) -> None:
        """Close CSV file handle. Call from tear_down."""
        if not self._csv_file.closed:
            self._csv_file.close()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _extract_actor_entry(self, actor, is_ego: bool) -> dict:
        transform = actor.get_transform()
        velocity  = actor.get_velocity()
        vx, vy, vz = velocity.x, velocity.y, velocity.z
        speed = round(math.sqrt(vx*vx + vy*vy + vz*vz), 4)

        entry = {
            'actor_id': actor.id,
            'is_ego':   is_ego,
            'role':     'ego' if is_ego else _classify_role(actor.type_id),
            'type':     actor.type_id,
            'x':        round(transform.location.x, 4),
            'y':        round(transform.location.y, 4),
            'z':        round(transform.location.z, 4),
            'vx':       round(vx, 4),
            'vy':       round(vy, 4),
            'vz':       round(vz, 4),
            'speed':    speed,
            'heading':  round(transform.rotation.yaw, 4),
            'bbox_x':   None,
            'bbox_y':   None,
            'bbox_z':   None,
        }

        if hasattr(actor, 'bounding_box'):
            bb = actor.bounding_box
            entry['bbox_x'] = round(bb.extent.x, 4)
            entry['bbox_y'] = round(bb.extent.y, 4)
            entry['bbox_z'] = round(bb.extent.z, 4)

        return entry

    def _extract_weather(self, wp) -> dict:
        """Convert carla.WeatherParameters to a plain dict."""
        if wp is None:
            return {}
        return {
            'cloudiness':             round(getattr(wp, 'cloudiness', 0), 2),
            'precipitation':          round(getattr(wp, 'precipitation', 0), 2),
            'precipitation_deposits': round(getattr(wp, 'precipitation_deposits', 0), 2),
            'wind_intensity':         round(getattr(wp, 'wind_intensity', 0), 2),
            'sun_altitude_angle':     round(getattr(wp, 'sun_altitude_angle', 0), 2),
            'fog_density':            round(getattr(wp, 'fog_density', 0), 2),
            'fog_distance':           round(getattr(wp, 'fog_distance', 0), 2),
            'wetness':                round(getattr(wp, 'wetness', 0), 2),
        }

    @staticmethod
    def _flatten_entry(entry: dict) -> dict:
        """Map actor_entry keys to CSV column names."""
        return {
            'actor_id': entry['actor_id'],
            'is_ego':   entry['is_ego'],
            'role':     entry['role'],
            'type':     entry['type'],
            'x':        entry['x'],
            'y':        entry['y'],
            'z':        entry['z'],
            'vx':       entry['vx'],
            'vy':       entry['vy'],
            'vz':       entry['vz'],
            'speed':    entry['speed'],
            'heading':  entry['heading'],
            'bbox_x':   entry['bbox_x'],
            'bbox_y':   entry['bbox_y'],
            'bbox_z':   entry['bbox_z'],
        }
