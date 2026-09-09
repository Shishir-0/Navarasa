"""
NAVRASA Central Autonomy Engine & Integrated Telemetry Pipeline Coordinator.

Orchestrates the complete research-grade autonomy loop:
Simulation / Sensors -> Perception -> Multi-Target Tracker (KF/UKF) ->
Road Intent Graph (NetworkX) -> GNN Relational Reasoning (PyTorch) ->
Future Road Composer (Multi-modal) -> Dynamic 2D Risk Field ->
Hierarchical Planning (Kinodynamic Hybrid A*) -> Spline Optimization ->
Model Predictive Control (MPC) -> Control Barrier Functions (CBF-QP) ->
Persistence & Telemetry Bus Broadcasting.
"""

from __future__ import annotations
import math
import time
import logging
from typing import Dict, List, Optional, Tuple, Any
import numpy as np

from backend.core.types import (
    ActorType,
    ActorState,
    TrackState,
    RoadIntentGraphState,
    PredictionState,
    RiskGridMap,
    PlanState,
    ControlCommand,
    SystemMetrics,
    FrameBundle
)
from backend.core.config import load_config, NavrasaConfig
from backend.database import NavrasaDatabase
from backend.telemetry_bus import TelemetryBus, TelemetryEvent, TelemetryTopic, global_telemetry_bus
from backend.decision_timeline import global_decision_timeline
from simulation.synthetic_world import SyntheticWorld
from simulation.scenarios import get_scenario_by_id
from tracking.tracker import MultiTargetTracker
from graph.road_intent_graph import RoadIntentGraph
from graph.gnn_reasoning import IntentGNNReasoner
from prediction.future_composer import FutureRoadComposer
from prediction.risk_field import DynamicRiskField
from planning.hybrid_a_star import KinodynamicHybridAStar
from planning.polynomial_spline import QuinticTrajectoryOptimizer
from control.mpc import ModelPredictiveController
from control.cbf import ControlBarrierFunctionShield

logger = logging.getLogger("NAVRASA.Engine")


