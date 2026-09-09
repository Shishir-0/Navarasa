import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useTelemetryStore } from "../../store/telemetryStore";
import { usePlaybackStore } from "../../store/playbackStore";
import { useUIStore, CameraMode } from "../../store/uiStore";
import { ACTOR_COLOR_MAP, VISION_TOKENS } from "../../utils/colors";
import { FrameBundle } from "../../types/navrasa";
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
  Sliders
} from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

export const DigitalTwinCanvas: React.FC<{ className?: string; height?: string }> = ({
  className,
  height = "h-[520px]",
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
    toggleLayer,
    setSelectedActorId,
  } = useUIStore();

  const currentFrame: FrameBundle | null = isReplayMode && frameBuffer[scrubberIndex]
    ? frameBuffer[scrubberIndex]
    : latestFrame;

  // Floating PiP States
  const [activePip, setActivePip] = useState<"camera" | "radar" | "lidar">("camera");
  const [pipMinimized, setPipMinimized] = useState<boolean>(false);
  const [pipExpanded, setPipExpanded] = useState<boolean>(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const targetCamPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 24, -32));
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 10));

  // Initialize Three.js Scene with Physically Based Materials & Apple Aesthetic
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const heightPx = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070B);
    scene.fog = new THREE.FogExp2(0x05070B, 0.012);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / heightPx, 0.1, 1000);
    camera.position.set(0, 24, -32);
    camera.lookAt(0, 0, 10);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Directional Sunlight (HDR feel)
    const sunLight = new THREE.DirectionalLight(0x4da3ff, 1.4);
    sunLight.position.set(30, 50, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 150;
    scene.add(sunLight);

    // Soft Point Fill Light
    const fillLight = new THREE.PointLight(0x34d399, 0.8, 60);
    fillLight.position.set(-15, 8, -5);
    scene.add(fillLight);

    // Reflective Road / Asphalt Ground
    const roadGeo = new THREE.PlaneGeometry(36, 300);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x0c1017,
      roughness: 0.45,
      metalness: 0.35,
    });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, -0.05, 50);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Road Lane Markings (White dashes & Yellow center line)
    const laneMat = new THREE.MeshBasicMaterial({ color: 0xf5f7fa, transparent: true, opacity: 0.65 });
    const centerMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8 });

    // Center divider
    const centerLineGeo = new THREE.PlaneGeometry(0.2, 300);
    const centerLine = new THREE.Mesh(centerLineGeo, centerMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.set(0, -0.03, 50);
    scene.add(centerLine);

    // Left and Right lane dashes
    for (let z = -80; z < 180; z += 8) {
      const dashGeo = new THREE.PlaneGeometry(0.15, 4);
      const leftDash = new THREE.Mesh(dashGeo, laneMat);
      leftDash.rotation.x = -Math.PI / 2;
      leftDash.position.set(-3.75, -0.03, z);
      scene.add(leftDash);

      const rightDash = new THREE.Mesh(dashGeo, laneMat);
      rightDash.rotation.x = -Math.PI / 2;
      rightDash.position.set(3.75, -0.03, z);
      scene.add(rightDash);
    }

    // Tactical Ambient Grid Floor
    const gridHelper = new THREE.GridHelper(300, 75, 0x4da3ff, 0x161d2b);
    gridHelper.position.y = -0.08;
    scene.add(gridHelper);

    // Objects Group
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

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

    // Smooth Animation Loop with Camera Interpolation
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera interpolation
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

  // Update Dynamic Scene Entities on Frame Change
  useEffect(() => {
    const group = objectsGroupRef.current;
    if (!group || !currentFrame) return;

    // Clear previous dynamic meshes
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    const ego = currentFrame.ego_state;
    const ex = ego.position.x;
    const ey = ego.position.y;
    const eyaw = ego.heading;

    // 1. Ego Vehicle Mesh (Waymo/Tesla Inspired Sleek Aerodynamic Body)
    if (showEgo) {
      const egoGroup = new THREE.Group();
      egoGroup.position.set(ex, 0.75, ey);
      egoGroup.rotation.y = -eyaw;

      // Chassis
      const bodyGeo = new THREE.BoxGeometry(ego.bbox.width, 1.25, ego.bbox.length);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x34d399,
        metalness: 0.85,
        roughness: 0.18,
        emissive: 0x34d399,
        emissiveIntensity: 0.2,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.castShadow = true;
      egoGroup.add(bodyMesh);

      // Aerodynamic Glass Cockpit
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

      // Headlight Beams (Illuminating forward cones)
      const beamGeo = new THREE.ConeGeometry(4.5, 20, 24);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x4da3ff,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
      });
      const leftBeam = new THREE.Mesh(beamGeo, beamMat);
      leftBeam.rotation.x = Math.PI / 2;
      leftBeam.position.set(-0.75, 0.2, 10);
      egoGroup.add(leftBeam);

      const rightBeam = new THREE.Mesh(beamGeo, beamMat);
      rightBeam.rotation.x = Math.PI / 2;
      rightBeam.position.set(0.75, 0.2, 10);
      egoGroup.add(rightBeam);

      group.add(egoGroup);
    }

    // 2. Dynamic Actors 3D Bounding Boxes with Apple Glow
    if (showBoxes) {
      currentFrame.tracks.forEach((trk) => {
        const colorHex = parseInt(
          (ACTOR_COLOR_MAP[trk.actor_type]?.hex || "#FBBF24").replace("#", "0x"),
          16
        );

        const actorGroup = new THREE.Group();
        actorGroup.position.set(trk.position.x, trk.bbox.height / 2, trk.position.y);
        actorGroup.rotation.y = -trk.heading;

        const boxGeo = new THREE.BoxGeometry(trk.bbox.width, trk.bbox.height, trk.bbox.length);
        const boxMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.45,
          roughness: 0.3,
          metalness: 0.6,
        });
        const mesh = new THREE.Mesh(boxGeo, boxMat);
        mesh.castShadow = true;
        actorGroup.add(mesh);

        // Apple-style sleek neon wireframe edges
        const wireGeo = new THREE.EdgesGeometry(boxGeo);
        const wireMat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
        const wire = new THREE.LineSegments(wireGeo, wireMat);
        actorGroup.add(wire);

        // Heading velocity vector arrow
        if (trk.speed > 0.4) {
          const arrowDir = new THREE.Vector3(0, 0, 1);
          const arrowHelper = new THREE.ArrowHelper(arrowDir, new THREE.Vector3(0, 0, 0), trk.speed * 0.9, colorHex);
          actorGroup.add(arrowHelper);
        }

        group.add(actorGroup);
      });
    }

    // 3. LiDAR Point Cloud
    if (showLidar && currentFrame.raw_detections) {
      const lidarDets = currentFrame.raw_detections.filter((d) => d.sensor_type === "LIDAR");
      if (lidarDets.length > 0) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(lidarDets.length * 3);

        lidarDets.forEach((d, i) => {
          positions[i * 3] = d.position.x;
          positions[i * 3 + 1] = 0.25;
          positions[i * 3 + 2] = d.position.y;
        });

        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const pMaterial = new THREE.PointsMaterial({
          color: 0x4da3ff,
          size: 0.5,
          transparent: true,
          opacity: 0.9,
        });
        const pointCloud = new THREE.Points(geometry, pMaterial);
        group.add(pointCloud);
      }
    }

    // 4. Planned Trajectory Glowing Ribbon (Hybrid A*)
    if (showTrajectories && currentFrame.planned_trajectory?.waypoints && currentFrame.planned_trajectory.waypoints.length > 1) {
      const points = currentFrame.planned_trajectory.waypoints.map(
        (wp) => new THREE.Vector3(wp.x, 0.18, wp.y)
      );
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.28, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x4da3ff,
        emissive: 0x4da3ff,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        transparent: true,
        opacity: 0.85,
      });
      const ribbon = new THREE.Mesh(tubeGeo, tubeMat);
      group.add(ribbon);
    }

    // 5. Future Road Composer Multi-Modal Prediction Lines
    if (showTrajectories && currentFrame.predictions?.predictions) {
      Object.values(currentFrame.predictions.predictions).forEach((pred) => {
        pred.hypotheses.forEach((hyp) => {
          if (hyp.waypoints.length > 1) {
            const pathPoints = hyp.waypoints.map((wp) => new THREE.Vector3(wp.x, 0.12, wp.y));
            const lineGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
            const lineMat = new THREE.LineDashedMaterial({
              color: hyp.maneuver_name.includes("CUT_IN") ? 0xff5c7a : 0xfbbf24,
              dashSize: 0.7,
              gapSize: 0.35,
              opacity: Math.max(0.25, hyp.probability),
              transparent: true,
            });
            const line = new THREE.Line(lineGeo, lineMat);
            line.computeLineDistances();
            group.add(line);
          }
        });
      });
    }

    // Smooth Camera Mode Trajectory Target Calculation
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
      targetCamPos.current.set(ex, 48, ey);
      targetLookAt.current.set(ex, 0, ey + 0.1);
    } else {
      // Orbit
      targetCamPos.current.set(ex - 22, 22, ey - 22);
      targetLookAt.current.set(ex, 0.5, ey);
    }
  }, [currentFrame, showEgo, showBoxes, showLidar, showTrajectories, showRisk, showOcclusions, cameraMode]);

  const egoSpeedKmH = ((currentFrame?.ego_state.speed ?? 0) * 3.6).toFixed(1);
  const egoYawDeg = (((currentFrame?.ego_state.heading ?? 0) * 180) / Math.PI).toFixed(1);
  const egoX = (currentFrame?.ego_state.position.x ?? 0).toFixed(1);
  const egoY = (currentFrame?.ego_state.position.y ?? 0).toFixed(1);

  return (
    <div className={clsx("relative rounded-2xl overflow-hidden border border-white/[0.08] bg-[#05070B] shadow-[0_12px_40px_rgba(0,0,0,0.6)]", height, className)}>
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Tactical Camera Bar */}
      <div className="absolute top-3 left-3 flex items-center gap-1 p-1 rounded-xl bg-[#12161E]/80 backdrop-blur-2xl border border-white/[0.08] z-20 shadow-lg">
        {(["orbit", "chase", "firstPerson", "topDown"] as CameraMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setCameraMode(mode)}
            className={clsx(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize",
              cameraMode === mode
                ? "bg-[#4DA3FF]/20 text-[#4DA3FF] border border-[#4DA3FF]/40 shadow-[0_2px_8px_rgba(77,163,255,0.2)] font-semibold"
                : "text-[#9BA6B2] hover:text-[#F5F7FA] border border-transparent"
            )}
          >
            {mode === "firstPerson" ? "FSD Cabin" : mode === "topDown" ? "Ortho 2D" : mode}
          </button>
        ))}
      </div>

      {/* Floating Layer Toggles Bar */}
      <div className="absolute top-3 right-3 flex items-center gap-1 p-1 rounded-xl bg-[#12161E]/80 backdrop-blur-2xl border border-white/[0.08] z-20 text-[11px] shadow-lg">
        <button
          onClick={() => toggleLayer("showLidar")}
          className={clsx(
            "px-2.5 py-1 rounded-lg border transition-all",
            showLidar ? "bg-[#4DA3FF]/15 text-[#4DA3FF] border-[#4DA3FF]/35 font-medium" : "text-[#9BA6B2] border-transparent hover:text-white"
          )}
        >
          LiDAR
        </button>
        <button
          onClick={() => toggleLayer("showBoxes")}
          className={clsx(
            "px-2.5 py-1 rounded-lg border transition-all",
            showBoxes ? "bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/35 font-medium" : "text-[#9BA6B2] border-transparent hover:text-white"
          )}
        >
          3D OBB
        </button>
        <button
          onClick={() => toggleLayer("showTrajectories")}
          className={clsx(
            "px-2.5 py-1 rounded-lg border transition-all",
            showTrajectories ? "bg-[#34D399]/15 text-[#34D399] border-[#34D399]/35 font-medium" : "text-[#9BA6B2] border-transparent hover:text-white"
          )}
        >
          Ribbons
        </button>
      </div>

      {/* Floating PiP System (Picture-in-Picture Windows) */}
      <motion.div
        layout
        className={clsx(
          "absolute z-20 transition-all duration-300",
          pipExpanded
            ? "bottom-14 right-4 w-80 h-56"
            : pipMinimized
            ? "bottom-14 right-4 w-36 h-10"
            : "bottom-14 right-4 w-60 h-40"
        )}
      >
        <div className="w-full h-full rounded-2xl bg-[#12161E]/90 backdrop-blur-2xl border border-white/[0.12] p-2 flex flex-col shadow-[0_12px_32px_rgba(0,0,0,0.7)] relative overflow-hidden group">
          {/* Top PiP Navigation & Toggle Controls */}
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/[0.08] shrink-0 text-[10px]">
            <div className="flex items-center gap-1 font-medium">
              {(["camera", "radar", "lidar"] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => {
                    setActivePip(view);
                    if (pipMinimized) setPipMinimized(false);
                  }}
                  className={clsx(
                    "px-1.5 py-0.5 rounded capitalize transition-all",
                    activePip === view
                      ? "bg-[#4DA3FF]/20 text-[#4DA3FF] font-semibold"
                      : "text-[#9BA6B2] hover:text-[#F5F7FA]"
                  )}
                >
                  {view}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 text-[#9BA6B2]">
              <button
                onClick={() => setPipExpanded(!pipExpanded)}
                className="hover:text-white p-0.5"
                title={pipExpanded ? "Standard size" : "Expand PiP"}
              >
                {pipExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setPipMinimized(!pipMinimized)}
                className="hover:text-white p-0.5"
                title={pipMinimized ? "Restore" : "Minimize"}
              >
                <Sliders className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* PiP Viewport Content */}
          {!pipMinimized && (
            <div className="flex-1 rounded-xl bg-[#05070B] relative overflow-hidden border border-white/[0.05] flex items-center justify-center">
              {/* 1. RGB Camera Simulated Feed */}
              {activePip === "camera" && (
                <div className="w-full h-full relative bg-gradient-to-b from-[#0b1320] via-[#080d17] to-[#04060a] p-2 flex flex-col justify-between font-mono">
                  {/* Horizon line & artificial optical perspective */}
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#4DA3FF]/20 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <Crosshair className="w-6 h-6 text-[#4DA3FF]/40" />
                  </div>

                  {/* Simulated Bounding Box Overlays */}
                  <div className="absolute top-[35%] left-[25%] w-14 h-12 border border-[#34D399]/70 rounded bg-[#34D399]/10 pointer-events-none flex items-start justify-between p-0.5">
                    <span className="text-[8px] text-[#34D399] font-bold">AUTONOMOUS</span>
                  </div>
                  <div className="absolute top-[42%] right-[28%] w-12 h-10 border border-[#FBBF24]/70 rounded bg-[#FBBF24]/10 pointer-events-none flex items-start justify-between p-0.5">
                    <span className="text-[8px] text-[#FBBF24] font-bold">AUTO_RICK</span>
                  </div>

                  {/* Camera Header Watermark */}
                  <div className="flex justify-between text-[9px] text-[#9BA6B2] z-10">
                    <div className="flex items-center gap-1 text-[#34D399]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                      <span>CAM_FRONT_WIDE 4K</span>
                    </div>
                    <span>30 FPS</span>
                  </div>

                  {/* Camera Bottom Telemetry Overlay */}
                  <div className="flex justify-between text-[9px] text-[#F5F7FA] z-10 bg-[#12161E]/70 px-1.5 py-0.5 rounded backdrop-blur-md">
                    <span>SPD: {egoSpeedKmH} km/h</span>
                    <span>YAW: {egoYawDeg}°</span>
                  </div>
                </div>
              )}

              {/* 2. FMCW Radar Sweep Simulated View */}
              {activePip === "radar" && (
                <div className="w-full h-full relative bg-[#05070B] p-2 flex items-center justify-center overflow-hidden font-mono">
                  {/* Polar Rings */}
                  <div className="absolute w-24 h-24 rounded-full border border-[#4DA3FF]/20 pointer-events-none" />
                  <div className="absolute w-16 h-16 rounded-full border border-[#4DA3FF]/30 pointer-events-none" />
                  <div className="absolute w-8 h-8 rounded-full border border-[#4DA3FF]/40 pointer-events-none" />
                  <div className="absolute w-full h-[1px] bg-[#4DA3FF]/20" />
                  <div className="absolute h-full w-[1px] bg-[#4DA3FF]/20" />

                  {/* Rotating Doppler Sweep Line */}
                  <div className="absolute w-24 h-24 rounded-full border-t-2 border-[#4DA3FF] animate-spin pointer-events-none opacity-70" />

                  {/* Doppler Radar Targets */}
                  <div className="absolute top-[28%] left-[45%] w-2 h-2 rounded-full bg-[#FF5C7A] animate-ping" />
                  <div className="absolute top-[28%] left-[45%] w-2 h-2 rounded-full bg-[#FF5C7A]" />
                  <div className="absolute bottom-[35%] right-[32%] w-1.5 h-1.5 rounded-full bg-[#34D399]" />

                  {/* Radar Status Badge */}
                  <div className="absolute top-1.5 left-1.5 text-[8px] text-[#4DA3FF] font-bold">
                    77 GHz FMCW RADAR
                  </div>
                </div>
              )}

              {/* 3. LiDAR Elevation Point Cloud View */}
              {activePip === "lidar" && (
                <div className="w-full h-full relative bg-[#05070B] p-2 flex flex-col justify-between overflow-hidden font-mono">
                  <div className="flex justify-between text-[9px] text-[#9BA6B2]">
                    <span className="text-[#4DA3FF] font-bold">LIDAR DEPTH MAP</span>
                    <span>128-BEAM</span>
                  </div>

                  {/* Synthetic point matrix */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-full h-20 grid grid-cols-8 gap-1 p-1 opacity-70">
                      {Array.from({ length: 32 }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded-sm"
                          style={{
                            backgroundColor: i % 4 === 0 ? "#FF5C7A" : i % 3 === 0 ? "#FBBF24" : "#4DA3FF",
                            opacity: 0.3 + (i % 7) * 0.1,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-[8px] text-[#9BA6B2] text-center">
                    {currentFrame?.raw_detections?.length ?? 0} active spatial returns
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Apple-style Bottom Telemetry Capsule */}
      <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-[#12161E]/80 backdrop-blur-2xl border border-white/[0.08] text-[12px] font-mono pointer-events-none shadow-lg">
        <div className="flex items-center gap-3 text-[#9BA6B2]">
          <span>Ego Pos: <strong className="text-[#F5F7FA]">({egoX}, {egoY})</strong></span>
          <span>Speed: <strong className="text-[#34D399]">{egoSpeedKmH} km/h</strong></span>
          <span>Heading: <strong className="text-[#4DA3FF]">{egoYawDeg}°</strong></span>
        </div>
      </div>
    </div>
  );
};
