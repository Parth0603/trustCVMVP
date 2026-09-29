import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { distributionApi } from '../services/distributionApi';
import { DistributionShiftResult } from '../services/types';
import { EvidenceDrawer } from '../components/common/EvidenceDrawer';
import { AssessmentWizardModal } from '../components/common/AssessmentWizardModal';

export const DistributionShiftPage: React.FC = () => {
  const { state, setActivePage } = useApp();
  const [shiftReport, setShiftReport] = useState<DistributionShiftResult | null>(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    distributionApi.getDistributionShiftReport(state).then(setShiftReport);
  }, [state]);

  // EMPTY STATE: No reference baseline provided / not analyzed
  if (!shiftReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-xl mx-auto text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high/60 border border-surface-container-high flex items-center justify-center mb-6 text-secondary">
          <span className="material-symbols-outlined text-[36px]">compare_arrows</span>
        </div>
        <div className="text-xs uppercase tracking-wider text-secondary font-semibold mb-1">
          DISTRIBUTION SHIFT
        </div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight mb-2">
          Not analyzed
        </h2>
        <p className="text-sm text-secondary mb-8 max-w-md">
          Upload a reference dataset to compare distributions. TRUST-CV calculates mathematical divergence metrics (Maximum Mean Discrepancy &amp; Wasserstein Distance) between reference and incoming streams.
        </p>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-medium text-sm shadow-xs flex items-center gap-2"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>Upload Reference Dataset</span>
        </button>
        <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      </div>
    );
  }

  // REAL DISTRIBUTION SHIFT VIEW
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
            <h2 className="text-xl sm:text-2xl font-semibold text-on-surface">Distribution Shift Analysis</h2>
            <p className="text-xs sm:text-sm text-secondary">
              Real mathematical divergence: Reference Dataset vs. Uploaded Current Dataset
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
            shiftReport.riskScore > 30
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
          }`}>
            Shift Risk Score {shiftReport.riskScore}
          </span>
        </div>
      </div>

      {/* Dataset Comparison Header Card */}
      <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-surface-container-low text-primary">
            <span className="material-symbols-outlined text-[20px]">layers</span>
          </div>
          <div>
            <span className="text-xs text-secondary font-medium block">COMPARISON BASIS</span>
            <span className="text-sm font-semibold text-on-surface">Reference Baseline vs. Target Dataset</span>
          </div>
        </div>
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
          Calculated Divergence Active
        </span>
      </div>

      {/* Root Cause Alert */}
      <div className="p-space-md rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-space-md">
        <span className="material-symbols-outlined text-amber-700 text-[24px] shrink-0 mt-0.5">info</span>
        <div>
          <span className="text-sm font-semibold text-on-surface">{shiftReport.findingTitle}</span>
          <p className="text-xs text-secondary mt-1 leading-relaxed">
            {shiftReport.findingDescription}
          </p>
          <div className="mt-2 text-[11px] text-amber-800 font-medium">
            Core Governance Rule: Natural environmental shift calls for operator gain calibration, while model tampering calls for quarantine.
          </div>
        </div>
      </div>

      {/* Statistical Distance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high">
          <span className="text-xs text-secondary font-medium">Maximum Mean Discrepancy (MMD)</span>
          <div className="text-base font-semibold text-on-surface mt-1">
            {shiftReport.mmd} <span className="text-xs text-secondary font-normal">(Threshold: {shiftReport.mmdThreshold})</span>
          </div>
          <span className="text-xs text-secondary mt-1 block">
            {shiftReport.mmd > shiftReport.mmdThreshold ? 'Shift detected above safety limit' : 'Feature divergence within bounds'}
          </span>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high">
          <span className="text-xs text-secondary font-medium">Wasserstein-1 Distance</span>
          <div className="text-base font-semibold text-on-surface mt-1">{shiftReport.wasserstein}</div>
          <span className="text-xs text-secondary mt-1 block">1D optimal transport cost</span>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high">
          <span className="text-xs text-secondary font-medium">Adversarial Risk Probability</span>
          <div className="text-base font-semibold text-primary mt-1">{(shiftReport.adversarialRisk * 100).toFixed(1)}%</div>
          <span className="text-xs text-secondary mt-1 block">
            {shiftReport.adversarialRisk < 0.05 ? 'Natural domain variance' : 'Targeted perturbation risk'}
          </span>
        </div>
      </div>

      {/* Recommended Action */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high">
        <span className="text-sm font-semibold text-on-surface">Recommended Mitigation</span>
        <p className="text-xs text-secondary mt-1.5 leading-relaxed">
          {shiftReport.recommendedMitigation}
        </p>
      </div>

      <EvidenceDrawer isOpen={isEvidenceOpen} onClose={() => setIsEvidenceOpen(false)} />
      <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
};
