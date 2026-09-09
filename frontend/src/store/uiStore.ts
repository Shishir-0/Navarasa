import { create } from "zustand";

export type CameraMode = "orbit" | "chase" | "firstPerson" | "topDown";

interface UIState {
  // Navigation & Modals
  activeTab: string;
  selectedActorId: string | null;
  isInspectorOpen: boolean;
  sidebarCollapsed: boolean;

  // 3D Digital Twin Controls
  cameraMode: CameraMode;
  showGrid: boolean;
  showEgo: boolean;
  showBoxes: boolean;
  showLidar: boolean;
  showTrajectories: boolean;
  showRisk: boolean;
  showOcclusions: boolean;

  // Accessibility & UI modes
  highContrastMode: boolean;
  reducedMotion: boolean;

  // Actions
  setActiveTab: (tab: string) => void;
  setSelectedActorId: (id: string | null) => void;
  setIsInspectorOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCameraMode: (mode: CameraMode) => void;
  toggleLayer: (layer: "showGrid" | "showEgo" | "showBoxes" | "showLidar" | "showTrajectories" | "showRisk" | "showOcclusions") => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: "overview",
  selectedActorId: null,
  isInspectorOpen: false,
  sidebarCollapsed: false,

  cameraMode: "orbit",
  showGrid: true,
  showEgo: true,
  showBoxes: true,
  showLidar: true,
  showTrajectories: true,
  showRisk: true,
  showOcclusions: true,

  highContrastMode: false,
  reducedMotion: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedActorId: (id) => set({ selectedActorId: id, isInspectorOpen: id !== null }),
  setIsInspectorOpen: (open) => set({ isInspectorOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleLayer: (layer) => set((s) => ({ [layer]: !s[layer] })),
  setHighContrast: (enabled) => set({ highContrastMode: enabled }),
  setReducedMotion: (enabled) => set({ reducedMotion: enabled }),
}));
