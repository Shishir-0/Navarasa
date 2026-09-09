# NAVRASA: Neural Adaptive Vehicular Reasoning with Anticipatory Scene Awareness
### A Research-Grade Software-Only Autonomous Driving Framework for Unstructured Indian Roads (SIH 2026)

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128-green.svg)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-red.svg)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests: 43 Passed](https://img.shields.io/badge/Tests-43%20Passed-brightgreen.svg)]()

---

## 🌟 Overview

**NAVRASA** is an end-to-end, research-grade, software-only autonomous driving platform built from the ground up to solve navigation in chaotic, high-density, and non-lane-abiding traffic environments characteristic of Indian roads.

Unlike conventional AV stacks that rely on rigid lane lines and structured vehicle rules, NAVRASA pioneers **Road Intent Intelligence** — modeling collective agent interactions, multi-modal probabilistic futures, continuous spatial risk fields, and safety-critical control barrier shields.

---

## 🚀 Key Modules & Innovations

1. **Multi-Target Tracker (MTT)**:
   - 4D Linear Kalman Filter & 5D Non-Linear CTRV Unscented Kalman Filter (UKF).
   - $\chi^2$ Mahalanobis distance statistical gating.
   - Global bipartite assignment via the Hungarian algorithm (`scipy.optimize.linear_sum_assignment`).
   - Track lifecycle management (Tentative $\to$ Confirmed $\to$ Coasting $\to$ Deleted).

2. **Road Intent Graph (RIG)**:
   - Dynamic NetworkX relational scene graph updated every frame.
   - Node attributes for Ego, dynamic vehicles, autorickshaws, two-wheelers, pedestrians, and cattle.
   - Attributed interaction edges: `FOLLOWING`, `CROSSING`, `MERGING`, `OVERTAKING`, `LATERAL_ENCROACHMENT`, `YIELD_NEGOTIATION`, `CONFLICT`.

3. **GNN Relational Reasoning**:
   - PyTorch Relational Graph Attention Network (RGAT) with multi-head attention.
   - Infers implicit right-of-way negotiation logits and agent assertiveness scores at unsignalized junctions.

4. **Future Road Composer (FRC)**:
   - Top-$K$ multi-hypothesis probabilistic trajectory predictor over a 3.0s horizon.
   - Models cut-ins, sudden swerves, and yielding behaviors with covariance growth uncertainty envelopes.

5. **Dynamic 2D Spatial Risk Field**:
   - Continuous potential field combining Time-to-Collision (TTC), kinetic momentum, prediction uncertainty, and occlusion shadows.
   - Provides discretized 2D grid maps and spatial gradients $(\nabla_x \mathcal{R}, \nabla_y \mathcal{R})$.

6. **Hierarchical Motion Planning**:
   - 2D Baseline $A^*$ for global connectivity.
   - $D^*$ Lite for dynamic real-time replanning upon sudden obstacle pop-outs.
   - Kinodynamic Hybrid $A^*$ exploring continuous $SE(2)$ with non-holonomic bicycle kinematics, dual heuristics, and Reeds-Shepp/Dubins analytical expansion.
   - Quintic Polynomial Splines minimizing integrated jerk and curvature variations.

7. **Safety-Critical Control (MPC + CBF-QP)**:
   - Constrained Finite-Horizon Model Predictive Controller solving QP for trajectory tracking.
   - Independent High-Order Control Barrier Function (CBF-QP) safety shield guaranteeing forward invariance of the collision-free set $\mathcal{C}$.

8. **Mission Control Operations Dashboard**:
   - Interactive Streamlit + Plotly control room displaying live BEV world canvas, LiDAR points, Intent Graph, Future Composer fan-outs, dynamic risk contours, telemetry HUD, and frame-by-frame explainability narratives.

---

## 🛠️ Repository Structure

```
NAVRASA/
├── backend/
│   ├── core/
│   │   ├── types.py            # Pydantic v2 schemas for all pipeline data
│   │   ├── config.py           # Configuration manager & YAML parser
│   │   └── math_utils.py       # SE(2) Lie group transforms & SAT collision engine
│   ├── engine.py               # Central Pipeline Coordinator & Orchestrator
│   └── database.py             # SQLite normalized persistence & replay store
├── simulation/
│   ├── synthetic_world.py      # Micro-simulator for heterogeneous Indian road agents
│   ├── scenarios.py            # Scenario benchmark loader
│   └── carla_bridge.py         # CARLA Simulator client & sensor bridge
├── perception/
│   └── sensor_models.py        # Multi-modal LiDAR, Camera, Radar coordinate transforms
├── tracking/
│   ├── kalman_filter.py        # 4D Linear Kalman Filter
│   ├── ukf.py                  # 5D CTRV Unscented Kalman Filter
│   ├── gating.py               # Chi-squared Mahalanobis distance gating
│   ├── matching.py             # Global Hungarian bipartite data association
│   └── tracker.py              # Multi-target tracker with lifecycle management
├── graph/
│   ├── road_intent_graph.py    # Dynamic NetworkX relational graph
│   ├── spatial_relations.py    # Spatial & temporal relation classifier (TTC, Encroachment)
│   └── gnn_reasoning.py        # PyTorch Relational Graph Attention Network (RGAT)
├── prediction/
│   ├── future_composer.py      # Top-K multi-modal trajectory predictor
│   ├── intent_modes.py         # Maneuver modes enum
│   └── risk_field.py           # Dynamic 2D spatial risk potential field
├── planning/
│   ├── a_star.py               # 2D Grid baseline A*
│   ├── d_star_lite.py          # D* Lite dynamic replanner
│   ├── hybrid_a_star.py        # Kinodynamic Hybrid A* in SE(2)
│   └── polynomial_spline.py    # Quintic polynomial spline optimizer
├── control/
│   ├── bicycle_model.py        # Kinematic & Dynamic Bicycle vehicle models
│   ├── mpc.py                  # Constrained Model Predictive Controller
│   └── cbf.py                  # Control Barrier Function (CBF-QP) safety shield
├── dashboard/
│   ├── app.py                  # Streamlit Mission Control application
│   ├── telemetry.py            # Telemetry HUD and latency profiling
│   └── components/
│       ├── bev_canvas.py       # Interactive BEV Plotly canvas
│       └── graph_view.py       # Interactive RIG graph visualizer
├── api/
│   └── server.py               # FastAPI REST & WebSocket streaming server
├── configs/
│   ├── default_config.yaml     # Autonomy system parameters
│   └── scenarios.yaml          # Indian road benchmark scenarios
├── tests/
│   ├── unit/                   # Algorithmic and mathematical unit tests
│   ├── integration/            # End-to-end pipeline and API tests
│   ├── scenarios/              # Real-world Indian road challenge benchmarks
│   └── monte_carlo/            # Randomized robustness and CBF invariance tests
├── docs/
│   ├── ARCHITECTURE.md         # System Architecture Manual
│   ├── RESEARCH_NOTES.md       # Mathematical formulations & research references
│   └── API_REFERENCE.md        # REST & WebSocket API reference
├── requirements.txt            # Dependency manifest
└── README.md                   # Master Documentation
```

---

## ⚡ Quickstart Guide

### 1. Installation
```bash
git clone https://github.com/Shishir-0/Navarasa.git
cd Navarasa
pip install -r requirements.txt
```

### 2. Launch Mission Control Dashboard
```bash
streamlit run dashboard/app.py
```
Open your browser at `http://localhost:8501` to access the interactive Mission Control operations center.

### 3. Launch FastAPI REST & WebSocket Server
```bash
uvicorn api.server:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger API docs available at `http://localhost:8000/docs`.

### 4. Run the Full Test Suite
```bash
pytest tests/ -v
```

---

## 📊 Benchmark Scenarios

NAVRASA includes three canonical Indian traffic challenge scenarios in `configs/scenarios.yaml`:

1. **`autorickshaw_cutin_blindspot`**:
   An autorickshaw abruptly overtakes and cuts across the ego vehicle while an occluded pedestrian crosses from behind a parked truck.
2. **`unmarked_intersection_chaos`**:
   Unsignalized 4-way intersection negotiation with wrong-side two-wheelers and crossing vehicles.
3. **`cow_blockage_lateral_nudge`**:
   Stationary cattle blocking the travel lane, requiring kinodynamic Hybrid A* nudging around the animal while satisfying CBF safety barriers against oncoming traffic.

---

## 📜 Research & Mathematical Foundations

For complete equations, continuous time derivations, algorithmic complexity tables, and literature citations, see [RESEARCH_NOTES.md](file:///docs/RESEARCH_NOTES.md).

---

## 👥 Authors
Built for **Smart India Hackathon (SIH) 2026** by Team NAVRASA.
