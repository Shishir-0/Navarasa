# NAVRASA: Neural Adaptive Vehicular Reasoning with Anticipatory Scene Awareness
## System Architecture Manual

NAVRASA is an end-to-end, research-grade autonomous driving software stack designed specifically for unstructured, high-density, and non-lane-abiding traffic environments characteristic of Indian roads.

---

### Pipeline Architecture Overview

```
               +---------------------------------------------------+
               |             Simulation / Sensor Suite             |
               |       (LiDAR Point Clouds, Camera, Radar)         |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               |           Multi-Target Tracker (MTT)              |
               |   [4D KF / 5D CTRV UKF + Mahalanobis + Hungarian] |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               |             Road Intent Graph (RIG)               |
               |    [Dynamic Relational Graph + Spatial/TTC]       |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               |           GNN Relational Intent Reasoner          |
               |     [PyTorch RGAT Multi-Head Attention Head]      |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               |            Future Road Composer (FRC)             |
               |       [Top-K Multi-Modal Trajectory Predictor]    |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               |             Dynamic 2D Spatial Risk Field         |
               |  [R(x,y) = w1*TTC + w2*Kinetic + w3*Unc + w4*Occ] |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               |           Hierarchical Motion Planning            |
               |    [Kinodynamic Hybrid A* in SE(2) + D* Lite]     |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               |          Quintic Spline Trajectory Optimizer      |
               |        [C^2 Continuity & Jerk Minimization]       |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               |       Constrained Model Predictive Control        |
               |           [Kinematic Bicycle MPC in QP]           |
               +---------------------------------------------------+
                                         |
                                         v
               +---------------------------------------------------+
               |    Control Barrier Function Shield (CBF-QP)       |
               |     [Strict Forward Invariance Safety Guard]      |
               +---------------------------------------------------+
                                         |
                        +----------------+----------------+
                        |                                 |
                        v                                 v
        +-------------------------------+ +-------------------------------+
        |    FastAPI & WebSocket Hub    | |   Streamlit Mission Control   |
        |   (REST & JSON Frame Stream)  | |   (Interactive Engineering)   |
        +-------------------------------+ +-------------------------------+
```

---

### Subsystem Directory Organization

| Directory | Role & Deliverables |
|:---|:---|
| `backend/core/` | Domain types (`types.py`), SE(2) geometry & SAT collision engine (`math_utils.py`), configuration management (`config.py`). |
| `backend/` | Central pipeline orchestrator (`engine.py`) and normalized SQLite database persistence (`database.py`). |
| `simulation/` | Synthetic Indian road micro-simulation world (`synthetic_world.py`), scenario loaders (`scenarios.py`), CARLA bridge (`carla_bridge.py`). |
| `perception/` | Multi-modal sensor measurement models (`sensor_models.py`). |
| `tracking/` | Linear Kalman Filter (`kalman_filter.py`), 5D CTRV UKF (`ukf.py`), Mahalanobis gating (`gating.py`), Hungarian association (`matching.py`), Track lifecycle manager (`tracker.py`). |
| `graph/` | Dynamic NetworkX graph builder (`road_intent_graph.py`), spatial relationship classifiers (`spatial_relations.py`), PyTorch RGAT reasoner (`gnn_reasoning.py`). |
| `prediction/` | Multi-modal Future Road Composer (`future_composer.py`), maneuver modes (`intent_modes.py`), 2D continuous potential Risk Field (`risk_field.py`). |
| `planning/` | Baseline $A^*$ (`a_star.py`), $D^*$ Lite replanner (`d_star_lite.py`), Kinodynamic Hybrid $A^*$ (`hybrid_a_star.py`), Quintic Polynomial Splines (`polynomial_spline.py`). |
| `control/` | Kinematic & Dynamic Bicycle models (`bicycle_model.py`), Constrained MPC (`mpc.py`), Control Barrier Function safety shield (`cbf.py`). |
| `api/` | FastAPI REST endpoints & WebSocket live JSON broadcaster (`server.py`). |
| `dashboard/` | Streamlit + Plotly Mission Control engineering room (`app.py`, `components/`, `telemetry.py`). |
| `tests/` | Unit, Integration, Scenario Benchmarks, and Monte Carlo robustness test suite (`tests/`). |
