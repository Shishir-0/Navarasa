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

  public reset(scenarioId: string = "market") {
    this.frameId = 0;
    this.simTime = 0.0;
    this.egoX = 0.0;
    this.egoY = 0.0;
    this.egoSpeed = 8.5;
    this.cbfInterventions = 0;
  }

  public step(dt: number = 0.05, scenarioId: string = "market"): FrameBundle {
    this.frameId += 1;
    this.simTime += dt;

    // Advance ego forward
    this.egoX += this.egoSpeed * dt;

    const t = this.simTime;
    let narrative = "Nominal trajectory cruise. Road Intent Graph monitoring surrounding actors.";
    let cbfActive = false;
    let safeMargin = 4.5;
    let steering = 0.0;
    let accel = 0.2;

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

    if (scenarioId === "market") {
      // Pedestrian crossing in market
      const pedX = this.egoX + Math.max(5.0, 18.0 - t * 1.5);
      const pedY = Math.max(-0.5, 3.5 - t * 1.0);
      tracks.push({
        track_id: "trk_market_ped",
        actor_type: "PEDESTRIAN" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [pedX, pedY, 0, -1.2],
        covariance_matrix: [[0.18, 0], [0, 0.18]],
        position: { x: pedX, y: pedY },
        velocity: { x: 0, y: -1.2 },
        speed: 1.2,
        heading: -Math.PI / 2,
        yaw_rate: 0.0,
        bbox: { length: 0.6, width: 0.6, height: 1.7 },
        age: 20,
        hits: 20,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 0.9,
      });

      // Motorcycle weaving
      const bikeX = this.egoX + Math.max(4.0, 14.0 - t * 2.0);
      const bikeY = t < 1.2 ? 2.5 : Math.max(0.3, 2.5 - (t - 1.2) * 1.4);
      tracks.push({
        track_id: "trk_market_bike",
        actor_type: "TWO_WHEELER" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [bikeX, bikeY, 8.5, 0],
        covariance_matrix: [[0.22, 0], [0, 0.22]],
        position: { x: bikeX, y: bikeY },
        velocity: { x: 8.5, y: -0.6 },
        speed: 8.5,
        heading: -0.1,
        yaw_rate: 0.0,
        bbox: { length: 2.2, width: 0.8, height: 1.4 },
        age: 30,
        hits: 30,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 1.1,
      });

      const distToBike = Math.hypot(bikeX - this.egoX, bikeY - this.egoY);
      if (distToBike < 6.5 && t > 1.5) {
        cbfActive = true;
        safeMargin = 1.2;
        accel = -2.6;
        steering = 0.05;
        this.egoSpeed = Math.max(3.5, this.egoSpeed - 0.15);
        this.cbfInterventions += 1;
        narrative = `⚠️ CBF INTERVENTION: High-order safety barrier active! Proximity to weaving bike (${distToBike.toFixed(1)}m) breaches safe envelope.`;
      } else {
        narrative = `Dense market: Tracking ${tracks.length} dynamic actors. GNN attention focused on weaving motorcycle.`;
      }

    } else if (scenarioId === "village") {
      // Group of pedestrians in road corridor
      const pedX = this.egoX + 22.0;
      const pedY = 0.4;
      tracks.push({
        track_id: "trk_village_ped_01",
        actor_type: "PEDESTRIAN" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [pedX, pedY, 0.8, 0],
        covariance_matrix: [[0.15, 0], [0, 0.15]],
        position: { x: pedX, y: pedY },
        velocity: { x: 0.8, y: 0 },
        speed: 0.8,
        heading: 0.0,
        yaw_rate: 0.0,
        bbox: { length: 0.6, width: 0.6, height: 1.7 },
        age: 25,
        hits: 25,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 0.8,
      });

      // Oncoming tractor / truck
      const tractorX = this.egoX + Math.max(8.0, 50.0 - t * 4.0);
      const tractorY = 1.8;
      tracks.push({
        track_id: "trk_oncoming_tractor",
        actor_type: "TRUCK" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [tractorX, tractorY, -5.0, 0],
        covariance_matrix: [[0.3, 0], [0, 0.3]],
        position: { x: tractorX, y: tractorY },
        velocity: { x: -5.0, y: 0 },
        speed: 5.0,
        heading: Math.PI,
        yaw_rate: 0.0,
        bbox: { length: 5.2, width: 2.4, height: 2.8 },
        age: 35,
        hits: 35,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 1.4,
      });

      steering = -0.06;
      narrative = "Village corridor: Kinodynamic Hybrid A* nudging around pedestrians with safe lateral boundary buffer.";

    } else if (scenarioId === "highway") {
      // High-speed merging sedan
      const carX = this.egoX + Math.max(6.0, 24.0 - t * 1.5);
      const carY = t < 1.0 ? 3.8 : Math.max(0.2, 3.8 - (t - 1.0) * 1.8);
      tracks.push({
        track_id: "trk_hwy_merger",
        actor_type: "CAR" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [carX, carY, 14.0, 0],
        covariance_matrix: [[0.2, 0], [0, 0.2]],
        position: { x: carX, y: carY },
        velocity: { x: 14.0, y: -0.8 },
        speed: 14.0,
        heading: -0.15,
        yaw_rate: 0.0,
        bbox: { length: 4.6, width: 2.0, height: 1.5 },
        age: 40,
        hits: 40,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 1.0,
      });

      narrative = "Arterial Highway: Monitoring high-speed merge trajectory. FRC top prediction indicates 88% lane merge probability.";

    } else if (scenarioId === "junction") {
      // Auto-rickshaw passenger drop stop
      const rickX = this.egoX + Math.max(5.0, 20.0 - t * 2.5);
      const rickY = 0.3;
      tracks.push({
        track_id: "trk_junc_rickshaw",
        actor_type: "AUTORICKSHAW" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [rickX, rickY, Math.max(0.0, 7.0 - t * 2.0), 0],
        covariance_matrix: [[0.15, 0], [0, 0.15]],
        position: { x: rickX, y: rickY },
        velocity: { x: Math.max(0.0, 7.0 - t * 2.0), y: 0 },
        speed: Math.max(0.0, 7.0 - t * 2.0),
        heading: 0.0,
        yaw_rate: 0.0,
        bbox: { length: 2.8, width: 1.4, height: 1.8 },
        age: 30,
        hits: 30,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 1.1,
      });

      const dist = rickX - this.egoX;
      if (dist < 8.0) {
        cbfActive = true;
        safeMargin = 1.4;
        accel = -3.2;
        narrative = `⚠️ JUNCTION CONFLICT: Auto-rickshaw stopped abruptly ahead (${dist.toFixed(1)}m). CBF braking override active.`;
      } else {
        narrative = "Unsignalized 4-Way Junction: Road Intent Graph negotiating priority with crossing traffic.";
      }

    } else if (scenarioId === "rain") {
      // Monsoon Rain with reduced visibility
      const pedX = this.egoX + Math.max(4.0, 16.0 - t * 1.8);
      const pedY = Math.max(-0.2, 2.5 - t * 0.9);
      tracks.push({
        track_id: "trk_rain_ped",
        actor_type: "PEDESTRIAN" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [pedX, pedY, 0, -1.3],
        covariance_matrix: [[0.35, 0], [0, 0.35]],
        position: { x: pedX, y: pedY },
        velocity: { x: 0, y: -1.3 },
        speed: 1.3,
        heading: -Math.PI / 2,
        yaw_rate: 0.0,
        bbox: { length: 0.6, width: 0.6, height: 1.7 },
        age: 15,
        hits: 15,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 1.5,
      });

      narrative = "Monsoon Rain: Friction coefficient mu=0.45. UKF uncertainty covariance expanded for spray occlusion compensation.";

    } else if (scenarioId === "cattle" || scenarioId === "cow_blockage_lateral_nudge") {
      // Stationary cow in ego lane
      const cowX = this.egoX + Math.max(6.0, 28.0 - t * 1.2);
      const cowY = -0.4;
      tracks.push({
        track_id: "trk_cow_01",
        actor_type: "CATTLE" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [cowX, cowY, 0, 0],
        covariance_matrix: [[0.1, 0], [0, 0.1]],
        position: { x: cowX, y: cowY },
        velocity: { x: 0, y: 0 },
        speed: 0.0,
        heading: 0.2,
        yaw_rate: 0.0,
        bbox: { length: 2.4, width: 1.1, height: 1.5 },
        age: 50,
        hits: 50,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 0.6,
      });

      // Oncoming bus in adjacent lane
      const busX = this.egoX + Math.max(12.0, 60.0 - t * 6.0);
      const busY = 2.0;
      tracks.push({
        track_id: "trk_oncoming_bus",
        actor_type: "BUS" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [busX, busY, -6.5, 0],
        covariance_matrix: [[0.25, 0], [0, 0.25]],
        position: { x: busX, y: busY },
        velocity: { x: -6.5, y: 0 },
        speed: 6.5,
        heading: Math.PI,
        yaw_rate: 0.0,
        bbox: { length: 9.0, width: 2.8, height: 3.2 },
        age: 40,
        hits: 40,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 1.2,
      });

      steering = 0.08;
      narrative = "Cattle Blockage: Kinodynamic Hybrid A* generating lateral spline nudge around stationary cow.";

    } else if (scenarioId === "wrong_way") {
      // Head-on wrong-way bike in ego lane
      const wrongBikeX = this.egoX + Math.max(3.0, 32.0 - t * 9.0);
      const wrongBikeY = 0.1;
      tracks.push({
        track_id: "trk_wrong_way_bike",
        actor_type: "TWO_WHEELER" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [wrongBikeX, wrongBikeY, -8.0, 0],
        covariance_matrix: [[0.2, 0], [0, 0.2]],
        position: { x: wrongBikeX, y: wrongBikeY },
        velocity: { x: -8.0, y: 0 },
        speed: 8.0,
        heading: Math.PI,
        yaw_rate: 0.0,
        bbox: { length: 2.0, width: 0.8, height: 1.4 },
        age: 30,
        hits: 30,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 1.3,
      });

      const dist = wrongBikeX - this.egoX;
      if (dist < 16.0) {
        cbfActive = true;
        safeMargin = 0.8;
        accel = -4.5;
        steering = -0.15;
        this.egoSpeed = Math.max(1.0, this.egoSpeed - 0.3);
        this.cbfInterventions += 1;
        narrative = `🚨 CRITICAL SAFETY OVERRIDE: Wrong-way vehicle oncoming in ego lane (Dist: ${dist.toFixed(1)}m)! Emergency CBF braking and evasive lateral swerve active!`;
      } else {
        narrative = "Wrong-Way Vehicle Detected: Road Intent Graph flagged CONFLICT edge. Priming emergency deceleration envelope.";
      }

    } else if (scenarioId === "pothole") {
      // Pothole cluster
      const potX = this.egoX + 22.0;
      const potY = -0.3;
      tracks.push({
        track_id: "trk_pothole_01",
        actor_type: "POTHOLE" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [potX, potY, 0, 0],
        covariance_matrix: [[0.1, 0], [0, 0.1]],
        position: { x: potX, y: potY },
        velocity: { x: 0, y: 0 },
        speed: 0.0,
        heading: 0.0,
        yaw_rate: 0.0,
        bbox: { length: 1.2, width: 1.2, height: 0.2 },
        age: 30,
        hits: 30,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 0.5,
      });

      steering = 0.06;
      narrative = "Degraded Road: Road surface anomaly mapped. Quintic spline optimizer executing comfort-bounded lateral swerve.";

    } else {
      // Default / autorickshaw_cutin_blindspot
      const rickshawX = this.egoX + Math.max(3.0, 15.0 - t * 1.8);
      const rickshawY = t < 1.5 ? 3.2 : Math.max(0.2, 3.2 - (t - 1.5) * 1.2);
      tracks.push({
        track_id: "trk_rickshaw_01",
        actor_type: "AUTORICKSHAW" as ActorType,
        status: "CONFIRMED" as TrackStatus,
        state_vector: [rickshawX, rickshawY, 7.0, 0],
        covariance_matrix: [[0.15, 0], [0, 0.15]],
        position: { x: rickshawX, y: rickshawY },
        velocity: { x: 7.0, y: t > 1.5 ? -0.8 : 0 },
        speed: 7.0,
        heading: t > 1.5 ? -0.15 : 0.0,
        yaw_rate: 0.0,
        bbox: { length: 2.8, width: 1.4, height: 1.8 },
        age: 24,
        hits: 24,
        misses: 0,
        time_since_update: 0.0,
        mahalanobis_distance: 1.2,
      });

      const dist = Math.hypot(rickshawX - this.egoX, rickshawY - this.egoY);
      if (dist < 7.0 && t > 2.0) {
        cbfActive = true;
        safeMargin = 1.1;
        accel = -2.8;
        steering = 0.08;
        this.egoSpeed = Math.max(3.0, this.egoSpeed - 0.1);
        this.cbfInterventions += 1;
        narrative = `⚠️ CBF INTERVENTION ACTIVE: Proximity to Auto-Rickshaw (${dist.toFixed(1)}m) violates safe barrier margin.`;
      }
    }

    // Build Graph Nodes & Edges
    tracks.forEach((trk) => {
      nodes[trk.track_id] = {
        node_id: trk.track_id,
        node_type: "DYNAMIC_ACTOR" as IntentNodeType,
        actor_type: trk.actor_type,
        position: trk.position,
        velocity: trk.velocity,
        heading: trk.heading,
        speed: trk.speed,
        priority_score: 0.75,
        uncertainty: 0.12,
        features: [trk.position.x, trk.position.y, trk.velocity.x, trk.velocity.y, trk.speed, trk.heading, 0.75, 0.12],
      };

      const dist = Math.hypot(trk.position.x - this.egoX, trk.position.y - this.egoY);
      const isConflict = dist < 12.0;

      edges.push({
        source_id: "ego",
        target_id: trk.track_id,
        edge_type: isConflict ? ("CONFLICT" as IntentEdgeType) : ("MERGING" as IntentEdgeType),
        weight: isConflict ? 0.88 : 0.45,
        spatial_distance: dist,
        time_to_collision: dist / Math.max(1.0, this.egoSpeed),
        relative_velocity: 1.5,
        attention_weight: isConflict ? 0.88 : 0.45,
      });

      // Generate FRC Predictions
      predictions[trk.track_id] = {
        actor_id: trk.track_id,
        actor_type: trk.actor_type,
        most_likely_hypothesis: "hyp_01",
        epistemic_uncertainty: 0.14,
        hypotheses: [
          {
            hypothesis_id: "hyp_01",
            maneuver_name: isConflict ? "AGGRESSIVE_CUT_IN" : "NOMINAL_LANE_FOLLOW",
            probability: 0.72,
            waypoints: [
              { x: trk.position.x, y: trk.position.y, v: trk.speed, yaw: trk.heading, curvature: 0, acceleration: 0, jerk: 0, time: 0, std_x: 0.1, std_y: 0.1 },
              { x: trk.position.x + trk.speed * 0.5, y: trk.position.y - 0.2, v: trk.speed, yaw: trk.heading, curvature: 0, acceleration: 0, jerk: 0, time: 0.5, std_x: 0.2, std_y: 0.2 },
              { x: trk.position.x + trk.speed * 1.0, y: trk.position.y - 0.5, v: trk.speed, yaw: trk.heading, curvature: 0, acceleration: 0, jerk: 0, time: 1.0, std_x: 0.35, std_y: 0.35 },
              { x: trk.position.x + trk.speed * 1.5, y: trk.position.y - 0.7, v: trk.speed, yaw: trk.heading, curvature: 0, acceleration: 0, jerk: 0, time: 1.5, std_x: 0.5, std_y: 0.5 },
            ],
          },
          {
            hypothesis_id: "hyp_02",
            maneuver_name: "LANE_KEEP",
            probability: 0.28,
            waypoints: [
              { x: trk.position.x, y: trk.position.y, v: trk.speed, yaw: trk.heading, curvature: 0, acceleration: 0, jerk: 0, time: 0, std_x: 0.1, std_y: 0.1 },
              { x: trk.position.x + trk.speed * 0.5, y: trk.position.y, v: trk.speed, yaw: trk.heading, curvature: 0, acceleration: 0, jerk: 0, time: 0.5, std_x: 0.2, std_y: 0.2 },
              { x: trk.position.x + trk.speed * 1.0, y: trk.position.y, v: trk.speed, yaw: trk.heading, curvature: 0, acceleration: 0, jerk: 0, time: 1.0, std_x: 0.35, std_y: 0.35 },
            ],
          },
        ],
      };
    });

    // Generate Planned Trajectory Waypoints
    const plannedWaypoints = [];
    for (let i = 0; i <= 20; i++) {
      const s = i * 2.5;
      const wpX = this.egoX + s;
      const wpY = this.egoY + (steering !== 0 ? Math.sin(s * 0.08) * steering * 4.0 : 0.0);
      plannedWaypoints.push({
        x: wpX,
        y: wpY,
        v: this.egoSpeed,
        yaw: 0.0,
        curvature: 0.01,
        acceleration: accel,
        jerk: 0.0,
        time: s / Math.max(1.0, this.egoSpeed),
        std_x: 0.15,
        std_y: 0.15,
      });
    }

    // Generate Risk Map Grid
    const riskGridSize = 25;
    const riskData: number[][] = [];
    for (let r = 0; r < riskGridSize; r++) {
      const row: number[] = [];
      for (let c = 0; c < riskGridSize; c++) {
        let maxR = 0.05;
        const cellX = this.egoX - 10 + c * 1.5;
        const cellY = this.egoY - 15 + r * 1.5;
        tracks.forEach((trk) => {
          const d = Math.hypot(cellX - trk.position.x, cellY - trk.position.y);
          if (d < 5.0) {
            maxR = Math.max(maxR, Math.exp(-d * 0.6));
          }
        });
        row.push(maxR);
      }
      riskData.push(row);
    }

    return {
      frame_id: this.frameId,
      timestamp: this.simTime,
      ego_state: {
        actor_id: "ego",
        actor_type: "EGO" as ActorType,
        position: { x: this.egoX, y: this.egoY },
        heading: 0.0,
        velocity: { x: this.egoSpeed, y: 0.0 },
        speed: this.egoSpeed,
        yaw_rate: steering * 0.5,
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
        conflict_hotspots: [],
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
        resolution: 1.5,
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
        path_length: 50.0,
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
