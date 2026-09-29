import React from 'react';
import { Database, Cpu, Image as ImageIcon, ShieldCheck, CloudSun, Scale, ChevronRight } from 'lucide-react';
import { useApp, PageRoute } from '../../state/AppContext';

export const PipelineWorkflow: React.FC = () => {
  const { state, setActivePage } = useApp();

  const stages = [
    {
      id: 'data',
      page: 'data' as PageRoute,
      name: '1. DATA',
      engine: 'DATA INTEGRITY',
      icon: Database,
      statusText: state.dataset ? (state.dataset.status === 'VERIFIED' ? '✓ VERIFIED' : '⚠ FLAGGED') : 'NOT ANALYZED',
      statusColor: state.dataset?.status === 'VERIFIED' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' : 'text-slate-400 border-slate-700/30 bg-slate-900/20',
      submetric: state.dataset ? `${state.dataset.integrityScore}% Score` : 'No Dataset'
    },
    {
      id: 'model',
      page: 'model' as PageRoute,
      name: '2. MODEL',
      engine: 'MODEL INTEGRITY',
      icon: Cpu,
      statusText: state.model ? (state.model.fingerprintStatus === 'MATCH' && state.model.triggerRisk === 'LOW' ? '✓ VERIFIED' : '✕ ANOMALY') : 'NOT ANALYZED',
      statusColor: state.model?.fingerprintStatus === 'MATCH' && state.model?.triggerRisk === 'LOW' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' : 'text-slate-400 border-slate-700/30 bg-slate-900/20',
      submetric: state.model ? state.model.fingerprintStatus : 'No Model'
    },
    {
      id: 'inference',
      page: 'inference' as PageRoute,
      name: '3. INFERENCE',
      engine: 'INFERENCE OUTPUT',
      icon: ImageIcon,
      statusText: state.inference ? (state.inference.sealStatus === 'VERIFIED' ? '✓ SIGNED' : '✕ TAMPERED') : 'NOT AVAILABLE',
      statusColor: state.inference?.sealStatus === 'VERIFIED' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' : 'text-slate-400 border-slate-700/30 bg-slate-900/20',
      submetric: state.inference ? (state.inference.sealStatus === 'VERIFIED' ? 'Pixel Seal OK' : 'Seal Broken') : 'No Inference'
    },
    {
      id: 'provenance',
      page: 'inference' as PageRoute,
      name: '4. PROVENANCE',
      engine: 'HASH & MERKLE',
      icon: ShieldCheck,
      statusText: state.inference ? (state.inference.sealStatus === 'VERIFIED' ? '✓ CHAIN VALID' : '✕ BROKEN') : 'NOT AVAILABLE',
      statusColor: state.inference?.sealStatus === 'VERIFIED' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' : 'text-slate-400 border-slate-700/30 bg-slate-900/20',
      submetric: state.inference ? 'Ed25519 Bound' : 'Pending'
    },
    {
      id: 'distribution',
      page: 'distribution' as PageRoute,
      name: '5. ENVIRONMENT',
      engine: 'DISTRIBUTION SHIFT',
      icon: CloudSun,
      statusText: state.distribution ? (state.distribution.currentScenario === 'NORMAL' ? '✓ NORMAL' : state.distribution.currentScenario === 'ADVERSARIAL_INPUT' ? '✕ ADVERSARIAL' : '⚠ SHIFT DETECTED') : 'NOT ANALYZED',
      statusColor: state.distribution?.currentScenario === 'NORMAL' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20' : 'text-slate-400 border-slate-700/30 bg-slate-900/20',
      submetric: state.distribution ? `MMD: ${state.distribution.scenarios[state.distribution.currentScenario]?.mmd ?? 0}` : 'No Baseline'
    },
    {
      id: 'governance',
      page: 'overview' as PageRoute,
      name: '6. DECISION',
      engine: 'GOVERNANCE ENGINE',
      icon: Scale,
      statusText: state.governance ? (state.governance.status === 'ACCEPT' ? '✓ ACCEPT' : state.governance.status === 'REVIEW' ? '⚠ REVIEW' : '✕ QUARANTINE') : 'NOT ASSESSED',
      statusColor: state.governance?.status === 'ACCEPT' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]' : 'text-slate-400 border-slate-700/30 bg-slate-900/30',
      submetric: state.governance ? `${state.governance.confidence}% Conf.` : 'Pending Assessment'
    }
  ];

  return (
    <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 sm:p-4 backdrop-blur-md">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            AI Integrity Pipeline Stages
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
          Click stage to inspect
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div
              key={stage.id}
              onClick={() => setActivePage(stage.page)}
              className="group relative cursor-pointer p-2.5 sm:p-3 rounded-lg border border-slate-800 hover:border-cyan-500/50 bg-slate-900/60 hover:bg-slate-800/60 transition-all duration-200 flex flex-col justify-between min-w-0"
            >
              <div>
                <div className="flex items-center justify-between mb-1 min-w-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-cyan-300 transition-colors truncate">
                    {stage.name}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 shrink-0" />
                </div>
                <div className="text-[11px] font-semibold text-slate-200 truncate">
                  {stage.engine}
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/70">
                <div
                  className={`text-[10px] font-bold telemetry-mono rounded px-1.5 py-0.5 border text-center truncate ${stage.statusColor}`}
                >
                  {stage.statusText}
                </div>
                <div className="text-[10px] font-mono text-slate-400 text-center mt-1 truncate">
                  {stage.submetric}
                </div>
              </div>

              {idx < stages.length - 1 && (
                <div className="hidden xl:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
