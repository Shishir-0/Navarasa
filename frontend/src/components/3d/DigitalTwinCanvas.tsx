import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTelemetryStore } from "../../store/telemetryStore";
import { usePlaybackStore } from "../../store/playbackStore";
import { useUIStore, CameraMode } from "../../store/uiStore";
import { ACTOR_COLOR_MAP } from "../../utils/colors";
import { FrameBundle } from "../../types/navrasa";
import {
  Eye,
  Camera,
  Layers,
  Crosshair,
  Maximize2,
} from "lucide-react";
import { clsx } from "clsx";

export const DigitalTwinCanvas: React.FC<{ className?: string; height?: string }> = ({
  className,
  height = "h-[500px]",
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

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);

  // Setup Three.js Scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const heightPx = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.015);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(55, width / heightPx, 0.1, 1000);
    camera.position.set(0, 25, -35);
    camera.lookAt(0, 0, 10);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00e5ff, 1.2);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    const groundLight = new THREE.PointLight(0x00ff88, 1.0, 50);
    groundLight.position.set(0, 5, 0);
    scene.add(groundLight);

    // Objects Group
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    // Grid Floor
    const gridHelper = new THREE.GridHelper(200, 100, 0x00e5ff, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

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

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
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
    const camera = cameraRef.current;
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

    // 1. Ego Vehicle
    if (showEgo) {
      const egoGroup = new THREE.Group();
      egoGroup.position.set(ex, 0.75, ey);
      egoGroup.rotation.y = -eyaw;

      // Body mesh
      const bodyGeo = new THREE.BoxGeometry(ego.bbox.width, 1.4, ego.bbox.length);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x00ff88,
        emissiveIntensity: 0.25,
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      egoGroup.add(bodyMesh);

      // Cabin / Glass
      const cabinGeo = new THREE.BoxGeometry(ego.bbox.width * 0.85, 0.8, ego.bbox.length * 0.5);
      const cabinMat = new THREE.MeshStandardMaterial({
        color: 0x070a13,
        roughness: 0.1,
        metalness: 0.9,
      });
      const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
      cabinMesh.position.set(0, 0.9, -0.2);
      egoGroup.add(cabinMesh);

      // Headlight Beams
      const beamGeo = new THREE.ConeGeometry(4, 18, 16);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      });
      const leftBeam = new THREE.Mesh(beamGeo, beamMat);
      leftBeam.rotation.x = Math.PI / 2;
      leftBeam.position.set(-0.7, 0.2, 9);
      egoGroup.add(leftBeam);

      const rightBeam = new THREE.Mesh(beamGeo, beamMat);
      rightBeam.rotation.x = Math.PI / 2;
      rightBeam.position.set(0.7, 0.2, 9);
      egoGroup.add(rightBeam);

      group.add(egoGroup);
    }

    // 2. Dynamic Actors 3D Bounding Boxes
    if (showBoxes) {
      currentFrame.tracks.forEach((trk) => {
        const colorHex = parseInt(
          (ACTOR_COLOR_MAP[trk.actor_type]?.hex || "#FFB700").replace("#", "0x"),
          16
        );

        const actorGroup = new THREE.Group();
        actorGroup.position.set(trk.position.x, trk.bbox.height / 2, trk.position.y);
        actorGroup.rotation.y = -trk.heading;

        const boxGeo = new THREE.BoxGeometry(trk.bbox.width, trk.bbox.height, trk.bbox.length);
        const boxMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.55,
          wireframe: false,
        });
        const mesh = new THREE.Mesh(boxGeo, boxMat);
        actorGroup.add(mesh);

        // Wireframe edges
        const wireGeo = new THREE.EdgesGeometry(boxGeo);
        const wireMat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2 });
        const wire = new THREE.LineSegments(wireGeo, wireMat);
        actorGroup.add(wire);

        // Velocity vector arrow
        if (trk.speed > 0.5) {
          const arrowDir = new THREE.Vector3(0, 0, 1);
          const arrowHelper = new THREE.ArrowHelper(arrowDir, new THREE.Vector3(0, 0, 0), trk.speed * 0.8, colorHex);
          actorGroup.add(arrowHelper);
        }

        group.add(actorGroup);
      });
    }

    // 3. LiDAR Points Cloud
    if (showLidar && currentFrame.raw_detections) {
      const lidarDets = currentFrame.raw_detections.filter((d) => d.sensor_type === "LIDAR");
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(lidarDets.length * 3);

      lidarDets.forEach((d, i) => {
        positions[i * 3] = d.position.x;
        positions[i * 3 + 1] = 0.2;
        positions[i * 3 + 2] = d.position.y;
      });

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const pMaterial = new THREE.PointsMaterial({
        color: 0x00e5ff,
        size: 0.45,
        transparent: true,
        opacity: 0.85,
      });
      const pointCloud = new THREE.Points(geometry, pMaterial);
      group.add(pointCloud);
    }

    // 4. Planned Trajectory Ribbon
    if (showTrajectories && currentFrame.planned_trajectory?.waypoints) {
      const points = currentFrame.planned_trajectory.waypoints.map(
        (wp) => new THREE.Vector3(wp.x, 0.15, wp.y)
      );
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.25, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.9,
      });
      const ribbon = new THREE.Mesh(tubeGeo, tubeMat);
      group.add(ribbon);
    }

    // 5. Future Road Composer Multi-Modal Prediction Lines
    if (showTrajectories && currentFrame.predictions?.predictions) {
      Object.values(currentFrame.predictions.predictions).forEach((pred) => {
        pred.hypotheses.forEach((hyp) => {
          const pathPoints = hyp.waypoints.map((wp) => new THREE.Vector3(wp.x, 0.1, wp.y));
          const lineGeo = new THREE.BufferGeometry().setFromPoints(pathPoints);
          const lineMat = new THREE.LineDashedMaterial({
            color: hyp.maneuver_name.includes("CUT_IN") ? 0xff0055 : 0xffb700,
            dashSize: 0.8,
            gapSize: 0.4,
            opacity: hyp.probability,
            transparent: true,
          });
          const line = new THREE.Line(lineGeo, lineMat);
          line.computeLineDistances();
          group.add(line);
        });
      });
    }

    // Update Camera Mode
    if (camera) {
      if (cameraMode === "chase") {
        const offsetDist = 18;
        const heightDist = 8;
        const targetX = ex - offsetDist * Math.cos(eyaw);
        const targetY = heightDist;
        const targetZ = ey - offsetDist * Math.sin(eyaw);

        camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.1);
        camera.lookAt(ex + 12 * Math.cos(eyaw), 1, ey + 12 * Math.sin(eyaw));
      } else if (cameraMode === "firstPerson") {
        camera.position.set(ex + 2.0 * Math.cos(eyaw), 1.6, ey + 2.0 * Math.sin(eyaw));
        camera.lookAt(ex + 20 * Math.cos(eyaw), 1.2, ey + 20 * Math.sin(eyaw));
      } else if (cameraMode === "topDown") {
        camera.position.set(ex, 45, ey);
        camera.lookAt(ex, 0, ey + 0.1);
      } else {
        // Orbit mode defaults around ego
        camera.lookAt(ex, 0, ey);
      }
    }
  }, [currentFrame, showEgo, showBoxes, showLidar, showTrajectories, showRisk, showOcclusions, cameraMode]);

  return (
    <div className={clsx("relative rounded-xl overflow-hidden border border-slate-800 bg-[#050811]", height, className)}>
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Tactical Overlay Controls */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 p-1 rounded-lg bg-panel/90 backdrop-blur-md border border-slate-800 z-10">
        {(["orbit", "chase", "firstPerson", "topDown"] as CameraMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setCameraMode(mode)}
            className={clsx(
              "px-2 py-1 rounded text-[11px] font-mono font-medium transition-all capitalize",
              cameraMode === mode
                ? "bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/50 font-bold"
                : "text-hud-secondary hover:text-hud-text"
            )}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Floating Layer Visibility Toggles */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 p-1 rounded-lg bg-panel/90 backdrop-blur-md border border-slate-800 z-10 text-[11px] font-mono">
        <button
          onClick={() => toggleLayer("showLidar")}
          className={clsx(
            "px-2 py-1 rounded border transition-all",
            showLidar ? "bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/40" : "text-slate-600 border-transparent"
          )}
        >
          LiDAR
        </button>
        <button
          onClick={() => toggleLayer("showBoxes")}
          className={clsx(
            "px-2 py-1 rounded border transition-all",
            showBoxes ? "bg-cyber-amber/15 text-cyber-amber border-cyber-amber/40" : "text-slate-600 border-transparent"
          )}
        >
          OBB 3D
        </button>
        <button
          onClick={() => toggleLayer("showTrajectories")}
          className={clsx(
            "px-2 py-1 rounded border transition-all",
            showTrajectories ? "bg-cyber-emerald/15 text-cyber-emerald border-cyber-emerald/40" : "text-slate-600 border-transparent"
          )}
        >
          Futures
        </button>
      </div>

      {/* Telemetry Corner HUD */}
      <div className="absolute bottom-3 left-3 px-3 py-2 rounded-lg bg-panel/90 backdrop-blur-md border border-slate-800 text-[11px] font-mono pointer-events-none">
        <div className="flex items-center gap-3 text-hud-secondary">
          <span>Ego Pos: <strong className="text-hud-text">({currentFrame?.ego_state.position.x.toFixed(1)}, {currentFrame?.ego_state.position.y.toFixed(1)})</strong></span>
          <span>Speed: <strong className="text-cyber-emerald">{((currentFrame?.ego_state.speed ?? 0) * 3.6).toFixed(1)} km/h</strong></span>
          <span>Yaw: <strong className="text-cyber-cyan">{((currentFrame?.ego_state.heading ?? 0) * 180 / Math.PI).toFixed(1)}°</strong></span>
        </div>
      </div>
    </div>
  );
};
