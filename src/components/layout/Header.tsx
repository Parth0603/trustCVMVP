import React from 'react';
import { useApp } from '../../state/AppContext';

interface HeaderProps {
  onOpenWizard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenWizard }) => {
  const { state, activePage, backendStatus, wakeUpElapsed, wakeUpBackend } = useApp();

  const getPageTitle = () => {
    switch (activePage) {
      case 'overview': return 'Overview';
      case 'data': return 'Data Integrity';
      case 'model': return 'Model Integrity';
      case 'inference': return 'Inference Provenance';
      case 'distribution': return 'Distribution Shift';
      case 'contributors': return 'Contributor Trust';
      case 'attack-lab': return 'Simulation Lab';
      case 'audit': return 'Audit Vault';
      case 'report': return 'Assurance Report';
      default: return 'Integrity Layer';
    }
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-14 bg-surface-container-lowest/90 backdrop-blur-md border-b border-surface-container-high z-40 px-space-lg flex items-center justify-between">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-space-md">
        <div className="flex items-center gap-1.5 text-sm text-secondary">
          <span className="text-on-surface font-semibold">Platform</span>
          <span className="text-outline-variant">/</span>
          <span className="text-on-surface-variant font-medium">{getPageTitle()}</span>
        </div>
      </div>

      {/* Right Telemetry & Actions */}
      <div className="flex items-center gap-space-md">
        {/* Engine Status & Wake-up Button */}
        {backendStatus === 'connected' ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono">Engine Online</span>
          </div>
        ) : backendStatus === 'waking' ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-medium shadow-xs">
            <span className="material-symbols-outlined text-[15px] animate-spin text-amber-700">sync</span>
            <span>Waking Engine... ({wakeUpElapsed}s)</span>
          </div>
        ) : (
          <button
            onClick={() => wakeUpBackend()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high hover:bg-surface-container text-on-surface border border-outline-variant text-xs font-medium transition-colors shadow-xs"
            title="Render free tier container may be sleeping. Click to wake up."
            type="button"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <span className="text-secondary">Engine Asleep</span>
            <span className="text-primary font-semibold flex items-center gap-0.5 ml-1">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span>Wake Up</span>
            </span>
          </button>
        )}

        {/* Context metadata telemetry */}
        <div className="hidden xl:flex items-center gap-space-md border-l border-surface-container-high pl-space-md text-xs text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="text-outline">Assessment:</span>
            <span className="text-on-surface font-mono font-medium">{state.dataset?.name || 'No Dataset'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-outline">Model:</span>
            <span className="text-on-surface font-mono font-medium">{state.model?.modelName || 'No Model'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-outline">Pipeline:</span>
            <span className="text-on-surface font-mono font-medium">Air-Gapped</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-space-sm">
          <button
            onClick={onOpenWizard}
            className="flex items-center gap-1.5 bg-primary text-on-primary hover:bg-primary-container px-3 py-1.5 rounded-lg transition-colors text-sm font-medium shadow-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>New Assessment</span>
          </button>

          <div
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-xs"
            title="Assurance Officer / Analyst"
          >
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  );
};
