import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { modelApi } from '../services/modelApi';
import { ModelIntegrityResult } from '../services/types';
import { AssessmentWizardModal } from '../components/common/AssessmentWizardModal';

export const ModelIntegrityPage: React.FC = () => {
  const { state, setActivePage } = useApp();
  const [modelReport, setModelReport] = useState<ModelIntegrityResult | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    modelApi.getModelIntegrityReport(state).then(setModelReport);
  }, [state]);

  // EMPTY STATE: No model uploaded / evaluated
  if (!modelReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-xl mx-auto text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high/60 border border-surface-container-high flex items-center justify-center mb-6 text-secondary">
          <span className="material-symbols-outlined text-[36px]">memory</span>
        </div>
        <div className="text-xs uppercase tracking-wider text-secondary font-semibold mb-1">
          MODEL
        </div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight mb-2">
          Not analyzed
        </h2>
        <p className="text-sm text-secondary mb-8 max-w-md">
          Upload a supported model to perform model integrity assessment. TRUST-CV evaluates cryptographic weights, metamorphic invariance, and backdoor trigger risks.
        </p>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-medium text-sm shadow-xs flex items-center gap-2"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>Upload Model</span>
        </button>
        <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      </div>
    );
  }

  // REAL MODEL EVALUATION VIEW
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
            <h2 className="text-xl sm:text-2xl font-semibold text-on-surface">Model Integrity</h2>
            <p className="text-xs sm:text-sm text-secondary">
              Cryptographic weights attestation, backdoor triggers, and metamorphic test bounds
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold border border-outline-variant/30">
            Score {modelReport.score} / 100
          </span>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-3 py-1 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-medium transition-colors shadow-xs flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">upload_file</span>
            <span>Upload Another Model</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high">
          <span className="text-xs text-secondary font-medium">Model Name</span>
          <div className="text-base font-semibold text-on-surface mt-1 truncate">{modelReport.modelTag}</div>
          <span className="text-xs text-secondary mt-1 block font-mono">{modelReport.runtimeVersion}</span>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high">
          <span className="text-xs text-secondary font-medium">Fingerprint Match</span>
          <div className={`text-base font-semibold mt-1 ${modelReport.fingerprintMatch === 'MATCH' ? 'text-emerald-600' : 'text-rose-600'}`}>
            {modelReport.fingerprintMatch === 'MATCH' ? 'MATCH' : 'MISMATCH DETECTED'}
          </div>
          <span className="text-xs text-secondary mt-1 block font-mono">FIPS 180-4 SHA-256</span>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high">
          <span className="text-xs text-secondary font-medium">Behavioral Consistency</span>
          <div className="text-base font-semibold text-primary mt-1">{modelReport.behavioralBounds}</div>
          <span className="text-xs text-secondary mt-1 block font-mono">
            {modelReport.fuzzTestsCompleted}/{modelReport.fuzzTestsTotal} Metamorphic Tests
          </span>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high">
          <span className="text-xs text-secondary font-medium">Trigger Indicators</span>
          <div className={`text-base font-semibold mt-1 ${modelReport.triggerIndicators === 'NONE DETECTED' ? 'text-on-surface' : 'text-amber-600'}`}>
            {modelReport.triggerIndicators}
          </div>
          <span className="text-xs text-secondary mt-1 block">
            {modelReport.triggerIndicators === 'NONE DETECTED' ? 'Zero trojan signatures' : 'Anomalous cluster flagged'}
          </span>
        </div>
      </div>

      {/* Cryptographic Weights Notarization */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-sm font-semibold text-on-surface">Cryptographic Weights Digest</span>
            <p className="text-xs text-secondary mt-0.5">Calculated from the uploaded ONNX/binary model file</p>
          </div>
          <span className="text-xs text-primary font-mono flex items-center gap-1 font-medium bg-surface-container-low px-2.5 py-1 rounded-full border border-surface-container-high">
            <span className="material-symbols-outlined text-[16px]">verified</span> Verified Authentic
          </span>
        </div>
        <div className="mt-space-md bg-surface-container-low p-space-md rounded-xl font-mono text-xs flex flex-col gap-2 border border-surface-container-high/60">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-secondary gap-1">
            <span className="font-sans font-medium text-secondary">SHA-256 (Model Digest):</span>
            <span className="text-on-surface font-mono font-medium select-all break-all">{modelReport.sha256Digest}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-secondary gap-1">
            <span className="font-sans font-medium text-secondary">Signed By Authority:</span>
            <span className="text-on-surface font-mono">{modelReport.signedBy}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-secondary gap-1">
            <span className="font-sans font-medium text-secondary">Hardware Enclave Seal:</span>
            <span className="text-primary font-mono font-semibold">{modelReport.tpmSeal}</span>
          </div>
        </div>
      </div>

      {/* Structural Behavioral Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">TEST 1</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {modelReport.patchTriggerScan.status}
              </span>
            </div>
            <div className="text-sm font-semibold text-on-surface mt-2">Metamorphic Transform Invariance</div>
            <p className="text-xs text-secondary mt-1 leading-relaxed">
              {modelReport.patchTriggerScan.detail}
            </p>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">TEST 2</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {modelReport.weightBitFlipTest.status}
              </span>
            </div>
            <div className="text-sm font-semibold text-on-surface mt-2">Weight Parity Affirmation</div>
            <p className="text-xs text-secondary mt-1 leading-relaxed">
              {modelReport.weightBitFlipTest.detail}
            </p>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">TEST 3</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {modelReport.quantizationInvariance.status}
              </span>
            </div>
            <div className="text-sm font-semibold text-on-surface mt-2">Dynamic Range Invariance</div>
            <p className="text-xs text-secondary mt-1 leading-relaxed">
              {modelReport.quantizationInvariance.detail}
            </p>
          </div>
        </div>
      </div>

      <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
};
