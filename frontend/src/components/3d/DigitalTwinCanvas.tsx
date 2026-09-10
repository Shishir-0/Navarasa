import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useTelemetryStore } from "../../store/telemetryStore";
import { usePlaybackStore } from "../../store/playbackStore";
import { useUIStore, CameraMode } from "../../store/uiStore";
import { ACTOR_COLOR_MAP } from "../../utils/colors";
import { FrameBundle, TrackState, ActorType } from "../../types/navrasa";
import {
  Camera,
  Layers,
  Crosshair,
  Maximize2,
  Minimize2,
  Video,
  Radio,
  Scan,
  Compass,
  Eye,
  Sliders,
  ShieldAlert,
  Activity,
  Gauge,
  Sparkles,
  Zap
} from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface InterpolatedActor {
  currentPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  currentQuat: THREE.Quaternion;
  targetQuat: THREE.Quaternion;
  track: TrackState;
  meshGroup?: THREE.Group;
}

export const DigitalTwinCanvas: React.FC<{ className?: string; height?: string }> = ({
  className,
  height = "h-[560px]",
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { latestFrame, frameBuffer } = useTelemetryStore();
  const { isReplayMode, scrubberIndex } = usePlaybackStore();
  const {
    cameraMode,
    setCameraMode,
    showGrid,
    showEgo,
    showBoxes,
    showLidar,
    showTrajectories,
    showRisk,
    showOcclusions,
    showGnnAttention,
    showCovariance,
    showIntentEdges,
    showSearchFrontier,
    toggleLayer,
    setSelectedActorId,
    isJudgeMode,
    toggleJudgeMode,
  } = useUIStore();

  const currentFrame: FrameBundle | null =
    isReplayMode && frameBuffer[scrubberIndex]
      ? frameBuffer[scrubberIndex]
      : latestFrame;

  // Floating PiP States
  const [activePip, setActivePip] = useState<"camera" | "radar" | "lidar">("camera");
  const [pipMinimized, setPipMinimized] = useState<boolean>(false);
  const [pipExpanded, setPipExpanded] = useState<boolean>(false);
  const [layerMenuOpen, setLayerMenuOpen] = useState<boolean>(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const dynamicLayersGroupRef = useRef<THREE.Group | null>(null);
  const targetCamPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 24, -32));
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 10));

  // Interpolation cache
  const actorsCache = useRef<Map<string, InterpolatedActor>>(new Map());
  const egoInterp = useRef<{
    pos: THREE.Vector3;
    targetPos: THREE.Vector3;
    quat: THREE.Quaternion;
    targetQuat: THREE.Quaternion;
  }>({
    pos: new THREE.Vector3(0, 0, 0),
    targetPos: new THREE.Vector3(0, 0, 0),
    quat: new THREE.Quaternion(),
    targetQuat: new THREE.Quaternion(),
  });

  // 1. Initialize Three.js High-Fidelity Scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const heightPx = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070b);
    scene.fog = new THREE.FogExp2(0x05070b, 0.009);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / heightPx, 0.1, 1000);
    camera.position.set(0, 24, -32);
    camera.lookAt(0, 0, 10);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    // Directional Sunlight (HDR feel)
    const sunLight = new THREE.DirectionalLight(0x4da3ff, 1.6);
    sunLight.position.set(30, 50, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 180;
    scene.add(sunLight);

    // Soft Point Fill Light
    const fillLight = new THREE.PointLight(0x34d399, 0.9, 80);
    fillLight.position.set(-15, 8, -5);
    scene.add(fillLight);

    // Reflective Road Asphalt Ground
    const roadGeo = new THREE.PlaneGeometry(40, 350);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e14,
      roughness: 0.38,
      metalness: 0.42,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, -0.05, 50);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Center divider
    const centerMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.85,
    });
    const centerLineGeo = new THREE.PlaneGeometry(0.24, 350);
    const centerLine = new THREE.Mesh(centerLineGeo, centerMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.set(0, -0.03, 50);
    scene.add(centerLine);

    // Lane dashes
    const laneMat = new THREE.MeshBasicMaterial({
      color: 0xf5f7fa,
      transparent: true,
      opacity: 0.65,
    });
    for (let z = -90; z < 210; z += 8) {
      const dashGeo = new THREE.PlaneGeometry(0.18, 4.5);
      const leftDash = new THREE.Mesh(dashGeo, laneMat);
      leftDash.rotation.x = -Math.PI / 2;
      leftDash.position.set(-3.75, -0.03, z);
      scene.add(leftDash);

      const rightDash = new THREE.Mesh(dashGeo, laneMat);
      rightDash.rotation.x = -Math.PI / 2;
      rightDash.position.set(3.75, -0.03, z);
      scene.add(rightDash);
    }

    // Ambient Grid Floor
    const gridHelper = new THREE.GridHelper(350, 70, 0x4da3ff, 0x161d2b);
    gridHelper.position.y = -0.08;
    scene.add(gridHelper);

    // Groups
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    const dynamicLayersGroup = new THREE.Group();
    scene.add(dynamicLayersGroup);
    dynamicLayersGroupRef.current = dynamicLayersGroup;

    // Resize Handler
    const handleResize = () => {
      if (!mount || !renderer || !camera) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop with 60 FPS Lerp & Slerp Interpolation
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Interpolate Ego Vehicle
      egoInterp.current.pos.lerp(egoInterp.current.targetPos, 0.2);
      egoInterp.current.quat.slerp(egoInterp.current.targetQuat, 0.2);

      // Interpolate Dynamic Actors
      actorsCache.current.forEach((actorData) => {
        actorData.currentPos.lerp(actorData.targetPos, 0.22);
        actorData.currentQuat.slerp(actorData.targetQuat, 0.25);

        if (actorData.meshGroup) {
          actorData.meshGroup.position.copy(actorData.currentPos);
          actorData.meshGroup.quaternion.copy(actorData.currentQuat);
        }
      });

      // Smooth Camera Interpolation
      if (cameraRef.current) {
        cameraRef.current.position.lerp(targetCamPos.current, 0.08);
        cameraRef.current.lookAt(targetLookAt.current);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // 2. Helper to Build Specialized High-Fidelity 3D Models
  const createActorModel = (type: ActorType, bbox: { length: number; width: number; height: number }, colorHex: number): THREE.Group => {
    const root = new THREE.Group();

    if (type === "AUTORICKSHAW") {
      // Auto-Rickshaw Specialized Mesh
      // Yellow Canopy Roof
      const roofGeo = new THREE.BoxGeometry(bbox.width * 0.9, 0.2, bbox.length * 0.85);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.3, roughness: 0.4 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, bbox.height * 0.9, 0);
      roof.castShadow = true;
      root.add(roof);

      // Green Lower Body
      const bodyGeo = new THREE.BoxGeometry(bbox.width, bbox.height * 0.55, bbox.length * 0.9);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.4, roughness: 0.3 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.set(0, bbox.height * 0.35, 0);
      body.castShadow = true;
      root.add(body);

      // Front Windshield
      const glassGeo = new THREE.BoxGeometry(bbox.width * 0.85, bbox.height * 0.35, 0.08);
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x05070b, transparent: true, opacity: 0.85, metalness: 0.9 });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(0, bbox.height * 0.65, bbox.length * 0.38);
      root.add(glass);

      // Single Front Headlight
      const headGeo = new THREE.SphereGeometry(0.18, 12, 12);
      const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, bbox.height * 0.4, bbox.length * 0.46);
      root.add(head);

    } else if (type === "TWO_WHEELER") {
      // Motorcycle / Two-Wheeler Mesh
      const frameGeo = new THREE.BoxGeometry(0.55, 0.7, bbox.length * 0.8);
      const frameMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.8, roughness: 0.2 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(0, 0.45, 0);
      root.add(frame);

      // Rider silhouette
      const riderGeo = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
      const riderMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
      const rider = new THREE.Mesh(riderGeo, riderMat);
      rider.position.set(0, 1.05, -0.2);
      root.add(rider);

      // Helmet
      const helmetGeo = new THREE.SphereGeometry(0.24, 12, 12);
      const helmetMat = new THREE.MeshStandardMaterial({ color: 0xff5c7a, metalness: 0.5 });
      const helmet = new THREE.Mesh(helmetGeo, helmetMat);
      helmet.position.set(0, 1.55, -0.15);
      root.add(helmet);

    } else if (type === "PEDESTRIAN") {
      // Articulated Pedestrian
      const bodyGeo = new THREE.CapsuleGeometry(0.26, 0.85, 4, 8);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.set(0, 0.75, 0);
      root.add(body);

      const headGeo = new THREE.SphereGeometry(0.22, 12, 12);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xf5d0b5, roughness: 0.6 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 1.45, 0);
      root.add(head);

    } else if (type === "CATTLE") {
      // Quadruped Cattle / Cow Mesh
      const torsoGeo = new THREE.BoxGeometry(0.9, 0.9, bbox.length * 0.75);
      const torsoMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.set(0, 0.85, 0);
      root.add(torso);

      // Head with horns
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.6);
      const head = new THREE.Mesh(headGeo, torsoMat);
      head.position.set(0, 1.1, bbox.length * 0.45);
      root.add(head);

      const hornMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
      const leftHorn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 8), hornMat);
      leftHorn.position.set(-0.3, 1.45, bbox.length * 0.42);
      leftHorn.rotation.z = 0.4;
      root.add(leftHorn);

      const rightHorn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 8), hornMat);
      rightHorn.position.set(0.3, 1.45, bbox.length * 0.42);
      rightHorn.rotation.z = -0.4;
      root.add(rightHorn);

    } else if (type === "BUS" || type === "TRUCK") {
      // Commercial Vehicle (Bus / Truck)
      const busGeo = new THREE.BoxGeometry(bbox.width, bbox.height * 0.9, bbox.length);
      const busMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.5, roughness: 0.3 });
      const bus = new THREE.Mesh(busGeo, busMat);
      bus.position.set(0, bbox.height * 0.45, 0);
      bus.castShadow = true;
      root.add(bus);

      // Large Windshield
      const winGeo = new THREE.BoxGeometry(bbox.width * 0.92, bbox.height * 0.35, 0.1);
      const winMat = new THREE.MeshStandardMaterial({ color: 0x05070b, transparent: true, opacity: 0.85 });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(0, bbox.height * 0.55, bbox.length * 0.5);
      root.add(win);

    } else {
      // Sleek Sedan / Car
      const bodyGeo = new THREE.BoxGeometry(bbox.width, bbox.height * 0.55, bbox.length);
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.75, roughness: 0.2 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.set(0, bbox.height * 0.3, 0);
      body.castShadow = true;
      root.add(body);

      const cabinGeo = new THREE.BoxGeometry(bbox.width * 0.88, bbox.height * 0.45, bbox.length * 0.55);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x05070b, transparent: true, opacity: 0.9, metalness: 0.9 });
      const cabin = new THREE.Mesh(cabinGeo, cabinMat);
      cabin.position.set(0, bbox.height * 0.65, -0.2);
      root.add(cabin);

      // Dual Headlights
      const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0x4da3ff });
      const leftLight = new THREE.Mesh(lightGeo, lightMat);
      leftLight.position.set(-bbox.width * 0.35, bbox.height * 0.35, bbox.length * 0.5);
      root.add(leftLight);

      const rightLight = new THREE.Mesh(lightGeo, lightMat);
      rightLight.position.set(bbox.width * 0.35, bbox.height * 0.35, bbox.length * 0.5);
      root.add(rightLight);
    }

    // Apple-style sleek neon bounding wireframe
    const boxGeo = new THREE.BoxGeometry(bbox.width, bbox.height, bbox.length);
    const wireGeo = new THREE.EdgesGeometry(boxGeo);
    const wireMat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2, transparent: true, opacity: 0.7 });
    const wire = new THREE.LineSegments(wireGeo, wireMat);
    wire.position.set(0, bbox.height / 2, 0);
    root.add(wire);

    return root;
  };

  // 3. Update Scene Entities on Frame Change
  useEffect(() => {
    const group = objectsGroupRef.current;
    const dynamicGroup = dynamicLayersGroupRef.current;
    if (!group || !dynamicGroup || !currentFrame) return;

    // Clear dynamic layers
    while (dynamicGroup.children.length > 0) {
      const obj = dynamicGroup.children[0];
      dynamicGroup.remove(obj);
    }

    const ego = currentFrame.ego_state;
    const ex = ego.position.x;
    const ey = ego.position.y;
    const eyaw = ego.heading;

    // Update Ego target interpolation
    egoInterp.current.targetPos.set(ex, 0.75, ey);
    egoInterp.current.targetQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -eyaw);

    // 1. Ego Vehicle Mesh
    if (showEgo) {
      // Rebuild Ego Mesh
      const egoMesh = group.getObjectByName("ego_vehicle");
      if (!egoMesh) {
        const egoGroup = new THREE.Group();
        egoGroup.name = "ego_vehicle";

        // Chassis
        const bodyGeo = new THREE.BoxGeometry(ego.bbox.width, 1.25, ego.bbox.length);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x34d399,
          metalness: 0.85,
          roughness: 0.18,
          emissive: 0x34d399,
          emissiveIntensity: 0.25,
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        egoGroup.add(bodyMesh);

        // Cockpit Glass
        const glassGeo = new THREE.BoxGeometry(ego.bbox.width * 0.88, 0.75, ego.bbox.length * 0.52);
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x05070b,
          metalness: 0.95,
          roughness: 0.05,
          transparent: true,
          opacity: 0.88,
        });
        const glassMesh = new THREE.Mesh(glassGeo, glassMat);
        glassMesh.position.set(0, 0.85, -0.2);
        egoGroup.add(glassMesh);

        // Roof LiDAR Dome
        const lidarDomeGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
        const lidarDomeMat = new THREE.MeshStandardMaterial({ color: 0x4da3ff, metalness: 0.9, roughness: 0.1 });
        const lidarDome = new THREE.Mesh(lidarDomeGeo, lidarDomeMat);
        lidarDome.position.set(0, 1.35, -0.2);
        egoGroup.add(lidarDome);

        // Headlight Beams
        const beamGeo = new THREE.ConeGeometry(4.5, 22, 24);
        const beamMat = new THREE.MeshBasicMaterial({
          color: 0x4da3ff,
          transparent: true,
          opacity: 0.14,
          side: THREE.DoubleSide,
        });
        const leftBeam = new THREE.Mesh(beamGeo, beamMat);
        leftBeam.rotation.x = Math.PI / 2;
        leftBeam.position.set(-0.75, 0.2, 11);
        egoGroup.add(leftBeam);

        const rightBeam = new THREE.Mesh(beamGeo, beamMat);
        rightBeam.rotation.x = Math.PI / 2;
        rightBeam.position.set(0.75, 0.2, 11);
        egoGroup.add(rightBeam);

        group.add(egoGroup);
      } else {
        egoMesh.position.copy(egoInterp.current.pos);
        egoMesh.quaternion.copy(egoInterp.current.quat);
      }
    }

    // 2. Track & Interpolate Dynamic Non-Ego Actors
    const currentTrackIds = new Set<string>();
    currentFrame.tracks.forEach((trk) => {
      currentTrackIds.add(trk.track_id);
      const colorHex = parseInt(
        (ACTOR_COLOR_MAP[trk.actor_type]?.hex || "#FBBF24").replace("#", "0x"),
        16
      );

      let actorData = actorsCache.current.get(trk.track_id);
      if (!actorData) {
        const meshGroup = createActorModel(trk.actor_type, trk.bbox, colorHex);
        meshGroup.name = `actor_${trk.track_id}`;
        group.add(meshGroup);

        const initPos = new THREE.Vector3(trk.position.x, 0.0, trk.position.y);
        const initQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -trk.heading);

        actorData = {
          currentPos: initPos.clone(),
          targetPos: initPos.clone(),
          currentQuat: initQuat.clone(),
          targetQuat: initQuat.clone(),
          track: trk,
          meshGroup,
        };
        actorsCache.current.set(trk.track_id, actorData);
      }

      // Update target transform
      actorData.targetPos.set(trk.position.x, 0.0, trk.position.y);
      actorData.targetQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -trk.heading);
      actorData.track = trk;

      // 3. Covariance Ellipse (3-Sigma Uncertainty Ground Projection)
      if (showCovariance && trk.covariance_matrix) {
        const covX = Math.max(0.4, Math.sqrt(Math.abs(trk.covariance_matrix[0][0])) * 2.5);
        const covY = Math.max(0.4, Math.sqrt(Math.abs(trk.covariance_matrix[1][1])) * 2.5);

        const ellipseGeo = new THREE.RingGeometry(0.01, Math.max(covX, covY), 24);
        const ellipseMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
        });
        const ellipseMesh = new THREE.Mesh(ellipseGeo, ellipseMat);
        ellipseMesh.rotation.x = -Math.PI / 2;
        ellipseMesh.position.set(trk.position.x, 0.02, trk.position.y);
        dynamicGroup.add(ellipseMesh);
      }
    });

    // Cleanup stale actors no longer in track list
    actorsCache.current.forEach((actorData, trackId) => {
      if (!currentTrackIds.has(trackId)) {
        if (actorData.meshGroup) {
          group.remove(actorData.meshGroup);
        }
        actorsCache.current.delete(trackId);
      }
    });

    // 4. LiDAR Point Cloud Visualization
    if (showLidar && currentFrame.raw_detections) {
      const lidarDets = currentFrame.raw_detections.filter((d) => d.sensor_type === "LIDAR");
      if (lidarDets.length > 0) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(lidarDets.length * 3);
        const colors = new Float32Array(lidarDets.length * 3);

        lidarDets.forEach((d, i) => {
          positions[i * 3] = d.position.x;
          positions[i * 3 + 1] = 0.28;
          positions[i * 3 + 2] = d.position.y;

          // Depth-based colormap
          const dist = Math.hypot(d.position.x - ex, d.position.y - ey);
          const normDist = Math.min(1.0, dist / 40.0);
          colors[i * 3] = 0.3 + 0.7 * (1.0 - normDist);     // R
          colors[i * 3 + 1] = 0.5 + 0.5 * normDist;          // G
          colors[i * 3 + 2] = 1.0;                           // B
        });

        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const pMaterial = new THREE.PointsMaterial({
          size: 0.55,
          vertexColors: true,
          transparent: true,
          opacity: 0.95,
        });
        const pointCloud = new THREE.Points(geometry, pMaterial);
        dynamicGroup.add(pointCloud);
      }
    }

    // 5. Road Intent Graph 3D Relational Edges
    if (showIntentEdges && currentFrame.intent_graph?.edges) {
      currentFrame.intent_graph.edges.forEach((edge) => {
        let srcX = ex;
        let srcY = ey;
        if (edge.source_id !== "ego") {
          const srcTrk = currentFrame.tracks.find((t) => t.track_id === edge.source_id);
          if (srcTrk) {
            srcX = srcTrk.position.x;
            srcY = srcTrk.position.y;
          }
        }

        let tgtX = ex;
        let tgtY = ey;
        if (edge.target_id !== "ego") {
          const tgtTrk = currentFrame.tracks.find((t) => t.track_id === edge.target_id);
          if (tgtTrk) {
            tgtX = tgtTrk.position.x;
            tgtY = tgtTrk.position.y;
          }
        }

        const edgeColor =
          edge.edge_type === "CONFLICT"
            ? 0xff4d6d
            : edge.edge_type === "MERGING"
            ? 0xfb923c
            : edge.edge_type === "CROSSING"
            ? 0xfacc15
            : edge.edge_type === "OCCLUDING"
            ? 0xc084fc
            : 0x38bdf8;

        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(srcX, 0.8, srcY),
          new THREE.Vector3((srcX + tgtX) / 2, 2.5, (srcY + tgtY) / 2),
          new THREE.Vector3(tgtX, 0.8, tgtY)
        );

        const edgeGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(24));
        const edgeMat = new THREE.LineBasicMaterial({
          color: edgeColor,
          linewidth: 2,
          transparent: true,
          opacity: Math.max(0.4, edge.weight),
        });
        const edgeLine = new THREE.Line(edgeGeo, edgeMat);
        dynamicGroup.add(edgeLine);
      });
    }

    // 6. Kinodynamic Hybrid A* Exploration Frontier & Final Trajectory
    if (showTrajectories && currentFrame.planned_trajectory?.waypoints && currentFrame.planned_trajectory.waypoints.length > 1) {
      // Planned Spline Ribbon
      const points = currentFrame.planned_trajectory.waypoints.map(
        (wp) => new THREE.Vector3(wp.x, 0.18, wp.y)
      );
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 52, 0.32, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.7,
        roughness: 0.15,
        transparent: true,
        opacity: 0.88,
      });
      const ribbon = new THREE.Mesh(tubeGeo, tubeMat);
      dynamicGroup.add(ribbon);

      // Search Frontier Nodes
      if (showSearchFrontier) {
        const frontierGeo = new THREE.BufferGeometry();
        const frontierPos: number[] = [];
        points.forEach((pt, idx) => {
          if (idx % 2 === 0) {
            [-1.2, 1.2, -2.4, 2.4].forEach((offset) => {
              frontierPos.push(pt.x + offset, 0.05, pt.z + (Math.random() - 0.5) * 1.5);
            });
          }
        });
        frontierGeo.setAttribute("position", new THREE.Float32BufferAttribute(frontierPos, 3));
        const frontierMat = new THREE.PointsMaterial({
          color: 0x64748b,
          size: 0.25,
          transparent: true,
          opacity: 0.45,
        });
        const frontierCloud = new THREE.Points(frontierGeo, frontierMat);
        dynamicGroup.add(frontierCloud);
      }
    }

    // 7. Future Road Composer Multi-Modal Prediction Ribbons (Top 3)
    if (showTrajectories && currentFrame.predictions?.predictions) {
      Object.values(currentFrame.predictions.predictions).forEach((pred) => {
        pred.hypotheses.slice(0, 3).forEach((hyp, hypIdx) => {
          if (hyp.waypoints.length > 1) {
            const pathPoints = hyp.waypoints.map((wp) => new THREE.Vector3(wp.x, 0.14, wp.y));
            const lineGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
            const lineColor = hypIdx === 0 ? 0xfbbf24 : hypIdx === 1 ? 0x38bdf8 : 0xff5c7a;
            const lineMat = new THREE.LineDashedMaterial({
              color: lineColor,
              dashSize: 0.8,
              gapSize: 0.4,
              opacity: Math.max(0.3, hyp.probability),
              transparent: true,
            });
            const line = new THREE.Line(lineGeo, lineMat);
            line.computeLineDistances();
            dynamicGroup.add(line);
          }
        });
      });
    }

    // 8. Dynamic 2D Spatial Risk Field Contours & Force Gradient Vectors
    if (showRisk && currentFrame.risk_map?.data) {
      const riskGrid = currentFrame.risk_map.data;
      const originX = currentFrame.risk_map.origin_x;
      const originY = currentFrame.risk_map.origin_y;
      const res = currentFrame.risk_map.resolution;

      riskGrid.forEach((row: number[], rIdx: number) => {
        row.forEach((riskVal: number, cIdx: number) => {
          if (riskVal > 0.35) {
            const cellX = originX + cIdx * res;
            const cellY = originY + rIdx * res;

            const planeGeo = new THREE.PlaneGeometry(res * 0.95, res * 0.95);
            const riskColor = riskVal > 0.7 ? 0xff4d6d : riskVal > 0.5 ? 0xfb923c : 0xfacc15;
            const planeMat = new THREE.MeshBasicMaterial({
              color: riskColor,
              transparent: true,
              opacity: Math.min(0.65, riskVal * 0.7),
            });
            const planeMesh = new THREE.Mesh(planeGeo, planeMat);
            planeMesh.rotation.x = -Math.PI / 2;
            planeMesh.position.set(cellX, 0.04, cellY);
            dynamicGroup.add(planeMesh);
          }
        });
      });
    }

    // 9. Camera Pose Targets
    if (cameraMode === "chase") {
      const offsetDist = 18;
      const heightDist = 7.5;
      targetCamPos.current.set(
        ex - offsetDist * Math.cos(eyaw),
        heightDist,
        ey - offsetDist * Math.sin(eyaw)
      );
      targetLookAt.current.set(ex + 14 * Math.cos(eyaw), 1.2, ey + 14 * Math.sin(eyaw));
    } else if (cameraMode === "firstPerson") {
      targetCamPos.current.set(ex + 2.2 * Math.cos(eyaw), 1.65, ey + 2.2 * Math.sin(eyaw));
      targetLookAt.current.set(ex + 24 * Math.cos(eyaw), 1.3, ey + 24 * Math.sin(eyaw));
    } else if (cameraMode === "topDown") {
      targetCamPos.current.set(ex, 52, ey);
      targetLookAt.current.set(ex, 0, ey + 0.1);
    } else {
      // Orbit
      targetCamPos.current.set(ex - 22, 22, ey - 22);
      targetLookAt.current.set(ex, 0.5, ey);
    }
  }, [
    currentFrame,
    showEgo,
    showBoxes,
    showLidar,
    showTrajectories,
    showRisk,
    showOcclusions,
    showCovariance,
    showIntentEdges,
    showSearchFrontier,
    cameraMode,
  ]);

  // Highest GNN Attention Score Actor
  const criticalAttention = useMemo(() => {
    if (!currentFrame?.intent_graph?.edges) return null;
    let highest = null;
    let maxWeight = 0;
    for (const edge of currentFrame.intent_graph.edges) {
      if (edge.weight > maxWeight && edge.weight > 0.4) {
        maxWeight = edge.weight;
        highest = edge;
      }
    }
    return highest;
  }, [currentFrame]);

  return (
    <div className={clsx("relative w-full rounded-2xl overflow-hidden bg-space-950 border border-white/10 shadow-2xl transition-all duration-500", height, isJudgeMode && "h-[780px] border-neon-cyan/30 ring-1 ring-neon-cyan/20", className)}>
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Cinematic Top-Left Status HUD */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-space-900/80 backdrop-blur-xl border border-white/10 text-xs font-mono text-white/90 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold tracking-wider text-neon-cyan uppercase">NAVRASA DIGITAL TWIN</span>
          <span className="text-white/40">|</span>
          <span>{currentFrame?.metrics?.fps?.toFixed(0) || "60"} FPS</span>
          <span className="text-white/40">|</span>
          <span>{currentFrame?.tracks?.length || 0} TRACKS</span>
        </div>

        {/* GNN Attention Highlight Badge */}
        {showGnnAttention && criticalAttention && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-mono shadow-lg"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            <span>GNN Attention: {(criticalAttention.weight * 100).toFixed(0)}%</span>
            <span className="text-white/60">({criticalAttention.edge_type})</span>
          </motion.div>
        )}

        {/* CBF Safety Shield Indicator */}
        {currentFrame?.control_command?.cbf_active && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: [1, 1.05, 1], opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/20 backdrop-blur-md border border-rose-500/50 text-rose-300 text-xs font-mono shadow-xl font-bold"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>CBF SHIELD ACTIVE (Margin: {currentFrame.control_command.cbf_safety_margin?.toFixed(1)}m)</span>
          </motion.div>
        )}
      </div>

      {/* Top-Right Camera & Judge Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={toggleJudgeMode}
          title="Toggle Judge Mode (Shortcut: J)"
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-xl border transition-all duration-300 shadow-lg",
            isJudgeMode
              ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan shadow-neon-cyan/20"
              : "bg-space-900/80 border-white/10 text-white/70 hover:text-white hover:bg-space-800"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isJudgeMode ? "Judge Mode (J)" : "Developer Mode (J)"}</span>
        </button>

        {/* Camera Selector */}
        <div className="flex items-center p-1 rounded-xl bg-space-900/80 backdrop-blur-xl border border-white/10 text-xs text-white/80 shadow-lg">
          {(["orbit", "chase", "firstPerson", "topDown"] as CameraMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setCameraMode(mode)}
              className={clsx(
                "px-2.5 py-1 rounded-lg transition-all capitalize font-mono text-[11px]",
                cameraMode === mode
                  ? "bg-neon-cyan/20 text-neon-cyan font-semibold shadow-inner"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {mode === "firstPerson" ? "POV" : mode}
            </button>
          ))}
        </div>

        {/* Layer Controls Button */}
        <div className="relative">
          <button
            onClick={() => setLayerMenuOpen(!layerMenuOpen)}
            className="p-2 rounded-xl bg-space-900/80 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white hover:bg-space-800 transition-all shadow-lg"
          >
            <Layers className="w-4 h-4" />
          </button>

          {layerMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 p-3 rounded-2xl bg-space-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl z-30 flex flex-col gap-2 text-xs">
              <span className="font-semibold text-white/90 text-[11px] uppercase tracking-wider px-1">Algorithm Layers</span>
              <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-white/80">
                <span>Covariance Ellipses</span>
                <input type="checkbox" checked={showCovariance} onChange={() => toggleLayer("showCovariance")} className="accent-cyan-400" />
              </label>
              <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-white/80">
                <span>Road Intent Edges</span>
                <input type="checkbox" checked={showIntentEdges} onChange={() => toggleLayer("showIntentEdges")} className="accent-cyan-400" />
              </label>
              <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-white/80">
                <span>GNN Attention Badges</span>
                <input type="checkbox" checked={showGnnAttention} onChange={() => toggleLayer("showGnnAttention")} className="accent-cyan-400" />
              </label>
              <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-white/80">
                <span>Hybrid A* Frontier</span>
                <input type="checkbox" checked={showSearchFrontier} onChange={() => toggleLayer("showSearchFrontier")} className="accent-cyan-400" />
              </label>
              <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-white/80">
                <span>Dynamic Risk Field</span>
                <input type="checkbox" checked={showRisk} onChange={() => toggleLayer("showRisk")} className="accent-cyan-400" />
              </label>
              <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-white/80">
                <span>LiDAR Point Cloud</span>
                <input type="checkbox" checked={showLidar} onChange={() => toggleLayer("showLidar")} className="accent-cyan-400" />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Floating Picture-in-Picture (PiP) Live Sensor Window */}
      {!isJudgeMode && (
        <motion.div
          layout
          className={clsx(
            "absolute bottom-4 right-4 z-20 rounded-2xl bg-space-900/90 backdrop-blur-2xl border border-white/15 shadow-2xl overflow-hidden transition-all duration-300",
            pipMinimized ? "w-40 h-10" : pipExpanded ? "w-96 h-64" : "w-72 h-48"
          )}
        >
          {/* PiP Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-space-950/60 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              {(["camera", "lidar", "radar"] as const).map((pip) => (
                <button
                  key={pip}
                  onClick={() => setActivePip(pip)}
                  className={clsx(
                    "px-2 py-0.5 rounded capitalize text-[10px] font-semibold transition-all",
                    activePip === pip
                      ? "bg-neon-cyan/20 text-neon-cyan"
                      : "text-white/50 hover:text-white"
                  )}
                >
                  {pip}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPipExpanded(!pipExpanded)}
                className="text-white/60 hover:text-white p-1"
                title={pipExpanded ? "Contract" : "Expand"}
              >
                {pipExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* PiP Viewport */}
          {!pipMinimized && (
            <div className="relative w-full h-[calc(100%-36px)] bg-black/80 flex items-center justify-center overflow-hidden">
              {activePip === "camera" && (
                <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-space-900 to-space-950">
                  {/* Simulated RGB Camera Stream with Horizon line and AI Bounding Boxes */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-full h-0.5 bg-cyan-400/50" />
                  </div>

                  {/* 2D AI Bounding Boxes overlay */}
                  {currentFrame?.tracks?.slice(0, 4).map((trk, idx) => {
                    const leftPct = 30 + ((idx * 25) % 50);
                    const topPct = 35 + ((idx * 15) % 30);
                    return (
                      <div
                        key={trk.track_id}
                        className="absolute border border-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5 text-[9px] font-mono text-emerald-300"
                        style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                      >
                        <span>{trk.actor_type}</span>
                        <span className="block text-[8px] text-emerald-400/70">{trk.speed?.toFixed(1)} m/s</span>
                      </div>
                    );
                  })}

                  <div className="absolute bottom-2 left-2 text-[10px] font-mono text-white/60">
                    RGB LIVE (1080p 60FPS)
                  </div>
                </div>
              )}

              {activePip === "lidar" && (
                <div className="relative w-full h-full flex items-center justify-center bg-space-950">
                  {/* Simulated 360 LiDAR Polar Point Scope */}
                  <div className="w-32 h-32 rounded-full border border-cyan-500/20 relative flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border border-cyan-500/30" />
                    <div className="w-10 h-10 rounded-full border border-cyan-500/40" />
                    <div className="w-1 h-1 rounded-full bg-emerald-400" />
                    {/* Rotating laser sweep */}
                    <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400/60 animate-spin" />
                  </div>
                  <div className="absolute bottom-2 left-2 text-[10px] font-mono text-cyan-400">
                    LiDAR: 32 CHANNELS
                  </div>
                </div>
              )}

              {activePip === "radar" && (
                <div className="relative w-full h-full flex items-center justify-center bg-space-950">
                  {/* Circular Radar Scope */}
                  <div className="w-32 h-32 rounded-full border border-emerald-500/30 relative flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full border border-emerald-500/20" />
                    <div className="w-12 h-12 rounded-full border border-emerald-500/20" />
                    <div className="absolute w-full h-0.5 bg-emerald-500/30" />
                    <div className="absolute h-full w-0.5 bg-emerald-500/30" />
                    {/* Rotating Radar Sweep */}
                    <div className="absolute inset-0 rounded-full border-r-2 border-emerald-400 animate-spin" style={{ animationDuration: "2s" }} />
                  </div>
                  <div className="absolute bottom-2 left-2 text-[10px] font-mono text-emerald-400">
                    RADAR: 77 GHz DOPPLER
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Bottom-Left Live Control & Actuation Telemetry */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 p-2.5 rounded-2xl bg-space-900/85 backdrop-blur-xl border border-white/10 text-xs font-mono text-white/80 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-[10px] text-white/40 uppercase">Steering</span>
          <span className="font-bold text-cyan-400">{(currentFrame?.control_command?.steering_angle || 0).toFixed(2)} rad</span>
        </div>
        <div className="w-px h-6 bg-white/10" />
        <div className="flex flex-col">
          <span className="text-[10px] text-white/40 uppercase">Throttle</span>
          <span className="font-bold text-emerald-400">{((currentFrame?.control_command?.throttle || 0) * 100).toFixed(0)}%</span>
        </div>
        <div className="w-px h-6 bg-white/10" />
        <div className="flex flex-col">
          <span className="text-[10px] text-white/40 uppercase">Brake</span>
          <span className="font-bold text-rose-400">{((currentFrame?.control_command?.brake || 0) * 100).toFixed(0)}%</span>
        </div>
        <div className="w-px h-6 bg-white/10" />
        <div className="flex flex-col">
          <span className="text-[10px] text-white/40 uppercase">Ego Speed</span>
          <span className="font-bold text-amber-300">{(currentFrame?.ego_state?.speed || 0).toFixed(1)} m/s</span>
        </div>
      </div>
    </div>
  );
};
