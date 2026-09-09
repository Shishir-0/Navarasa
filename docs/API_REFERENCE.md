# NAVRASA REST & WebSocket API Specification

The NAVRASA FastAPI server serves both synchronous REST queries and real-time WebSocket JSON streams at 20-50 Hz.

---

### REST Endpoints

#### `GET /health`
Returns pipeline health and system status.
```json
{
  "status": "HEALTHY",
  "system": "NAVRASA",
  "version": "1.0.0",
  "frame_available": true
}
```

#### `GET /actors`
Returns live simulated and detected road participants.

#### `GET /tracks`
Returns active tracked participants from the Multi-Target Tracker (filtered states and covariance matrices).

#### `GET /graph`
Returns the active Road Intent Graph snapshot (nodes, edges, TTC, attention weights).

#### `GET /prediction`
Returns Future Road Composer multi-hypothesis predictions for dynamic actors.

#### `GET /risk`
Returns the current 2D spatial risk potential grid map $\mathcal{R}(x,y)$ and spatial gradients.

#### `GET /planner`
Returns the planned trajectory waypoints from Kinodynamic Hybrid A* / Quintic Spline optimizer.

#### `GET /control`
Returns the active vehicle actuation command (steering angle $\delta$, acceleration $a$, CBF intervention flag, and barrier safety margins).

#### `GET /timeline`
Returns frame-by-frame natural language explainability logs and historical reasoning narratives.

#### `GET /metrics`
Returns system performance telemetry (FPS, component latencies, active tracks, CBF interventions count).

---

### WebSocket Real-Time Stream

#### `WS /ws/stream`
Broadcasts serialized `FrameBundle` JSON payloads to connected clients at every simulation tick.

**FrameBundle Schema:**
```json
{
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
  "decision_narrative": "Yielding right-of-way to autorickshaw cut-in from blindspot."
}
```
