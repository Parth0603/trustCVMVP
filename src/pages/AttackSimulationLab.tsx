import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { AssessmentWizardModal } from '../components/common/AssessmentWizardModal';

export const AttackSimulationLab: React.FC = () => {
  const { state, setActivePage } = useApp();
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // EMPTY STATE: No dataset uploaded for simulation
  if (!state.dataset || !state.activeAssessmentId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-xl mx-auto text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high/60 border border-surface-container-high flex items-center justify-center mb-6 text-secondary">
          <span className="material-symbols-outlined text-[36px]">science</span>
        </div>
        <div className="text-xs uppercase tracking-wider text-secondary font-semibold mb-1">
          ATTACK SIMULATION LAB
        </div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight mb-2">
          No dataset available for simulation
        </h2>
        <p className="text-sm text-secondary mb-8 max-w-md">
          Upload an actual dataset to evaluate attack resilience, test metamorphic perturbation bounds, and verify defense resistance against real data.
        </p>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-medium text-sm shadow-xs flex items-center gap-2"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>Upload Dataset</span>
        </button>
        <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      </div>
    );
  }

  // Active dataset view with actual evaluated robustness
  return (
    <div className="flex flex-col gap-space-lg w-full max-w-[1200px] mx-auto pb-space-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => setActivePage('overview')}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
            title="Back to Overview"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-on-surface">Attack Resistance Evaluation</h2>
            <p className="text-xs sm:text-sm text-secondary">
              Evaluating vulnerabilities on target dataset: {state.dataset.name}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold border border-outline-variant/30 font-mono">
          Dataset Active: {state.dataset.totalSamples} Images
        </span>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[24px]">verified_user</span>
          <div>
            <span className="text-sm font-semibold text-on-surface">Air-Gapped Evaluation Active</span>
            <p className="text-xs text-secondary mt-0.5">
              The uploaded dataset was analyzed for clean-label poisoning indicators, perceptual hash duplicate flooding, and distribution shift. No synthetic simulation was injected.
            </p>
          </div>
        </div>
      </div>

      <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
};
