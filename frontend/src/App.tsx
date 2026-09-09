import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ReplayBar } from './components/layout/ReplayBar';
import { AppRouter } from './app/router';
import { useWebSocket } from './hooks/useWebSocket';
import { useUIStore } from './store/uiStore';

export const App: React.FC = () => {
  // Initialize real-time WebSocket connection to FastAPI backend (or auto fallback to client simulation)
  useWebSocket();

  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
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
      <div className="flex h-screen w-screen bg-brand-bg text-text-primary overflow-hidden font-sans select-none">
        {/* Persistent Left Navigation Sidebar */}
        <Sidebar />

        {/* Main Application Area */}
        <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
          {/* Top Mission Control Header */}
          <Header />

          {/* Central Scrollable Route Content */}
          <main className="flex-1 overflow-y-auto relative bg-[#050811]/90">
            <AppRouter />
          </main>

          {/* Bottom Telemetry Replay Controller */}
          <ReplayBar />
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
