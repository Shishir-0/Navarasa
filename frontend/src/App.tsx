import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ReplayController } from './components/layout/ReplayController';
import { SafetyOverrideOverlay } from './components/common/SafetyOverrideOverlay';
import { DynamicIsland } from './components/common/DynamicIsland';
import { BootSequence } from './components/common/BootSequence';
import { AppRouter } from './app/router';
import { useWebSocket } from './hooks/useWebSocket';
import { useUIStore } from './store/uiStore';
import { AnimatePresence } from 'framer-motion';

export const App: React.FC = () => {
  // Initialize real-time WebSocket connection to FastAPI backend (or auto fallback to client simulation)
  useWebSocket();

  const [hasBooted, setHasBooted] = useState<boolean>(() => {
    return sessionStorage.getItem('navrasa_booted') === 'true';
  });

  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar with Ctrl + B or Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const handleBootComplete = () => {
    sessionStorage.setItem('navrasa_booted', 'true');
    setHasBooted(true);
  };

  return (
    <BrowserRouter>
      {/* 1. VisionOS Boot Sequence (2.5s First Load) */}
      <AnimatePresence>
        {!hasBooted && <BootSequence onComplete={handleBootComplete} />}
      </AnimatePresence>

      <div className="flex h-screen w-screen bg-[#05070B] text-[#F5F7FA] overflow-hidden font-sans select-none relative vision-grid-ambient">
        {/* 2. Floating Dynamic Island (VisionOS Top Center) */}
        <DynamicIsland />

        {/* 3. Cinematic CBF Safety Barrier Shockwave & Toast Overlay */}
        <SafetyOverrideOverlay />

        {/* 4. VisionOS Translucent Left Navigation Sidebar */}
        <Sidebar />

        {/* 5. Main Application Operations Area */}
        <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
          {/* Top Mission Control Floating Header */}
          <Header />

          {/* Central Scrollable Route Content */}
          <main className="flex-1 overflow-y-auto relative bg-transparent">
            <AppRouter />
          </main>

          {/* Bottom Telemetry Replay Controller */}
          <div className="p-3 bg-[#12161E]/85 backdrop-blur-2xl border-t border-white/[0.08] z-20">
            <ReplayController />
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
