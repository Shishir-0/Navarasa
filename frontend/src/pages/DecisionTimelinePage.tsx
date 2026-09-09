import React, { useState } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { usePlaybackStore } from '../store/playbackStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { MetricPill } from '../components/common/MetricPill';
import { FrameBundle } from '../types/navrasa';
import { 
  History, 
  ShieldAlert, 
  GitCommit, 
  Cpu, 
  Zap, 
  ArrowRight, 
  Filter, 
  Search, 
  Clock, 
  ShieldCheck,
  Play
} from 'lucide-react';
import { motion } from 'framer-motion';

export const DecisionTimelinePage: React.FC = () => {
  const latestFrame = useTelemetryStore((state) => state.latestFrame);
  const frameBuffer = useTelemetryStore((state) => state.frameBuffer);
  const { seek, setPlaying } = usePlaybackStore();

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'critical' | 'cbf' | 'planning' | 'intent'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  if (!latestFrame) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 font-mono">
        <Clock className="w-8 h-8 animate-spin mr-3 text-cyan" />
        Syncing decision timeline stream...
      </div>
    );
  }

  // Derive decision events from recent telemetry buffer
  const events = frameBuffer.slice(-40).reverse().map((frame: FrameBundle, idx: number) => {
    const timeStr = new Date(frame.timestamp * 1000).toISOString().substr(11, 12);
    const hasCBF = frame.control_command?.cbf_active ?? false;
    const minTTC = frame.metrics.min_ttc ?? 5.0;
    const isCritical = hasCBF || minTTC < 2.0;
    const isReplan = frame.planned_trajectory?.is_replan ?? false;
    
    // Find primary actor of interest
    const keyTrack = frame.tracks[0];
    const actorId = keyTrack ? keyTrack.track_id : 'ego';
    const actorType = keyTrack ? keyTrack.actor_type : 'EGO';
    const dist = keyTrack 
      ? Math.sqrt(Math.pow(keyTrack.position.x - frame.ego_state.position.x, 2) + Math.pow(keyTrack.position.y - frame.ego_state.position.y, 2)).toFixed(1)
      : '0.0';

    let category: 'cbf' | 'planning' | 'intent' | 'nominal' = 'nominal';
    if (hasCBF) category = 'cbf';
    else if (minTTC < 2.5) category = 'intent';
    else if (isReplan) category = 'planning';

    return {
      id: `evt-${frame.frame_id}-${idx}`,
      frameId: frame.frame_id,
      timestamp: frame.timestamp,
      timeStr,
      category,
      isCritical,
      title: hasCBF 
        ? `CBF Safety Barrier Intervention (Margin = ${(frame.control_command?.cbf_safety_margin || 1.2).toFixed(2)}m)`
        : minTTC < 2.5
        ? `High Conflict Intent Detected: ${actorId.toUpperCase()}`
        : `Hybrid A* Trajectory Generated (Cost: ${(frame.planned_trajectory?.cost || 12.4).toFixed(1)})`,
      perception: {
        actorId,
        type: actorType,
        distance: `${dist}m`,
      },
      reasoning: {
        relation: 'CROSSING',
        confidence: `${(0.85 * 100).toFixed(0)}%`,
        riskLevel: isCritical ? 'HIGH' : 'NOMINAL',
        riskValue: (frame.metrics.cbf_interventions_total > 0 ? 0.75 : 0.15).toFixed(2),
      },
      planning: {
        algorithm: frame.planned_trajectory?.planner_type || 'HYBRID_A_STAR',
        horizon: '4.0s (30 steps)',
        replanMs: `${(frame.metrics.planning_latency_ms || 14.5).toFixed(1)}ms`,
      },
      control: {
        throttle: (frame.control_command?.throttle || 0.4).toFixed(2),
        brake: (frame.control_command?.brake || 0.0).toFixed(2),
        steering: `${((frame.control_command?.steering_angle || 0) * 180 / Math.PI).toFixed(1)}°`,
        cbfOverride: hasCBF,
      },
      safety: {
        ttc: `${minTTC.toFixed(1)}s`,
        margin: `${(frame.control_command?.cbf_safety_margin || 4.5).toFixed(1)}m`,
      },
    };
  });

  // Filter events
  const filteredEvents = events.filter((evt: any) => {
    if (selectedFilter === 'critical' && !evt.isCritical) return false;
    if (selectedFilter === 'cbf' && evt.category !== 'cbf') return false;
    if (selectedFilter === 'planning' && evt.category !== 'planning') return false;
    if (selectedFilter === 'intent' && evt.category !== 'intent') return false;
    if (searchQuery && !evt.title.toLowerCase().includes(searchQuery.toLowerCase()) && !evt.perception.actorId.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const activeEvent = events.find((e: any) => e.id === selectedEventId) || filteredEvents[0] || events[0];

  const handleReplaySeek = (frameId: number) => {
    setPlaying(false);
    seek(frameId);
  };

  return (
    <div className="flex flex-col gap-5 p-6 min-h-full overflow-y-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-panel-border/50">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <History className="w-6 h-6 text-cyan animate-pulse" />
              Autonomous Decision Timeline
            </h1>
            <Badge variant="cyan">REAL-TIME LOG</Badge>
            <Badge variant="outline">{frameBuffer.length} BUFFERED FRAMES</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Chronological causality pipeline explaining perception triggers, GNN reasoning, Hybrid A* optimization, and CBF safety overrides.
          </p>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-3">
          <MetricPill
            label="Total Logged"
            value={frameBuffer.length}
            unit="events"
            status="info"
          />
          <MetricPill
            label="Safety Overrides"
            value={frameBuffer.filter((f: FrameBundle) => f.control_command?.cbf_active).length}
            unit="interventions"
            status={frameBuffer.some((f: FrameBundle) => f.control_command?.cbf_active) ? 'warning' : 'success'}
          />
          <MetricPill
            label="Current TTC"
            value={(latestFrame.metrics.min_ttc ?? 5.0).toFixed(1)}
            unit="s"
            status={(latestFrame.metrics.min_ttc ?? 5.0) < 2.0 ? 'danger' : 'success'}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-panel-bg/60 p-3 rounded-xl border border-panel-border">
        {/* Category Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          {[
            { key: 'all', label: 'All Decisions' },
            { key: 'critical', label: 'Safety Critical' },
            { key: 'cbf', label: 'CBF Overrides' },
            { key: 'intent', label: 'GNN Intent Triggers' },
            { key: 'planning', label: 'Planner Replans' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedFilter === tab.key
                  ? 'bg-cyan text-brand-black shadow-glow-cyan'
                  : 'bg-panel-bg text-slate-400 hover:text-white border border-panel-border/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by actor or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-brand-black/80 border border-panel-border rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan w-64"
          />
        </div>
      </div>

      {/* Main Split View: Timeline Feed + Causal Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* Left 7 Cols: Chronological Event Stream */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Causality Stream ({filteredEvents.length} items)</span>
            <span>Click card to inspect & jump</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[620px] pr-2">
            {filteredEvents.map((evt: any) => {
              const isSelected = activeEvent?.id === evt.id;
              return (
                <motion.div
                  key={evt.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    setSelectedEventId(evt.id);
                    handleReplaySeek(evt.frameId);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-panel-bg border-cyan shadow-glow-cyan/20'
                      : evt.isCritical
                      ? 'bg-panel-bg/60 border-crimson/40 hover:border-crimson'
                      : 'bg-panel-bg/40 border-panel-border/60 hover:bg-panel-bg hover:border-slate-500'
                  }`}
                >
                  {/* Left Accent Glow Stripe */}
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                    evt.category === 'cbf' ? 'bg-crimson' : evt.isCritical ? 'bg-amber' : 'bg-cyan'
                  }`} />

                  {/* Header Row */}
                  <div className="flex items-center justify-between gap-2 mb-2 pl-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-cyan" />
                      <span className="font-mono text-xs font-bold text-cyan-300">{evt.timeStr}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Frame #{evt.frameId}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {evt.control.cbfOverride && <Badge variant="danger">CBF OVERRIDE</Badge>}
                      {evt.isCritical && !evt.control.cbfOverride && <Badge variant="warning">CRITICAL</Badge>}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplaySeek(evt.frameId);
                        }}
                        className="p-1 rounded bg-panel-border/40 hover:bg-cyan/20 text-slate-400 hover:text-cyan transition-colors"
                        title="Seek replay to this frame"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Event Title */}
                  <div className="text-sm font-semibold text-white pl-2 mb-3">
                    {evt.title}
                  </div>

                  {/* Causal Step Micro-Pills */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-2 text-[11px] font-mono">
                    <div className="bg-brand-black/60 p-2 rounded border border-panel-border/50">
                      <div className="text-[10px] text-slate-400 uppercase font-sans">Perception</div>
                      <div className="text-white truncate">{evt.perception.actorId} ({evt.perception.distance})</div>
                    </div>

                    <div className="bg-brand-black/60 p-2 rounded border border-panel-border/50">
                      <div className="text-[10px] text-slate-400 uppercase font-sans">RIG / GNN</div>
                      <div className="text-cyan truncate">{evt.reasoning.relation} ({evt.reasoning.confidence})</div>
                    </div>

                    <div className="bg-brand-black/60 p-2 rounded border border-panel-border/50">
                      <div className="text-[10px] text-slate-400 uppercase font-sans">Planner</div>
                      <div className="text-emerald truncate">{evt.planning.replanMs}</div>
                    </div>

                    <div className="bg-brand-black/60 p-2 rounded border border-panel-border/50">
                      <div className="text-[10px] text-slate-400 uppercase font-sans">Actuation</div>
                      <div className={evt.control.cbfOverride ? 'text-crimson font-bold' : 'text-slate-300'}>
                        {parseFloat(evt.control.brake) > 0 ? `Brake: ${evt.control.brake}` : `Thr: ${evt.control.throttle}`}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Deep Causal Chain Inspector */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card
            title="Decision Causality Graph"
            subtitle="Full end-to-end reasoning sequence for selected timestamp"
            badge={<Badge variant="cyan">{activeEvent?.timeStr || 'LIVE'}</Badge>}
            className="flex-1 flex flex-col"
          >
            {activeEvent && (
              <div className="space-y-4 text-xs flex-1">
                {/* Step 1: Perception */}
                <div className="p-3 bg-brand-black/70 rounded-xl border border-panel-border relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-cyan flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan" />
                      1. Sensory Detection & Tracking
                    </span>
                    <Badge variant="outline">UKF Filtered</Badge>
                  </div>
                  <div className="text-slate-300 space-y-1">
                    <div>Observed Entity: <span className="font-mono text-white font-semibold">{activeEvent.perception.actorId}</span> ({activeEvent.perception.type})</div>
                    <div>Corridor Distance: <span className="font-mono text-white">{activeEvent.perception.distance}</span></div>
                  </div>
                </div>

                {/* Arrow Connector */}
                <div className="flex justify-center -my-2 text-cyan">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                {/* Step 2: Intent & GNN */}
                <div className="p-3 bg-brand-black/70 rounded-xl border border-panel-border relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-amber flex items-center gap-1.5">
                      <GitCommit className="w-3.5 h-3.5 text-amber" />
                      2. Road Intent Graph & Risk Field
                    </span>
                    <Badge variant="warning">{activeEvent.reasoning.riskLevel}</Badge>
                  </div>
                  <div className="text-slate-300 space-y-1">
                    <div>Predicted Intent Mode: <span className="font-mono text-amber font-semibold">{activeEvent.reasoning.relation}</span></div>
                    <div>GNN Classification Confidence: <span className="font-mono text-white">{activeEvent.reasoning.confidence}</span></div>
                    <div>Potential Field Peak Risk: <span className="font-mono text-crimson font-bold">{activeEvent.reasoning.riskValue}</span></div>
                  </div>
                </div>

                {/* Arrow Connector */}
                <div className="flex justify-center -my-2 text-amber">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                {/* Step 3: Hybrid A* Planning */}
                <div className="p-3 bg-brand-black/70 rounded-xl border border-panel-border relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-emerald flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-emerald" />
                      3. Kinodynamic Trajectory Optimization
                    </span>
                    <Badge variant="success">OPTIMAL</Badge>
                  </div>
                  <div className="text-slate-300 space-y-1">
                    <div>Planner Algorithm: <span className="font-mono text-white">{activeEvent.planning.algorithm}</span></div>
                    <div>Lookahead Horizon: <span className="font-mono text-white">{activeEvent.planning.horizon}</span></div>
                    <div>Search & Optimization Runtime: <span className="font-mono text-emerald font-bold">{activeEvent.planning.replanMs}</span></div>
                  </div>
                </div>

                {/* Arrow Connector */}
                <div className="flex justify-center -my-2 text-emerald">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                {/* Step 4: Control Barrier Function (CBF) & Actuation */}
                <div className={`p-3 rounded-xl border relative ${
                  activeEvent.control.cbfOverride 
                    ? 'bg-crimson/10 border-crimson/60 text-crimson-100' 
                    : 'bg-brand-black/70 border-panel-border'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-bold flex items-center gap-1.5 ${
                      activeEvent.control.cbfOverride ? 'text-crimson' : 'text-white'
                    }`}>
                      {activeEvent.control.cbfOverride ? <ShieldAlert className="w-3.5 h-3.5 text-crimson" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald" />}
                      4. Safety Barrier Guarantee & Actuation
                    </span>
                    {activeEvent.control.cbfOverride ? <Badge variant="danger">OVERRIDE</Badge> : <Badge variant="success">SAFE</Badge>}
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <div className="flex justify-between font-mono">
                      <span>Throttle: <span className="text-white">{activeEvent.control.throttle}</span></span>
                      <span>Brake: <span className={activeEvent.control.cbfOverride ? 'text-crimson font-bold' : 'text-white'}>{activeEvent.control.brake}</span></span>
                      <span>Steer: <span className="text-white">{activeEvent.control.steering}</span></span>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-panel-border/40">
                      Safety Margin: TTC = {activeEvent.safety.ttc} | Margin = {activeEvent.safety.margin}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
