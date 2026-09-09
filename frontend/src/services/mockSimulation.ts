import {
  FrameBundle,
  ActorType,
  TrackStatus,
  IntentEdgeType,
  IntentNodeType,
} from "../types/navrasa";

class ClientSimulationEngine {
  private frameId = 0;
  private simTime = 0.0;
  private egoX = 0.0;
  private egoY = 0.0;
  private egoSpeed = 8.5;
  private cbfInterventions = 0;

  public reset(scenarioId: string = "autorickshaw_cutin_blindspot") {
    this.frameId = 0;
    this.simTime = 0.0;
    this.egoX = 0.0;
    this.egoY = 0.0;
    this.egoSpeed = 8.5;
    this.cbfInterventions = 0;
  }

  public step(dt: number = 0.05, scenarioId: string = "autorickshaw_cutin_blindspot"): FrameBundle {
    this.frameId += 1;
    this.simTime += dt;

    // Advance ego forward
    this.egoX += this.egoSpeed * dt;

    // Simulation actor dynamics based on scenario
    const t = this.simTime;
    let narrative = "Nominal trajectory cruise. Road Intent Graph monitoring surrounding actors.";
    let cbfActive = false;
    let safeMargin = 4.5;
    let steering = 0.0;
    let accel = 0.2;

    // Dynamic Actors
    const tracks: any[] = [];
    const detections: any[] = [];
    const nodes: Record<string, any> = {};
    const edges: any[] = [];
    const predictions: Record<string, any> = {};

    // 1. Ego Node
    nodes["ego"] = {
      node_id: "ego",
      node_type: "EGO" as IntentNodeType,
      actor_type: "EGO" as ActorType,
      position: { x: this.egoX, y: this.egoY },
      velocity: { x: this.egoSpeed, y: 0.0 },
      heading: 0.0,
      speed: this.egoSpeed,
      priority_score: 0.5,
      uncertainty: 0.05,
      features: [this.egoX, this.egoY, this.egoSpeed, 0, this.egoSpeed, 0, 0.5, 0.05],
    };

    if (scenarioId === "autorickshaw_cutin_blindspot") {
      // Auto-rickshaw cuts in from right lane at t=1.5s
      const rickshawX = this.egoX + Math.max(3.0, 15.0 - t * 1.8);
      const rickshawY = t < 1.5 ? 3.2 : Math.max(0.2, 3.2 - (t - 1.5) * 1.2);
      const rickshawSpeed = 7.0;

      tracks.push({
        track_id: "trk_rickshaw_01",
        actor_type: "AUTORICKSHAW" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [rickshawX, rickshawY, rickshawSpeed, 0],
        covariance_matrix: [[0.15, 0], [0, 0.15]],
        position: { x: rickshawX, y: rickshawY },
        velocity: { x: rickshawSpeed, y: t > 1.5 ? -0.8 : 0 },
        speed: rickshawSpeed,
        heading: t > 1.5 ? -0.15 : 0.0,
        yaw_rate: t > 1.5 ? -0.05 : 0.0,
        bbox: { length: 2.8, width: 1.4, height: 1.8 },
        age: 24,
        hits: 24,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 1.2,
      });

      // Pedestrian crossing from blind spot
      const pedX = this.egoX + 22.0;
      const pedY = Math.max(-1.5, 5.0 - t * 0.8);
      tracks.push({
        track_id: "trk_pedestrian_01",
        actor_type: "PEDESTRIAN" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [pedX, pedY, 0, -1.2],
        covariance_matrix: [[0.2, 0], [0, 0.2]],
        position: { x: pedX, y: pedY },
        velocity: { x: 0, y: -1.2 },
        speed: 1.2,
        heading: -Math.PI / 2,
        yaw_rate: 0.0,
        bbox: { length: 0.6, width: 0.6, height: 1.7 },
        age: 18,
        hits: 18,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 0.8,
      });

      // Check proximity and trigger CBF if critical
      const distToRickshaw = Math.hypot(rickshawX - this.egoX, rickshawY - this.egoY);
      if (distToRickshaw < 7.0 && t > 2.0) {
        cbfActive = true;
        safeMargin = 1.1;
        accel = -2.8;
        steering = 0.08;
        this.egoSpeed = Math.max(3.0, this.egoSpeed - 0.1);
        this.cbfInterventions += 1;
        narrative = `⚠️ CBF INTERVENTION ACTIVE: Proximity to Auto-Rickshaw (${distToRickshaw.toFixed(1)}m) violates safe barrier margin. Decelerating to ${this.egoSpeed.toFixed(1)} m/s.`;
      } else if (distToRickshaw < 14.0) {
        narrative = `Road Intent Graph: Anticipating lateral cut-in from Autorickshaw (TTC: ${(distToRickshaw / 3.0).toFixed(1)}s). GNN edge attention elevated to 0.88.`;
      }
    } else if (scenarioId === "cow_blockage_lateral_nudge") {
      const cowX = this.egoX + Math.max(0.0, 20.0 - t * 2.0);
      const cowY = -0.5;

      tracks.push({
        track_id: "trk_cattle_01",
        actor_type: "CATTLE" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [cowX, cowY, 0, 0],
        covariance_matrix: [[0.1, 0], [0, 0.1]],
        position: { x: cowX, y: cowY },
        velocity: { x: 0, y: 0 },
        speed: 0.0,
        heading: 0.3,
        yaw_rate: 0.0,
        bbox: { length: 2.2, width: 1.1, height: 1.5 },
        age: 50,
        hits: 50,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 0.4,
      });

      // Oncoming Bus
      const busX = this.egoX + 45.0 - t * 4.0;
      tracks.push({
        track_id: "trk_bus_01",
        actor_type: "BUS" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [busX, 2.5, -6.0, 0],
        covariance_matrix: [[0.2, 0], [0, 0.2]],
        position: { x: busX, y: 2.5 },
        velocity: { x: -6.0, y: 0 },
        speed: 6.0,
        heading: Math.PI,
        yaw_rate: 0.0,
        bbox: { length: 10.5, width: 2.6, height: 3.2 },
        age: 40,
        hits: 40,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 1.1,
      });

      if (cowX - this.egoX < 15.0 && cowX - this.egoX > 0) {
        steering = -0.15; // Nudge left around cow
        narrative = "Kinodynamic Hybrid A* actively nudging around stationary cattle. Preserving CBF safety corridor against oncoming Bus.";
      }
    }

    // Build Graph Nodes & Edges
    tracks.forEach((trk) => {
      nodes[trk.track_id] = {
        node_id: trk.track_id,
        node_type: trk.actor_type === "PEDESTRIAN" || trk.actor_type === "CATTLE" ? "VULNERABLE_ROAD_USER" : "DYNAMIC_ACTOR",
        actor_type: trk.actor_type,
        position: trk.position,
        velocity: trk.velocity,
        heading: trk.heading,
        speed: trk.speed,
        priority_score: trk.actor_type === "CATTLE" ? 0.95 : trk.actor_type === "PEDESTRIAN" ? 0.90 : 0.65,
        uncertainty: 0.15,
        features: [trk.position.x, trk.position.y, trk.velocity.x, trk.velocity.y, trk.speed, trk.heading, 0.7, 0.15],
      };

      const dist = Math.hypot(trk.position.x - this.egoX, trk.position.y - this.egoY);
      const isConflict = dist < 12.0;
      edges.push({
        source_id: "ego",
        target_id: trk.track_id,
        edge_type: isConflict ? ("CONFLICT" as IntentEdgeType) : ("PROXIMITY" as IntentEdgeType),
        weight: Math.max(0.1, 1.0 - dist / 30.0),
        spatial_distance: dist,
        time_to_collision: dist > 1.0 ? dist / 5.0 : 0.5,
        relative_velocity: 3.2,
        attention_weight: isConflict ? 0.85 : 0.35,
      });
    });

    // Multi-modal Predictions
    tracks.forEach((trk) => {
      predictions[trk.track_id] = {
        actor_id: trk.track_id,
        actor_type: trk.actor_type,
        most_likely_hypothesis: `${trk.track_id}_nom`,
        epistemic_uncertainty: 0.15,
        hypotheses: [
          {
            hypothesis_id: `${trk.track_id}_nom`,
            maneuver_name: "CRUISE_STRAIGHT",
            probability: 0.55,
            waypoints: Array.from({ length: 25 }, (_, i) => {
              const dtStep = (i + 1) * 0.1;
              return {
                x: trk.position.x + trk.speed * Math.cos(trk.heading) * dtStep,
                y: trk.position.y + trk.speed * Math.sin(trk.heading) * dtStep,
                v: trk.speed,
                yaw: trk.heading,
                curvature: 0,
                acceleration: 0,
                jerk: 0,
                time: dtStep,
                std_x: 0.1 + 0.15 * dtStep,
                std_y: 0.1 + 0.15 * dtStep,
              };
            }),
          },
          {
            hypothesis_id: `${trk.track_id}_swerve`,
            maneuver_name: "AGGRESSIVE_CUT_IN",
            probability: 0.30,
            waypoints: Array.from({ length: 25 }, (_, i) => {
              const dtStep = (i + 1) * 0.1;
              return {
                x: trk.position.x + trk.speed * 0.9 * dtStep,
                y: trk.position.y - 0.4 * dtStep * dtStep,
                v: trk.speed * 0.9,
                yaw: trk.heading - 0.2,
                curvature: 0.05,
                acceleration: 0,
                jerk: 0,
                time: dtStep,
                std_x: 0.15 + 0.25 * dtStep,
                std_y: 0.15 + 0.25 * dtStep,
              };
            }),
          },
          {
            hypothesis_id: `${trk.track_id}_brake`,
            maneuver_name: "YIELD_DECELERATE",
            probability: 0.15,
            waypoints: Array.from({ length: 25 }, (_, i) => {
              const dtStep = (i + 1) * 0.1;
              return {
                x: trk.position.x + Math.max(0, trk.speed - 1.5 * dtStep) * dtStep,
                y: trk.position.y,
                v: Math.max(0, trk.speed - 1.5 * dtStep),
                yaw: trk.heading,
                curvature: 0,
                acceleration: -1.5,
                jerk: 0,
                time: dtStep,
                std_x: 0.1 + 0.1 * dtStep,
                std_y: 0.1 + 0.1 * dtStep,
              };
            }),
          },
        ],
      };
    });

    // Simulated LiDAR Points (150 radial hits)
    for (let i = 0; i < 120; i++) {
      const angle = (i / 120) * Math.PI * 2;
      const baseRange = 25.0 + 10.0 * Math.sin(angle * 3.0 + t);
      detections.push({
        detection_id: `lidar_${i}`,
        sensor_type: "LIDAR",
        position: {
          x: this.egoX + baseRange * Math.cos(angle),
          y: this.egoY + baseRange * Math.sin(angle),
        },
        bbox: { length: 0.2, width: 0.2, height: 0.2 },
        confidence: 0.98,
        covariance: [[0.05, 0], [0, 0.05]],
      });
    }

    // 2D Risk Grid Map (40x40 grid around ego)
    const riskGridSize = 30;
    const riskData: number[][] = [];
    for (let r = 0; r < riskGridSize; r++) {
      const row: number[] = [];
      const yCoord = this.egoY - 15 + r;
      for (let c = 0; c < riskGridSize; c++) {
        const xCoord = this.egoX - 10 + c * 1.5;
        let riskVal = 0.05;
        tracks.forEach((trk) => {
          const d = Math.hypot(xCoord - trk.position.x, yCoord - trk.position.y);
          riskVal += Math.exp(-0.5 * (d / 2.5) ** 2) * (trk.speed > 0 ? 0.7 : 0.5);
        });
        row.push(Math.min(1.0, riskVal));
      }
      riskData.push(row);
    }

    // Planned Path (Hybrid A* Waypoints)
    const plannedWaypoints = Array.from({ length: 30 }, (_, i) => {
      const stepT = i * 0.1;
      const pX = this.egoX + i * 1.8;
      const pY = this.egoY + (cbfActive ? -0.8 : 0.0) * Math.sin(i * 0.15);
      return {
        x: pX,
        y: pY,
        v: this.egoSpeed,
        yaw: 0.0,
        curvature: 0.02,
        acceleration: 0.0,
        jerk: 0.05,
        time: stepT,
        std_x: 0.1,
        std_y: 0.1,
      };
    });

    return {
      frame_id: this.frameId,
      timestamp: this.simTime,
      ego_state: {
        actor_id: "ego",
        actor_type: "EGO",
        position: { x: this.egoX, y: this.egoY },
        heading: 0.0,
        velocity: { x: this.egoSpeed, y: 0.0 },
        speed: this.egoSpeed,
        yaw_rate: 0.0,
        acceleration: accel,
        bbox: { length: 4.8, width: 2.0, height: 1.5 },
        is_occluded: false,
        confidence: 1.0,
      },
      raw_detections: detections,
      tracks: tracks,
      intent_graph: {
        timestamp: this.simTime,
        nodes: nodes,
        edges: edges,
        conflict_hotspots: cbfActive ? [{ x: this.egoX + 6.0, y: 1.0 }] : [],
      },
      predictions: {
        timestamp: this.simTime,
        horizon_seconds: 2.5,
        dt: 0.1,
        predictions: predictions,
      },
      risk_map: {
        timestamp: this.simTime,
        origin_x: this.egoX - 10,
        origin_y: this.egoY - 15,
        resolution: 1.0,
        width: riskGridSize,
        height: riskGridSize,
        data: riskData,
      },
      planned_trajectory: {
        timestamp: this.simTime,
        planner_type: "HYBRID_A_STAR",
        waypoints: plannedWaypoints,
        is_replan: cbfActive,
        planning_time_ms: 18.5,
        path_length: 54.0,
        max_curvature: 0.12,
        max_jerk: 0.18,
        cost: 45.2,
        success: true,
      },
      control_command: {
        timestamp: this.simTime,
        steering_angle: steering,
        acceleration: accel,
        throttle: accel > 0 ? accel / 3.0 : 0.0,
        brake: accel < 0 ? Math.abs(accel) / 6.0 : 0.0,
        cbf_active: cbfActive,
        cbf_slack: 0.0,
        cbf_safety_margin: safeMargin,
        mpc_cost: 12.4,
        mpc_solve_time_ms: 8.2,
      },
      metrics: {
        fps: 32.5,
        total_pipeline_latency_ms: 31.2,
        tracking_latency_ms: 3.4,
        graph_latency_ms: 2.8,
        prediction_latency_ms: 5.1,
        risk_latency_ms: 6.2,
        planning_latency_ms: 9.5,
        control_latency_ms: 4.2,
        active_tracks_count: tracks.length,
        cbf_interventions_total: this.cbfInterventions,
        min_ttc: safeMargin,
        tracking_stability_score: 0.98,
      },
      decision_narrative: narrative,
    };
  }
}

export const clientSimulator = new ClientSimulationEngine();
