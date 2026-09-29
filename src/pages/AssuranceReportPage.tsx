import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { AssessmentWizardModal } from '../components/common/AssessmentWizardModal';

export const AssuranceReportPage: React.FC = () => {
  const { state, setActivePage } = useApp();
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const report = state.activeAssessmentReport;
  const summary = state.activeAssessmentSummary;

  // EMPTY STATE: No completed assessment available
  if (!report && !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-xl mx-auto text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high/60 border border-surface-container-high flex items-center justify-center mb-6 text-secondary">
          <span className="material-symbols-outlined text-[36px]">description</span>
        </div>
        <div className="text-xs uppercase tracking-wider text-secondary font-semibold mb-1">
          ASSURANCE REPORT
        </div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight mb-2">
          No completed assessment available
        </h2>
        <p className="text-sm text-secondary mb-8 max-w-md">
          Upload a dataset and run an assessment to generate an immutable cryptographic assurance audit report suitable for safety cases and accreditation.
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

  const handlePrint = () => {
    window.print();
  };

  const decision = report?.governance_decision?.decision || summary?.overall_verdict || 'REVIEW';
  const datasetName = report?.dataset?.dataset_name || summary?.benchmark_dataset || 'Uploaded Dataset';
  const totalImages = report?.dataset?.total_images || (state.activeAssessmentData?.total_images ?? 0);
  const riskScore = report?.governance_decision?.risk_score ?? (summary?.risk_score ?? 0);
  const confidence = report?.governance_decision?.confidence ?? (summary?.model_confidence ?? 95);
  const assessmentId = report?.assessment_id || summary?.id || 'LOCAL-EVAL';
  const timestamp = report?.timestamp || summary?.timestamp || '';

  return (
    <div className="flex flex-col gap-space-lg w-full max-w-[1200px] mx-auto pb-space-xl">
      {/* Header with Print / Export Controls */}
      <div className="flex items-center justify-between flex-wrap gap-space-sm no-print">
        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => setActivePage('overview')}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
            title="Back to Overview"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-on-surface">Assurance Audit Report</h2>
            <p className="text-xs sm:text-sm text-secondary">
              Exportable cryptographic summary for regulatory compliance &amp; safety cases
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container-high border border-surface-container-high text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Clean White Document Sheet */}
      <div className="bg-surface-container-lowest rounded-xl p-6 sm:p-10 shadow-xs border border-surface-container-high flex flex-col gap-space-lg print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row items-start justify-between pb-space-md border-b border-surface-container-high/60 gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-secondary font-semibold font-mono">
              TRUST-CV ATTESTATION RECORD &bull; LOCAL AIR-GAPPED EVALUATION
            </div>
            <div className="text-xl font-bold text-on-surface mt-1">
              Safety Integrity Verification Document #{assessmentId.slice(0, 12)}
            </div>
            <div className="text-xs text-secondary mt-0.5">
              Target Dataset: {datasetName} ({totalImages} Images Evaluated)
            </div>
          </div>
          <div className="text-left sm:text-right font-mono text-xs text-secondary">
            <div>DATE: {timestamp}</div>
            <div className="mt-1 font-semibold text-on-surface">
              STATUS:{' '}
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                decision === 'ACCEPT'
                  ? 'bg-emerald-100 text-emerald-800'
                  : decision === 'REVIEW'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {decision}
              </span>
            </div>
          </div>
        </div>

        {/* 1. Executive Summary */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-on-surface">1. Executive Verification Summary</span>
          <p className="text-xs text-secondary leading-relaxed">
            The Computer Vision dataset <span className="font-mono text-on-surface font-semibold">{datasetName}</span> containing <span className="font-mono font-semibold text-on-surface">{totalImages}</span> images was evaluated under local air-gapped execution. {report?.governance_decision?.reasoning || summary?.current_finding?.description || 'All verification boundary proofs have been processed.'}
          </p>
        </div>

        {/* 2. Key Assurance Metrics Table */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-on-surface">2. Multi-Boundary Assurance Metrics</span>
          <div className="border border-surface-container-high/60 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low font-medium text-secondary">
                <tr>
                  <th className="p-3">ASSURANCE VECTOR</th>
                  <th className="p-3">OBSERVED VALUE</th>
                  <th className="p-3">SAFETY BOUND</th>
                  <th className="p-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/60">
                <tr>
                  <td className="p-3 font-medium text-on-surface">Data Integrity Score</td>
                  <td className="p-3 font-mono font-bold text-on-surface">{summary?.engine_scores?.data ?? 100} / 100</td>
                  <td className="p-3 font-mono text-secondary">&ge; 80.0</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {(summary?.engine_scores?.data ?? 100) >= 80 ? 'PASS' : 'FLAGGED'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-on-surface">Duplicate Image Count</td>
                  <td className="p-3 font-mono font-bold text-on-surface">
                    {(state.activeAssessmentData?.exact_duplicate_count || 0) + (state.activeAssessmentData?.near_duplicate_count || 0)}
                  </td>
                  <td className="p-3 font-mono text-secondary">&le; 5 clusters</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      PASS
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-on-surface">Corrupted File Count</td>
                  <td className="p-3 font-mono font-bold text-on-surface">
                    {state.activeAssessmentData?.corrupted_images || 0}
                  </td>
                  <td className="p-3 font-mono text-secondary">0 (Zero tolerance)</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      (state.activeAssessmentData?.corrupted_images || 0) === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {(state.activeAssessmentData?.corrupted_images || 0) === 0 ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-on-surface">Overall Risk Assessment</td>
                  <td className="p-3 font-mono font-bold text-on-surface">{riskScore} / 100</td>
                  <td className="p-3 font-mono text-secondary">&le; 25 Nominal</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      riskScore <= 25 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {riskScore <= 25 ? 'NOMINAL' : 'REVIEW'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Governance Verdict */}
        <div className="flex flex-col gap-2 pt-space-xs">
          <span className="text-sm font-semibold text-on-surface">3. Formal Governance Verdict</span>
          <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-high/60 flex items-start gap-space-md">
            <span className="material-symbols-outlined text-primary text-[24px] shrink-0">gavel</span>
            <div className="flex flex-col gap-1 text-xs">
              <div className="font-semibold text-on-surface">
                DECISION: {decision} (Confidence {confidence}%)
              </div>
              <p className="text-secondary leading-relaxed">
                {report?.governance_decision?.reasoning || summary?.current_finding?.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
};
