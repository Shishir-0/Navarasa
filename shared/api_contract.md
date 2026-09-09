# NAVRASA Telemetry & Simulator API Contract
**Version:** `1.0.0`  
**Standard:** Locked Shared Data Interface between Simulator (CARLA / Real-World Bridge) and NAVRASA Autonomy Platform.

---

## 1. Coordinate Frame & Unit System

All data exchanges adhere to the **ISO 8855 / Flu (Forward-Left-Up)** right-handed vehicle coordinate frame:
- **X-axis ($+x$)**: Forward along longitudinal axis (meters $m$).
- **Y-axis ($+y$)**: Left along lateral axis (meters $m$).
- **Z-axis ($+z$)**: Up along vertical axis (meters $m$).
- **Yaw ($\psi$)**: Orientation counter-clockwise from $+x$ axis in radians $[-\pi, +\pi]$.
- **Velocity ($\mathbf{v}$)**: Linear velocity in $m/s$.
- **Acceleration ($a$)**: Linear acceleration in $m/s^2$.
- **Angular Velocity ($\omega$)**: Yaw rate in $rad/s$.
- **Timestamp ($t$)**: High-precision epoch float in seconds.

---

## 2. Ingestion Endpoint: `POST /simulation/ingest`

Ingests raw simulator frames directly into the NAVRASA Telemetry Bus.

### Request Headers
```http
Content-Type: application/json
X-NAVRASA-Version: 1.0.0
```

### Request Payload (`FrameBundleIn`)
```json
{
  "version": "1.0.0",
  "frame_id": 1420,
  "timestamp": 142.05,
  "scenario": "autorickshaw_cutin_blindspot",
  "ego": {
    "actor_id": "ego",
    "actor_type": "EGO",
    "position": { "x": 12.4, "y": 0.0 },
    "heading": 0.02,
    "velocity": { "x": 8.5, "y": 0.1 },
    "speed": 8.5,
    "yaw_rate": 0.01,
    "acceleration": 0.2,
    "bbox": { "length": 4.8, "width": 2.0, "height": 1.5 },
    "is_occluded": false,
    "confidence": 1.0
  },
  "actors": [
    {
      "actor_id": "auto_01",
      "actor_type": "AUTORICKSHAW",
      "position": { "x": 22.1, "y": -2.4 },
      "heading": 0.45,
      "velocity": { "x": 6.2, "y": 2.1 },
      "speed": 6.54,
      "yaw_rate": 0.05,
      "acceleration": -0.1,
      "bbox": { "length": 2.8, "width": 1.3, "height": 1.8 },
      "is_occluded": false,
      "confidence": 0.95
    }
  ],
  "camera": {
    "sensor_id": "cam_front",
    "detections": []
  },
  "lidar": {
    "sensor_id": "lidar_top",
    "detections": [],
    "point_count": 1280
  },
  "radar": {
    "sensor_id": "radar_front",
    "detections": []
  }
}
```

### Response
```json
{
  "status": "ACCEPTED",
  "frame_id": 1420,
  "processed_timestamp": 142.05,
  "pipeline_latency_ms": 14.8,
  "cbf_active": false
}
```

---

## 3. Real-Time Telemetry Bus Topics

The central `TelemetryBus` broadcasts events across asynchronous internal channels:

| Topic | Event Payload | Frequency | Description |
| :--- | :--- | :--- | :--- |
| `RAW_FRAME` | `FrameBundleIn` | 20 Hz | Raw ingestion event from CARLA / simulator. |
| `TRACKS_UPDATED` | `List[TrackState]` | 20 Hz | UKF / KF filtered state estimates with covariance & gating. |
| `GRAPH_UPDATED` | `RoadIntentGraphState`| 20 Hz | Dynamic NetworkX relational graph. |
| `GNN_REASONED` | `GNNOutput` | 20 Hz | Relational attention logits and interaction embeddings. |
| `PREDICTIONS_COMPLETED` | `PredictionState` | 20 Hz | Multi-hypothesis trajectory branch forecasts with probabilities. |
| `RISK_FIELD_GENERATED` | `RiskGridMap` | 20 Hz | 2D continuous spatio-temporal risk potential field. |
| `PLAN_REPLANNED` | `PlanState` | 10 Hz | Kinodynamic Hybrid A* optimized trajectory. |
| `CONTROL_SHIELDED` | `ControlCommand` | 20 Hz | Constrained MPC output filtered through CBF-QP safety shield. |
| `SAFETY_OVERRIDE` | `SafetyInterventionEvent`| Event-driven | High-order barrier violation warning emitted when $h(x) < 0$. |
| `TIMELINE_EVENT` | `TimelineEvent` | Event-driven | Causal decision step logged to chronological replay timeline. |

---

## 4. WebSocket Streaming Protocol: `/ws/stream`

### Handshake & Heartbeat
1. Client connects via `ws://<host>:<port>/ws/stream`.
2. Client sends `"ping"` every 3.0 seconds.
3. Server responds immediately with `"pong"`.
4. Server continuously streams JSON-serialized `FrameBundle` payloads upon each pipeline completion.

---

## 5. Replay & Scrubber API

- **`GET /replay/frames?start_id=0&limit=300`**: Retrieves rolling historical telemetry frames.
- **`POST /replay/seek/{frame_id}`**: Fast-forwards/rewinds pipeline inspection state to a specific historical frame index.
