"""
Global configuration for the NAVRASA simulation pipeline.
Edit these values to match your environment before running any scenario.

COORDINATE SYSTEM (CARLA UE4):
  X = forward (metres)
  Y = right    (metres)
  Z = up       (metres)
  Heading (yaw) in degrees, counter-clockwise from +X (East).

UNITS:
  Positions : metres
  Velocities: m/s
  Heading   : degrees
"""

import os

# ---------------------------------------------------------------------------
# CARLA server connection
# ---------------------------------------------------------------------------
HOST = os.getenv("CARLA_HOST", "127.0.0.1")
PORT = int(os.getenv("CARLA_PORT", "2000"))
TIMEOUT = float(os.getenv("CARLA_TIMEOUT", "10.0"))

# ---------------------------------------------------------------------------
# Simulation stepping (Deterministic 20 Hz sync)
# ---------------------------------------------------------------------------
SYNC_MODE = True
FIXED_DELTA_SECONDS = 0.05   # 20 FPS — do not change without updating replay FPS

# ---------------------------------------------------------------------------
# Performance Stabilization & Auto-Tuning Defaults
# ---------------------------------------------------------------------------
PEDESTRIANS_MAX = int(os.getenv("CARLA_PEDESTRIANS_MAX", "6"))
VEHICLES_MAX = int(os.getenv("CARLA_VEHICLES_MAX", "10"))
CAMERA_RES_X = int(os.getenv("CARLA_CAM_X", "640"))
CAMERA_RES_Y = int(os.getenv("CARLA_CAM_Y", "480"))
CAMERA_FOV = 90.0           # degrees
LIDAR_RANGE = float(os.getenv("CARLA_LIDAR_RANGE", "35.0"))  # metres
RADAR_RANGE = float(os.getenv("CARLA_RADAR_RANGE", "75.0"))  # metres
GRAPHICS_QUALITY = os.getenv("CARLA_QUALITY", "Low")
DX11_FALLBACK = True

# ---------------------------------------------------------------------------
# Export paths
# ---------------------------------------------------------------------------
EXPORT_DIR = os.getenv("CARLA_EXPORT_DIR", "../exports")
ACTORS_JSON_FILE = "actors.json"
TRACKS_CSV_FILE = "tracks.csv"
METADATA_FILE = "run_metadata.json"
RECORDING_FILE = "replay.log"
RECORDINGS_SUBDIR = "recordings"
