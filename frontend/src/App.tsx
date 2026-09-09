import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ReplayController } from './components/layout/ReplayController';
import { SafetyOverrideOverlay } from './components/common/SafetyOverrideOverlay';
import { AppRouter } from './app/router';
import { useWebSocket } from './hooks/useWebSocket';
import { useUIStore } from './store/uiStore';

export const App: React.FC = () => {
  // Initialize real-time WebSocket connection to FastAPI backend (or auto fallback to client simulation)
  useWebSocket();

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

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen bg-brand-bg text-text-primary overflow-hidden font-sans select-none relative scanlines">
        {/* Cinematic CBF Safety Barrier Shockwave & Toast Overlay */}
        <SafetyOverrideOverlay />

        {/* Persistent Left Navigation Sidebar */}
        <Sidebar />

        {/* Main Application Operations Area */}
        <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
          {/* Top Mission Control Header */}
          <Header />

          {/* Central Scrollable Route Content */}
          <main className="flex-1 overflow-y-auto relative bg-[#070a13]/95 cyber-grid-bg">
            <AppRouter />
          </main>

          {/* Bottom Telemetry Replay Controller */}
          <div className="p-3 bg-panel/95 border-t border-slate-800 z-20">
            <ReplayController />
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
