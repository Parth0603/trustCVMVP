import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { provenanceApi } from '../services/provenanceApi';
import { ProvenanceResult } from '../services/types';
import { AssessmentWizardModal } from '../components/common/AssessmentWizardModal';

export const InferenceProvenancePage: React.FC = () => {
  const { state, setActivePage } = useApp();
  const [provenanceReport, setProvenanceReport] = useState<ProvenanceResult | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    provenanceApi.getProvenanceReport(state).then(setProvenanceReport);
  }, [state]);

  // EMPTY STATE: No inference record available
  if (!provenanceReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-xl mx-auto text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high/60 border border-surface-container-high flex items-center justify-center mb-6 text-secondary">
          <span className="material-symbols-outlined text-[36px]">verified</span>
        </div>
        <div className="text-xs uppercase tracking-wider text-secondary font-semibold mb-1">
          PROVENANCE
        </div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight mb-2">
          Not available
        </h2>
        <p className="text-sm text-secondary mb-8 max-w-md">
          Run an inference assessment to generate provenance evidence. TRUST-CV produces tamper-evident cryptographic custody chains and digital signatures.
        </p>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-medium text-sm shadow-xs flex items-center gap-2"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Run Assessment</span>
        </button>
        <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      </div>
    );
  }

  // REAL PROVENANCE VIEW
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
            <h2 className="text-xl sm:text-2xl font-semibold text-on-surface">Inference Provenance</h2>
            <p className="text-xs sm:text-sm text-secondary">
              End-to-end cryptographic custody chain for {provenanceReport.frameId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
            provenanceReport.status === 'VERIFIED'
              ? 'bg-secondary-fixed text-on-secondary-fixed border-outline-variant/30'
              : 'bg-rose-100 text-rose-800 border-rose-200'
          }`}>
            Score {provenanceReport.score} / 100
          </span>
          <span className="px-2.5 py-1 rounded bg-surface-container-low text-secondary text-xs font-mono border border-surface-container-high">
            {provenanceReport.latencyMs}ms Latency
          </span>
        </div>
      </div>

      {/* Attested Execution Pipeline Stepper */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface">Attested Execution Pipeline</span>
          <span className="text-xs text-secondary font-mono">FIPS 186-5 Ed25519 &bull; SHA-256</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-space-sm mt-space-md pt-space-xs">
          {provenanceReport.pipelineSteps.map((step, idx) => (
            <React.Fragment key={step.step}>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
                  step.verified ? 'bg-primary text-on-primary' : 'bg-rose-500 text-white'
                }`}>
                  {step.step}
                </span>
                <span className="text-xs font-medium text-on-surface">{step.name}</span>
              </div>
              {idx < provenanceReport.pipelineSteps.length - 1 && (
                <span className="material-symbols-outlined text-secondary text-[16px] hidden sm:inline">
                  trending_flat
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Cryptographic Proof Details */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface">Cryptographic Proof Manifest</span>
          <span className="text-xs text-primary font-mono flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">verified</span> Digital Seal Verified
          </span>
        </div>
        <div className="bg-surface-container-low p-space-md rounded-xl font-mono text-xs flex flex-col gap-3 border border-surface-container-high/60">
          <div>
            <span className="text-secondary block font-sans font-medium">Input Payload Hash (SHA-256):</span>
            <span className="text-on-surface select-all break-all">{provenanceReport.inputFrameHash}</span>
          </div>
          <div>
            <span className="text-secondary block font-sans font-medium">Enclave Signature (Ed25519):</span>
            <span className="text-primary select-all break-all">{provenanceReport.ecdsaAttestation}</span>
          </div>
          <div>
            <span className="text-secondary block font-sans font-medium">Execution Enclave:</span>
            <span className="text-on-surface">{provenanceReport.executionHardware}</span>
          </div>
        </div>
      </div>

      <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
};
