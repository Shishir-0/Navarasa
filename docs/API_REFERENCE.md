# NAVRASA REST & WebSocket API Specification
**Version:** `1.0.0`  
**Standard:** Locked Shared Data Interface between Simulator (CARLA / Real-World Bridge) and NAVRASA Autonomy Platform.

---

### REST Endpoints

#### `GET /health`
Returns pipeline health, system version, buffer statistics, and event throughput.
```json
{
  "status": "HEALTHY",
  "system": "NAVRASA",
  "version": "1.0.0",
  "frame_available": true,
  "buffered_frames": 300,
  "total_events": 1420
}
```

#### `GET /actors`
Returns live ego state and detected road participants.

#### `GET /tracks`
Returns active tracked participants from the Multi-Target Tracker (filtered states, UKF covariances, gating distance, and track age).

#### `GET /graph`
Returns the active Road Intent Graph snapshot (nodes, edges, relation types: `FOLLOWING`, `CROSSING`, `MERGE`, `CONFLICT`, `OCCLUSION`, TTC, attention weights).

#### `GET /prediction`
Returns Future Road Composer multi-hypothesis predictions for dynamic actors with probabilities and epistemic uncertainties.

#### `GET /risk`
Returns the current 2D spatial risk potential grid map $\mathcal{R}(x,y)$ and spatial gradient vectors $\nabla \mathcal{R}$.

#### `GET /planner`
Returns the planned trajectory waypoints, curvature profile, jerk, and nodes expanded from Kinodynamic Hybrid A* / Quintic Spline optimizer.

#### `GET /control`
Returns the active vehicle actuation command (steering angle $\delta$, acceleration $a$, CBF intervention flag, and barrier safety margins).

#### `GET /timeline?limit=50`
Returns chronological causality decision records (`Perception` $\to$ `UKF Tracking` $\to$ `GNN Intent` $\to$ `Risk Evaluation` $\to$ `Hybrid A* Replan` $\to$ `CBF Barrier Intervention` $\to$ `Actuation`).

#### `GET /metrics`
Returns system performance telemetry (FPS, component latency waterfall, active tracks count, CBF interventions count, and tracking stability).

#### `GET /replay/frames?limit=300`
Returns the in-memory 300-frame rolling replay buffer for retrospective inspection and synchronizing playback.

#### `POST /replay/seek/{frame_id}`
Seeks and retrieves a historical telemetry snapshot by its specific frame identifier.

#### `POST /simulation/ingest`
Accepts external CARLA or sensor simulation payloads conforming to `shared/frame_schema.json`, dispatches them directly into the central Telemetry Bus, and triggers downstream reasoning.

---

### WebSocket Real-Time Stream: `WS /ws/stream`

Broadcasts serialized `FrameBundle` JSON payloads to connected Mission Control clients at every simulation tick (20-50 Hz) with 3.0s heartbeat ping/pong support.

**FrameBundle Schema:**
```json
{
  "version": "1.0.0",
  "frame_id": 142,
  "timestamp": 7.10,
  "ego_state": { ... },
  "raw_detections": [ ... ],
  "tracks": [ ... ],
  "intent_graph": { ... },
  "predictions": { ... },
  "risk_map": { ... },
  "planned_trajectory": { ... },
  "control_command": { ... },
  "metrics": { ... },
  "decision_narrative": "SAFETY BARRIER INTERVENTION: High-order CBF override active! Proximity margin 1.8m."
}
```
