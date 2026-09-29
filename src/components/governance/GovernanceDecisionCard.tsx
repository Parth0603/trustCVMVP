import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Clock, Cpu, CheckCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { StatusBadge } from '../common/StatusBadge';

interface GovernanceDecisionCardProps {
  className?: string;
}

export const GovernanceDecisionCard: React.FC<GovernanceDecisionCardProps> = ({
  className = ''
}) => {
  const { state } = useApp();
  const { governance } = state;

  if (!governance) {
    return (
      <div className={`rounded-xl border border-slate-800 bg-slate-900/60 p-5 text-center text-xs text-slate-400 ${className}`}>
        No assessment available. Upload a dataset to begin.
      </div>
    );
  }

  const decisionConfig = {
    ACCEPT: {
      title: 'GOVERNANCE: ACCEPT',
      subtitle: 'ALL TRUST BOUNDARIES FULLY VERIFIED',
      icon: ShieldCheck,
      borderColor: 'border-emerald-500/50',
      bgGlow: 'bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-slate-950',
      glowRing: 'shadow-[0_0_25px_rgba(16,185,129,0.15)]',
      statusColor: 'text-emerald-400'
    },
    REVIEW: {
      title: 'GOVERNANCE: REVIEW REQUIRED',
      subtitle: 'ANALYST ASSESSMENT • NON-MALICIOUS DRIFT',
      icon: ShieldAlert,
      borderColor: 'border-amber-500/50',
      bgGlow: 'bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-950',
      glowRing: 'shadow-[0_0_25px_rgba(245,158,11,0.15)]',
      statusColor: 'text-amber-400'
    },
    QUARANTINE: {
      title: 'GOVERNANCE: QUARANTINE ENACTED',
      subtitle: 'CRITICAL TRUST BREACH • BITSTREAM ISOLATED',
      icon: ShieldX,
      borderColor: 'border-rose-500/60',
      bgGlow: 'bg-gradient-to-br from-rose-950/50 via-slate-900/90 to-slate-950',
      glowRing: 'shadow-[0_0_30px_rgba(239,68,68,0.25)]',
      statusColor: 'text-rose-400'
    }
  }[governance.status];

  const Icon = decisionConfig.icon;

  return (
    <div
      className={`relative rounded-xl border ${decisionConfig.borderColor} ${decisionConfig.bgGlow} ${decisionConfig.glowRing} p-4 sm:p-5 backdrop-blur-md transition-all duration-300 min-w-0 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg border ${decisionConfig.borderColor} bg-slate-950/70 shrink-0`}>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${decisionConfig.statusColor}`} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-black tracking-wide text-white telemetry-mono truncate">
                {decisionConfig.title}
              </h3>
              <StatusBadge status={governance.status} type="decision" size="sm" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
              {decisionConfig.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs telemetry-mono text-slate-400 shrink-0 flex-wrap">
          <div className="px-2 py-0.5 rounded bg-slate-950/90 border border-slate-800 text-[11px]">
            <span className="text-slate-500 mr-1.5">FUSION CONFIDENCE:</span>
            <span className={`font-bold ${decisionConfig.statusColor}`}>{governance.confidence}%</span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-[10px] sm:text-[11px]">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{governance.timestamp}</span>
          </div>
        </div>
      </div>

      {/* Decision Rationale */}
      <div className="mt-3 space-y-2.5 min-w-0">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-cyan-400 shrink-0" />
            Consensus Decision Rationale
          </div>
          <p className="text-xs text-slate-200 font-medium bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
            {governance.reason}
          </p>
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Cryptographic &amp; Statistical Evidence:
          </div>
          <ul className="grid grid-cols-1 gap-1.5">
            {governance.evidence.map((ev, idx) => (
              <li
                key={idx}
                className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/50 px-2.5 py-1.5 rounded border border-slate-800/60 min-w-0"
              >
                {governance.status === 'ACCEPT' ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                      governance.status === 'QUARANTINE' ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  />
                )}
                <span className="text-[11px] leading-relaxed truncate">{ev}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
