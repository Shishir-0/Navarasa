"""
NAVRASA Normalized Persistence & Replay Database.

Maintains normalized storage for simulation runs, frames, tracks,
intent graphs, future predictions, risk fields, planner trajectories,
control commands, and system metrics using SQLite.
"""

from __future__ import annotations
import sqlite3
import json
import os
import threading
from typing import List, Dict, Optional, Any
from backend.core.types import FrameBundle


class NavrasaDatabase:
    """Thread-safe SQLite database manager for autonomous driving telemetry and replay."""

    def __init__(self, db_path: str = "navrasa_replay.db"):
        self.db_path = db_path
        self._lock = threading.Lock()
        self._init_schema()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self):
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()

            # 1. Simulation Runs
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS simulation_runs (
                    run_id TEXT PRIMARY KEY,
                    scenario_id TEXT NOT NULL,
                    scenario_name TEXT NOT NULL,
                    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    duration_s REAL DEFAULT 0.0,
                    total_frames INTEGER DEFAULT 0,
                    collision_occurred INTEGER DEFAULT 0,
                    min_ttc REAL,
                    avg_fps REAL
                )
            """)

            # 2. Frames
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS frames (
                    frame_id INTEGER NOT NULL,
                    run_id TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    ego_x REAL NOT NULL,
                    ego_y REAL NOT NULL,
                    ego_heading REAL NOT NULL,
                    ego_speed REAL NOT NULL,
                    active_tracks_count INTEGER NOT NULL,
                    cbf_active INTEGER NOT NULL,
                    decision_narrative TEXT,
                    PRIMARY KEY (run_id, frame_id),
                    FOREIGN KEY (run_id) REFERENCES simulation_runs(run_id)
                )
            """)

            # 3. Tracks
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tracks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    frame_id INTEGER NOT NULL,
                    track_id TEXT NOT NULL,
                    actor_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    x REAL NOT NULL,
                    y REAL NOT NULL,
                    vx REAL NOT NULL,
                    vy REAL NOT NULL,
                    speed REAL NOT NULL,
                    heading REAL NOT NULL,
                    FOREIGN KEY (run_id) REFERENCES simulation_runs(run_id)
                )
            """)

            # 4. Intent Graph Edges
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS intent_graph_edges (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    frame_id INTEGER NOT NULL,
                    source_id TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    edge_type TEXT NOT NULL,
                    weight REAL NOT NULL,
                    ttc REAL,
                    attention_weight REAL,
                    FOREIGN KEY (run_id) REFERENCES simulation_runs(run_id)
                )
            """)

            # 5. Future Predictions
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS future_predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    frame_id INTEGER NOT NULL,
                    actor_id TEXT NOT NULL,
                    hypothesis_name TEXT NOT NULL,
                    probability REAL NOT NULL,
                    waypoints_json TEXT NOT NULL,
                    FOREIGN KEY (run_id) REFERENCES simulation_runs(run_id)
                )
            """)

            # 6. Planned Paths
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS planned_paths (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    frame_id INTEGER NOT NULL,
                    planner_type TEXT NOT NULL,
                    path_length REAL NOT NULL,
                    planning_time_ms REAL NOT NULL,
                    max_curvature REAL NOT NULL,
                    max_jerk REAL NOT NULL,
                    waypoints_json TEXT NOT NULL,
                    FOREIGN KEY (run_id) REFERENCES simulation_runs(run_id)
                )
            """)

            # 7. Control Commands
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS control_commands (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    frame_id INTEGER NOT NULL,
                    steering_angle REAL NOT NULL,
                    acceleration REAL NOT NULL,
                    cbf_active INTEGER NOT NULL,
                    cbf_slack REAL NOT NULL,
                    cbf_safety_margin REAL NOT NULL,
                    mpc_solve_time_ms REAL NOT NULL,
                    FOREIGN KEY (run_id) REFERENCES simulation_runs(run_id)
                )
            """)

            # 8. Metrics
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    frame_id INTEGER NOT NULL,
                    fps REAL NOT NULL,
                    total_latency_ms REAL NOT NULL,
                    tracking_latency_ms REAL NOT NULL,
                    planning_latency_ms REAL NOT NULL,
                    control_latency_ms REAL NOT NULL,
                    FOREIGN KEY (run_id) REFERENCES simulation_runs(run_id)
                )
            """)

            # Indices for rapid querying during dashboard replay
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_frames_run_frame ON frames(run_id, frame_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_tracks_run_frame ON tracks(run_id, frame_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_edges_run_frame ON intent_graph_edges(run_id, frame_id)")

            conn.commit()
            conn.close()

    def start_run(self, run_id: str, scenario_id: str, scenario_name: str):
        """Registers a new simulation or road drive run."""
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO simulation_runs (run_id, scenario_id, scenario_name)
                VALUES (?, ?, ?)
            """, (run_id, scenario_id, scenario_name))
            conn.commit()
            conn.close()

    def save_frame(self, run_id: str, bundle: FrameBundle):
        """Persists an integrated atomic frame bundle across normalized relational tables."""
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()

            # Insert Frame summary
            cursor.execute("""
                INSERT OR REPLACE INTO frames (
                    frame_id, run_id, timestamp, ego_x, ego_y, ego_heading, ego_speed,
                    active_tracks_count, cbf_active, decision_narrative
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                bundle.frame_id,
                run_id,
                bundle.timestamp,
                bundle.ego_state.position.x,
                bundle.ego_state.position.y,
                bundle.ego_state.heading,
                bundle.ego_state.speed,
                len(bundle.tracks),
                1 if (bundle.control_command and bundle.control_command.cbf_active) else 0,
                bundle.decision_narrative
            ))

            # Insert Tracks
            for t in bundle.tracks:
                cursor.execute("""
                    INSERT INTO tracks (run_id, frame_id, track_id, actor_type, status, x, y, vx, vy, speed, heading)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    run_id, bundle.frame_id, t.track_id, t.actor_type.value, t.status.value,
                    t.position.x, t.position.y, t.velocity.x, t.velocity.y, t.speed, t.heading
                ))

            # Insert Graph Edges
            for e in bundle.intent_graph.edges:
                cursor.execute("""
                    INSERT INTO intent_graph_edges (run_id, frame_id, source_id, target_id, edge_type, weight, ttc, attention_weight)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    run_id, bundle.frame_id, e.source_id, e.target_id, e.edge_type.value,
                    e.weight, e.time_to_collision, e.attention_weight
                ))

            # Insert Planned Path
            if bundle.planned_trajectory:
                p = bundle.planned_trajectory
                pts = [{"x": pt.x, "y": pt.y, "v": pt.v, "yaw": pt.yaw} for pt in p.waypoints]
                cursor.execute("""
                    INSERT INTO planned_paths (run_id, frame_id, planner_type, path_length, planning_time_ms, max_curvature, max_jerk, waypoints_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    run_id, bundle.frame_id, p.planner_type, p.path_length,
                    p.planning_time_ms, p.max_curvature, p.max_jerk, json.dumps(pts)
                ))

            # Insert Control Command
            if bundle.control_command:
                c = bundle.control_command
                cursor.execute("""
                    INSERT INTO control_commands (run_id, frame_id, steering_angle, acceleration, cbf_active, cbf_slack, cbf_safety_margin, mpc_solve_time_ms)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    run_id, bundle.frame_id, c.steering_angle, c.acceleration,
                    1 if c.cbf_active else 0, c.cbf_slack, c.cbf_safety_margin, c.mpc_solve_time_ms
                ))

            # Insert Metrics
            m = bundle.metrics
            cursor.execute("""
                INSERT INTO metrics (run_id, frame_id, fps, total_latency_ms, tracking_latency_ms, planning_latency_ms, control_latency_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                run_id, bundle.frame_id, m.fps, m.total_pipeline_latency_ms,
                m.tracking_latency_ms, m.planning_latency_ms, m.control_latency_ms
            ))

            conn.commit()
            conn.close()

    def get_run_frames(self, run_id: str) -> List[Dict[str, Any]]:
        """Retrieves summary time series of frames for a given run."""
        with self._lock:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM frames WHERE run_id = ? ORDER BY frame_id ASC", (run_id,))
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()
            return rows
