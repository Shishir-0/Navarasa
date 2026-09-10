import { useEffect, useRef } from "react";
import { useTelemetryStore } from "../store/telemetryStore";
import { usePlaybackStore } from "../store/playbackStore";
import { clientSimulator } from "../services/mockSimulation";
import { FrameBundle } from "../types/navrasa";

export function useWebSocket(url: string = "ws://localhost:8000/ws/stream") {
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const fallbackIntervalRef = useRef<number | null>(null);

  const { pushFrame, setConnected, activeScenarioId } = useTelemetryStore();
  const { isPlaying, isReplayMode, playbackSpeed } = usePlaybackStore();

  useEffect(() => {
    // Reset client simulator when scenario changes
    clientSimulator.reset(activeScenarioId);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(`scenario:${activeScenarioId}`);
    }
  }, [activeScenarioId]);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      try {
        const ws = new WebSocket(url);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setConnected(true);
          console.log("[NAVRASA WS] Connected to live backend streaming gateway.");

          // Start Heartbeat Ping every 3s
          if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send("ping");
            }
          }, 3000);

          // Clear fallback simulator interval if live connection succeeded
          if (fallbackIntervalRef.current) {
            clearInterval(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted || isReplayMode || !isPlaying) return;
          if (event.data === "pong") return;

          try {
            const frame: FrameBundle = JSON.parse(event.data);
            pushFrame(frame);
          } catch (e) {
            console.error("[NAVRASA WS] JSON parse error:", e);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setConnected(false);
          startFallbackSimulation();
          // Attempt reconnection after 3 seconds
          setTimeout(() => {
            if (isMounted) connect();
          }, 3000);
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setConnected(false);
          startFallbackSimulation();
        };
      } catch (err) {
        setConnected(false);
        startFallbackSimulation();
      }
    }

    function startFallbackSimulation() {
      if (fallbackIntervalRef.current) return;
      // 20 FPS fallback loop
      fallbackIntervalRef.current = window.setInterval(() => {
        if (!isMounted || isReplayMode || !isPlaying) return;
        const dt = 0.05 * playbackSpeed;
        const frame = clientSimulator.step(dt, activeScenarioId);
        pushFrame(frame);
      }, 50 / playbackSpeed);
    }

    connect();

    return () => {
      isMounted = false;
      if (socketRef.current) socketRef.current.close();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (fallbackIntervalRef.current) clearInterval(fallbackIntervalRef.current);
    };
  }, [url, pushFrame, setConnected, isPlaying, isReplayMode, playbackSpeed, activeScenarioId]);
}