class NavrasaAutonomyEngine:
    """Central Real-Time Execution Engine for NAVRASA."""

    def __init__(
        self,
        config: Optional[NavrasaConfig] = None,
        db_path: str = "navrasa_replay.db",
        bus: Optional[TelemetryBus] = None
    ):
        self.config = config or load_config()
        self.db = NavrasaDatabase(db_path=db_path)
        self.bus = bus or global_telemetry_bus

        # Initialize Subsystems
        self.world = SyntheticWorld()
        self.tracker = MultiTargetTracker(self.config.tracking)
        self.graph_builder = RoadIntentGraph(self.config.graph)
        self.gnn_reasoner = IntentGNNReasoner()
        self.future_composer = FutureRoadComposer(self.config.prediction)
        self.risk_field_gen = DynamicRiskField(self.config.risk_field)
        self.planner = KinodynamicHybridAStar(self.config.planning, self.config.vehicle)
        self.spline_opt = QuinticTrajectoryOptimizer()
        self.mpc = ModelPredictiveController(self.config.control, self.config.vehicle)
        self.cbf_shield = ControlBarrierFunctionShield(self.config.control, self.config.vehicle)

        self.frame_id = 0
        self.current_run_id = f"run_{int(time.time())}"
        self.active_scenario_name = "Default Scenario"
        self.cbf_interventions_count = 0
        self.target_goal = (60.0, 0.0, 0.0)

    def load_scenario(self, scenario_id: str):
        """Loads a specific Indian road scenario benchmark."""
        scen_dict = get_scenario_by_id(scenario_id)
        if scen_dict:
            self.active_scenario_name = scen_dict["name"]
            self.current_run_id = f"run_{scenario_id}_{int(time.time())}"
            self.db.start_run(self.current_run_id, scenario_id, self.active_scenario_name)
            self.world.load_scenario(scen_dict)

            goal = scen_dict.get("target_goal", {})
            self.target_goal = (goal.get("x", 60.0), goal.get("y", 0.0), goal.get("heading", 0.0))
            self.frame_id = 0
            self.cbf_interventions_count = 0
            self.tracker = MultiTargetTracker(self.config.tracking)
            self.bus.clear()
            logger.info(f"Loaded scenario: {self.active_scenario_name}")

    def step(self, dt: float = 0.05) -> FrameBundle:
        """
        Executes one complete frame of the end-to-end NAVRASA autonomy pipeline
        and broadcasts structured events over the TelemetryBus.
        """
        t_total_start = time.perf_counter()
        self.frame_id += 1
        sim_time = self.world.sim_time

        # 1. Simulation & Sensor Acquisition
        ego_state = self.world.get_ego_state()
        raw_detections = self.world.generate_sensor_detections()

        self.bus.publish(
            TelemetryTopic.RAW_FRAME,
            TelemetryEvent(
                topic=TelemetryTopic.RAW_FRAME,
                frame_id=self.frame_id,
                timestamp=sim_time,
                payload={"ego": ego_state, "detections": raw_detections},
                metadata={"scenario": self.active_scenario_name}
            )
        )

        # 2. Multi-Target Tracking (KF + UKF Lifecycle)
        t_track_start = time.perf_counter()
        tracks = self.tracker.step(raw_detections, dt=dt)
        t_track = (time.perf_counter() - t_track_start) * 1000.0

        self.bus.publish(
            TelemetryTopic.TRACKS_UPDATED,
            TelemetryEvent(
                topic=TelemetryTopic.TRACKS_UPDATED,
                frame_id=self.frame_id,
                timestamp=sim_time,
                payload=tracks,
                metadata={"active_count": len(tracks), "latency_ms": t_track}
            )
        )

        # 3. Road Intent Graph Construction & GNN Relational Reasoning
        t_graph_start = time.perf_counter()
        raw_graph = self.graph_builder.build_graph(ego_state, tracks, timestamp=sim_time)
        self.bus.publish(
            TelemetryTopic.GRAPH_UPDATED,
            TelemetryEvent(
                topic=TelemetryTopic.GRAPH_UPDATED,
                frame_id=self.frame_id,
                timestamp=sim_time,
                payload=raw_graph
            )
        )

        intent_graph = self.gnn_reasoner.reason_over_graph(raw_graph)
        t_graph = (time.perf_counter() - t_graph_start) * 1000.0

        self.bus.publish(
            TelemetryTopic.GNN_REASONED,
            TelemetryEvent(
                topic=TelemetryTopic.GNN_REASONED,
                frame_id=self.frame_id,
                timestamp=sim_time,
                payload=intent_graph,
                metadata={"latency_ms": t_graph}
            )
        )

        # 4. Future Road Composer (FRC Multi-Modal Trajectory Generation)
        t_pred_start = time.perf_counter()
        predictions = self.future_composer.generate_scene_predictions(tracks, intent_graph, timestamp=sim_time)
        t_pred = (time.perf_counter() - t_pred_start) * 1000.0

        self.bus.publish(
            TelemetryTopic.PREDICTIONS_COMPLETED,
            TelemetryEvent(
                topic=TelemetryTopic.PREDICTIONS_COMPLETED,
                frame_id=self.frame_id,
                timestamp=sim_time,
                payload=predictions,
                metadata={"latency_ms": t_pred}
            )
        )

        # 5. Dynamic 2D Spatial Risk Field
        t_risk_start = time.perf_counter()
        risk_map = self.risk_field_gen.generate_risk_map(ego_state, tracks, predictions, timestamp=sim_time)
        t_risk = (time.perf_counter() - t_risk_start) * 1000.0

        self.bus.publish(
            TelemetryTopic.RISK_FIELD_GENERATED,
            TelemetryEvent(
                topic=TelemetryTopic.RISK_FIELD_GENERATED,
                frame_id=self.frame_id,
                timestamp=sim_time,
                payload=risk_map,
                metadata={"latency_ms": t_risk}
            )
        )

        # 6. Hierarchical Planning (Kinodynamic Hybrid A*)
        t_plan_start = time.perf_counter()
        start_pose = (ego_state.position.x, ego_state.position.y, ego_state.heading)
        plan_state = self.planner.plan(start_pose, self.target_goal, tracks, risk_map)
        t_plan = (time.perf_counter() - t_plan_start) * 1000.0

        self.bus.publish(
            TelemetryTopic.PLAN_REPLANNED,
            TelemetryEvent(
                topic=TelemetryTopic.PLAN_REPLANNED,
                frame_id=self.frame_id,
                timestamp=sim_time,
                payload=plan_state,
                metadata={"latency_ms": t_plan, "is_replan": plan_state.is_replan}
            )
        )

        # 7. Safety-Critical Control (MPC + CBF Shield)
        t_ctrl_start = time.perf_counter()
        nom_accel, nom_steer, mpc_solve_time = self.mpc.solve(ego_state, plan_state)
        safe_accel, safe_steer, cbf_active, slack, min_margin = self.cbf_shield.filter_control(
            ego_state, tracks, nom_accel, nom_steer
        )
        t_ctrl = (time.perf_counter() - t_ctrl_start) * 1000.0

        if cbf_active:
            self.cbf_interventions_count += 1
            self.bus.publish(
                TelemetryTopic.SAFETY_OVERRIDE,
                TelemetryEvent(
                    topic=TelemetryTopic.SAFETY_OVERRIDE,
                    frame_id=self.frame_id,
                    timestamp=sim_time,
                    payload={"slack": slack, "margin": min_margin},
                    metadata={"reason": "CBF safety barrier violation"}
                )
            )

        control_cmd = ControlCommand(
            timestamp=sim_time,
            steering_angle=safe_steer,
            acceleration=safe_accel,
            throttle=max(0.0, safe_accel / 3.0) if safe_accel > 0 else 0.0,
            brake=min(1.0, -safe_accel / 6.0) if safe_accel < 0 else 0.0,
            cbf_active=cbf_active,
            cbf_slack=slack,
            cbf_safety_margin=min_margin,
            mpc_solve_time_ms=mpc_solve_time
        )

        # 8. Step World Physics with Safety-Shielded Actuation
        self.world.step(ego_steer=safe_steer, ego_accel=safe_accel, dt=dt)

        t_total_ms = (time.perf_counter() - t_total_start) * 1000.0
        fps = 1000.0 / max(1.0, t_total_ms)

        # Generate Explainable Narrative
        narrative = self._generate_narrative(tracks, intent_graph, cbf_active, min_margin)

        metrics = SystemMetrics(
            fps=fps,
            total_pipeline_latency_ms=t_total_ms,
            tracking_latency_ms=t_track,
            graph_latency_ms=t_graph,
            prediction_latency_ms=t_pred,
            risk_latency_ms=t_risk,
            planning_latency_ms=t_plan,
            control_latency_ms=t_ctrl,
            active_tracks_count=len(tracks),
            cbf_interventions_total=self.cbf_interventions_count,
            min_ttc=min_margin
        )

        bundle = FrameBundle(
            frame_id=self.frame_id,
            timestamp=sim_time,
            ego_state=ego_state,
            raw_detections=raw_detections,
            tracks=tracks,
            intent_graph=intent_graph,
            predictions=predictions,
            risk_map=risk_map,
            planned_trajectory=plan_state,
            control_command=control_cmd,
            metrics=metrics,
            decision_narrative=narrative
        )

        # Publish final control & record frame in bus rolling buffer
        self.bus.publish(
            TelemetryTopic.CONTROL_SHIELDED,
            TelemetryEvent(
                topic=TelemetryTopic.CONTROL_SHIELDED,
                frame_id=self.frame_id,
                timestamp=sim_time,
                payload=control_cmd,
                metadata={
                    "tracks": tracks,
                    "intent_graph": intent_graph,
                    "planned_trajectory": plan_state,
                    "min_ttc": min_margin,
                    "ego_speed": ego_state.speed
                }
            )
        )

        # Record in 300-frame buffer & persist to SQLite
        self.bus.record_frame(bundle)
        self.db.save_frame(self.current_run_id, bundle)

        return bundle

    def _generate_narrative(
        self,
        tracks: List[TrackState],
        graph: RoadIntentGraphState,
        cbf_active: bool,
        min_margin: float
    ) -> str:
        """Produces transparent, frame-by-frame natural language explainability."""
        if cbf_active:
            return f"SAFETY BARRIER INTERVENTION: High-order CBF override active! Proximity margin {min_margin:.1f}m. Decelerating to preserve safe set invariance."

        if not tracks:
            return "Clear road ahead: Cruising on planned global trajectory with zero active conflict."

        # Check for conflicts or yielding in graph
        for e in graph.edges:
            if e.source_id == "ego" and e.edge_type.value == "CONFLICT":
                return f"CONFLICT DETECTED: Anticipating convergence with {e.target_id} (TTC: {e.time_to_collision:.1f}s). Nudging trajectory around potential hazard."
            elif e.source_id == "ego" and e.edge_type.value == "YIELD_NEGOTIATION":
                return f"NEGOTIATION ACTIVE: Yielding right-of-way to actor {e.target_id} with higher priority score."

        return f"Tracking {len(tracks)} active dynamic participants. Trajectory smooth; risk potential within nominal bounds."
