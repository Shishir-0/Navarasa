import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MissionControlPage } from '../pages/MissionControlPage';
import { DigitalTwinPage } from '../pages/DigitalTwinPage';
import { IntentGraphPage } from '../pages/IntentGraphPage';
import { FutureComposerPage } from '../pages/FutureComposerPage';
import { RiskHeatmapPage } from '../pages/RiskHeatmapPage';
import { DecisionTimelinePage } from '../pages/DecisionTimelinePage';
import { AnalyticsPage } from '../pages/AnalyticsPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/mission-control" replace />} />
      <Route path="/mission-control" element={<MissionControlPage />} />
      <Route path="/digital-twin" element={<DigitalTwinPage />} />
      <Route path="/road-intent-graph" element={<IntentGraphPage />} />
      <Route path="/future-composer" element={<FutureComposerPage />} />
      <Route path="/risk-heatmap" element={<RiskHeatmapPage />} />
      <Route path="/decision-timeline" element={<DecisionTimelinePage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="*" element={<Navigate to="/mission-control" replace />} />
    </Routes>
  );
};
