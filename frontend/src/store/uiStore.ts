import { create } from "zustand";

export type CameraMode = "orbit" | "chase" | "firstPerson" | "topDown";

interface UIState {
  // Navigation & Modals
  activeTab: string;
  selectedActorId: string | null;
  isInspectorOpen: boolean;
  sidebarCollapsed: boolean;
  isJudgeMode: boolean;

  // 3D Digital Twin Controls
  cameraMode: CameraMode;
  showGrid: boolean;
  showEgo: boolean;
  showBoxes: boolean;
  showLidar: boolean;
  showTrajectories: boolean;
  showRisk: boolean;
  showOcclusions: boolean;
  showGnnAttention: boolean;
  showCovariance: boolean;
  showIntentEdges: boolean;
  showSearchFrontier: boolean;

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
  toggleLayer: (
    layer:
      | "showGrid"
      | "showEgo"
      | "showBoxes"
      | "showLidar"
      | "showTrajectories"
      | "showRisk"
      | "showOcclusions"
      | "showGnnAttention"
      | "showCovariance"
      | "showIntentEdges"
      | "showSearchFrontier"
  ) => void;
  toggleJudgeMode: () => void;
  setJudgeMode: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: "overview",
  selectedActorId: null,
  isInspectorOpen: false,
  sidebarCollapsed: false,
  isJudgeMode: false,

  cameraMode: "orbit",
  showGrid: true,
  showEgo: true,
  showBoxes: true,
  showLidar: true,
  showTrajectories: true,
  showRisk: true,
  showOcclusions: true,
  showGnnAttention: true,
  showCovariance: true,
  showIntentEdges: true,
  showSearchFrontier: true,

  highContrastMode: false,
  reducedMotion: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedActorId: (id) => set({ selectedActorId: id, isInspectorOpen: id !== null }),
  setIsInspectorOpen: (open) => set({ isInspectorOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleLayer: (layer) => set((s) => ({ [layer]: !s[layer] })),
  toggleJudgeMode: () =>
    set((s) => ({
      isJudgeMode: !s.isJudgeMode,
      sidebarCollapsed: !s.isJudgeMode,
    })),
  setJudgeMode: (enabled) =>
    set({
      isJudgeMode: enabled,
      sidebarCollapsed: enabled,
    }),
  setHighContrast: (enabled) => set({ highContrastMode: enabled }),
  setReducedMotion: (enabled) => set({ reducedMotion: enabled }),
}));
