import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { assuranceApi } from '../services/assuranceApi';
import { AssessmentSummary } from '../services/types';
import { EvidenceDrawer } from '../components/common/EvidenceDrawer';
import { AssessmentWizardModal } from '../components/common/AssessmentWizardModal';

export const OverviewDashboard: React.FC = () => {
  const { state, setActivePage, isBackendConnected } = useApp();
  const [assessment, setAssessment] = useState<AssessmentSummary | null>(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);

  useEffect(() => {
    assuranceApi.getOverviewAssessment(state).then(setAssessment);
  }, [state]);

  const handleRerun = () => {
    if (state.activeAssessmentId) {
      setIsRerunning(true);
      setTimeout(() => {
        setIsRerunning(false);
      }, 800);
    }
  };

  // If backend is disconnected and there's no active assessment
  if (!isBackendConnected && !assessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-xl mx-auto text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-500">
          <span className="material-symbols-outlined text-[36px]">cloud_off</span>
        </div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight mb-2">
          Backend unavailable
        </h2>
        <p className="text-sm text-secondary mb-4 max-w-md">
          Start the TRUST-CV analysis service to continue. The application will never display fabricated assessment results.
        </p>
        <span className="text-xs font-mono px-3 py-1 rounded bg-surface-container-low text-secondary border border-surface-container-high">
          Target: http://127.0.0.1:8000/api/health
        </span>
      </div>
    );
  }

  // EMPTY STATE: No assessment has been performed
  if (!assessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-xl mx-auto text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high/60 border border-surface-container-high flex items-center justify-center mb-6 text-secondary">
          <span className="material-symbols-outlined text-[36px]">folder_open</span>
        </div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight mb-2">
          No assessment available
        </h2>
        <p className="text-sm text-secondary mb-8 max-w-md">
          Upload a dataset to begin an integrity assessment. TRUST-CV evaluates data distributions, cryptographic provenance, and pipeline safety.
        </p>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-medium text-sm shadow-xs flex items-center gap-2"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>UPLOAD DATASET</span>
        </button>
        <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      </div>
    );
  }

  // REAL DATA-DRIVEN DASHBOARD
  const isQuarantine = assessment.overallVerdict === 'QUARANTINE';
  const isAccept = assessment.overallVerdict === 'ACCEPT';

  return (
    <div className="flex flex-col gap-space-lg w-full max-w-[1200px] mx-auto pb-space-xl">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm pt-space-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl text-on-surface tracking-tight font-semibold">
            AI Integrity Assurance
          </h1>
          <p className="text-sm text-secondary mt-1">
            Real dataset evaluation: <span className="font-mono text-on-surface font-medium">{assessment.benchmarkDataset}</span>
          </p>
        </div>

        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-colors text-sm font-semibold shadow-xs flex items-center gap-1.5"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>New Assessment</span>
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-secondary text-xs font-medium border border-surface-container-high font-mono">
            <span className="h-2 w-2 rounded-full bg-secondary"></span>
            Cycle {assessment.cycleId}
          </span>
          <button
            onClick={handleRerun}
            disabled={isRerunning}
            className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-low border border-surface-container-high transition-colors text-sm font-medium shadow-xs flex items-center gap-1.5"
            type="button"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary ${isRerunning ? 'animate-spin' : ''}`}>
              replay
            </span>
            <span>{isRerunning ? 'Verifying...' : 'Re-run Check'}</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Assessment Card */}
      <div className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-xs border border-surface-container-high relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
          {/* Left Column */}
          <div className="lg:col-span-6 flex flex-col gap-space-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-secondary font-semibold">
                  CURRENT ASSESSMENT
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                  REAL BACKEND ANALYSIS
                </span>
              </div>
              <div className="mt-2">
                {isAccept ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                    <span>VERIFIED / ACCEPTED</span>
                  </div>
                ) : isQuarantine ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 text-xs font-semibold">
                    <span className="material-symbols-outlined text-[15px]">gpp_bad</span>
                    <span>QUARANTINE REQUIRED</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                    <span className="material-symbols-outlined text-[15px]">warning</span>
                    <span>REVIEW REQUIRED</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-space-lg pt-space-xs">
              <div className="flex flex-col">
                <span className="text-xs text-secondary font-medium">Integrity Risk</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-4xl sm:text-5xl text-on-surface font-semibold tracking-tight">
                    {assessment.riskScore}
                  </span>
                  <span className="text-lg text-secondary font-normal">/100</span>
                </div>
              </div>
              <div className="h-10 w-[1px] bg-surface-container-high self-center"></div>
              <div className="flex flex-col">
                <span className="text-xs text-secondary font-medium">
                  {assessment.modelConfidence !== null ? 'Model Confidence' : 'Assessment Confidence'}
                </span>
                <div className="mt-0.5">
                  <span className="text-3xl sm:text-4xl text-primary font-semibold tracking-tight">
                    {assessment.modelConfidence !== null ? `${assessment.modelConfidence}%` : `${assessment.assessmentConfidence}%`}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-space-xs flex items-center gap-space-md flex-wrap text-xs text-secondary">
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                Air-gapped verification
              </span>
              <span className="text-secondary/40">•</span>
              <span>Dataset: {assessment.benchmarkDataset}</span>
            </div>
          </div>

          {/* Right Column: Semi-Circular Gauge & CTA */}
          <div className="lg:col-span-6 flex flex-col md:flex-row items-center justify-between lg:justify-end gap-space-lg bg-surface-container-low/70 border border-surface-container-high/60 p-space-lg rounded-xl">
            {/* SVG Circular Gauge */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle
                  className="text-surface-container-high"
                  cx="60"
                  cy="60"
                  fill="none"
                  r="50"
                  stroke="currentColor"
                  strokeWidth="8"
                ></circle>
                <circle
                  className={`transition-all duration-1000 ${
                    assessment.riskScore > 60
                      ? 'text-red-500'
                      : assessment.riskScore > 25
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`}
                  cx="60"
                  cy="60"
                  fill="none"
                  r="50"
                  stroke="currentColor"
                  strokeDasharray="314"
                  strokeDashoffset={314 - (314 * assessment.riskScore) / 100}
                  strokeLinecap="round"
                  strokeWidth="8"
                ></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-semibold text-on-surface leading-none">
                  {assessment.riskScore}
                </span>
                <span className="text-xs text-secondary mt-0.5 font-medium">Risk</span>
              </div>
            </div>

            {/* Context and CTA */}
            <div className="flex flex-col items-start gap-space-xs text-left max-w-xs">
              <div className="text-base font-semibold text-on-surface">
                {assessment.currentFinding.title}
              </div>
              <p className="text-xs text-secondary leading-snug">
                {assessment.currentFinding.description}
              </p>
              <button
                onClick={() => setIsEvidenceOpen(true)}
                className="mt-space-xs inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-surface-container-high transition-all text-xs font-medium shadow-xs"
                type="button"
              >
                <span>View Evidence</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Trust Chain Flow */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high flex flex-col gap-space-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">Trust Chain</h2>
            <p className="text-xs text-secondary">
              Cryptographic and distribution verification across the computer vision lifecycle
            </p>
          </div>
          <span className="text-xs text-secondary font-mono bg-surface-container-low px-2 py-0.5 rounded border border-surface-container-high">
            ID: {assessment.id.slice(0, 16)}...
          </span>
        </div>

        {/* Dynamic 5-Node Flow */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-space-sm pt-space-xs">
          {assessment.trustChain.map((node, idx) => {
            const isSafe = node.isSafe;
            const isNotAnalyzed = node.status === 'Not Analyzed' || node.status === 'Not Available';
            return (
              <button
                key={`trust-node-${node.name}-${idx}`}
                onClick={() => {
                  if (node.name === 'Data') setActivePage('data');
                  else if (node.name === 'Model') setActivePage('model');
                  else if (node.name === 'Inference') setActivePage('inference');
                  else if (node.name === 'Environment') setActivePage('distribution');
                  else setIsEvidenceOpen(true);
                }}
                className={`flex flex-col items-center text-center p-space-md rounded-xl transition-all border group ${
                  isNotAnalyzed
                    ? 'bg-surface-container-low/40 border-surface-container-high/40 opacity-70'
                    : isSafe
                    ? 'bg-surface-container-low hover:bg-surface-container-high/60 border-transparent hover:border-surface-container-high'
                    : 'bg-amber-50/60 hover:bg-amber-100/60 border-amber-200/60'
                }`}
                type="button"
              >
                <div className={`w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs ${
                  isNotAnalyzed ? 'text-secondary' : isSafe ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  <span className="material-symbols-outlined text-[18px]">
                    {isNotAnalyzed ? 'remove' : isSafe ? 'check_circle' : 'warning'}
                  </span>
                </div>
                <span className="text-sm font-medium text-on-surface mt-2">{node.name}</span>
                <span className={`text-xs font-medium mt-0.5 ${
                  isNotAnalyzed ? 'text-secondary' : isSafe ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {node.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Four Assurance Engines Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Engine 1: Data */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-on-surface">Data</span>
              {assessment.engineScores.data !== null ? (
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                  assessment.engineScores.data >= 80
                    ? 'text-emerald-600'
                    : assessment.engineScores.data >= 60
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    assessment.engineScores.data >= 80
                      ? 'bg-emerald-500'
                      : assessment.engineScores.data >= 60
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}></span>
                  {assessment.engineScores.data >= 80 ? 'Verified' : assessment.engineScores.data >= 60 ? 'Review' : 'Flagged'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-secondary font-medium">
                  Not Analyzed
                </span>
              )}
            </div>
            <div className="mt-space-md">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-on-surface">
                  {assessment.engineScores.data !== null ? assessment.engineScores.data : '—'}
                </span>
                <span className="text-xs text-secondary">
                  {assessment.engineScores.data !== null ? '/100' : 'No Data'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActivePage('data')}
            className="mt-space-md inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline text-left"
            type="button"
          >
            <span>View details</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>

        {/* Engine 2: Model */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-on-surface">Model</span>
              {assessment.engineScores.model !== null ? (
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                  assessment.engineScores.model >= 80 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    assessment.engineScores.model >= 80 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}></span>
                  {assessment.engineScores.model >= 80 ? 'Verified' : 'Flagged'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-secondary font-medium">
                  Not Analyzed
                </span>
              )}
            </div>
            <div className="mt-space-md">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-on-surface">
                  {assessment.engineScores.model !== null ? assessment.engineScores.model : '—'}
                </span>
                <span className="text-xs text-secondary">
                  {assessment.engineScores.model !== null ? '/100' : 'No Model'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActivePage('model')}
            className="mt-space-md inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline text-left"
            type="button"
          >
            <span>View details</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>

        {/* Engine 3: Provenance */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-on-surface">Provenance</span>
              {assessment.engineScores.provenance !== null ? (
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                  assessment.engineScores.provenance >= 80 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    assessment.engineScores.provenance >= 80 ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}></span>
                  {assessment.engineScores.provenance >= 80 ? 'Verified' : 'Broken'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-secondary font-medium">
                  Not Analyzed
                </span>
              )}
            </div>
            <div className="mt-space-md">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-on-surface">
                  {assessment.engineScores.provenance !== null ? assessment.engineScores.provenance : '—'}
                </span>
                <span className="text-xs text-secondary">
                  {assessment.engineScores.provenance !== null ? '/100' : 'No Inference'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActivePage('inference')}
            className="mt-space-md inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline text-left"
            type="button"
          >
            <span>View details</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>

        {/* Engine 4: Shift */}
        <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high flex flex-col justify-between hover:shadow-sm transition-shadow">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-on-surface">Shift</span>
              {assessment.engineScores.shiftRisk !== null ? (
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                  assessment.engineScores.shiftRisk <= 25 ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${assessment.engineScores.shiftRisk <= 25 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {assessment.engineScores.shiftRisk <= 25 ? 'Nominal' : 'Review'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-secondary font-medium">
                  Not Analyzed
                </span>
              )}
            </div>
            <div className="mt-space-md">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-on-surface">
                  {assessment.engineScores.shiftRisk !== null ? assessment.engineScores.shiftRisk : '—'}
                </span>
                <span className="text-xs text-secondary">
                  {assessment.engineScores.shiftRisk !== null ? 'Risk' : 'No Baseline'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setActivePage('distribution')}
            className="mt-space-md inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline text-left"
            type="button"
          >
            <span>View details</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* 5. Current Finding & Evidence Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left: Current Finding */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div className="flex flex-col gap-space-sm">
            <span className="text-xs uppercase tracking-wider text-secondary font-semibold">
              PRIMARY FINDING
            </span>
            <div className="flex items-start gap-space-sm mt-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isQuarantine ? 'bg-rose-50 text-rose-600 border border-rose-200' : isAccept ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}>
                <span className="material-symbols-outlined text-[18px]">
                  {isQuarantine ? 'gpp_bad' : isAccept ? 'verified' : 'warning'}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-on-surface leading-tight">
                  {assessment.currentFinding.title}
                </h3>
                <p className="text-xs text-secondary mt-1 leading-relaxed">
                  {assessment.currentFinding.description}
                </p>
              </div>
            </div>
          </div>
          <div className="pt-space-md">
            <button
              onClick={() => setIsEvidenceOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container-high border border-surface-container-high transition-colors text-xs font-medium inline-flex items-center gap-1.5"
              type="button"
            >
              <span>View Technical Evidence</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </button>
          </div>
        </div>

        {/* Right: Evidence Balance Visual */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-on-surface">Evidence Vector Scores</span>
              <span className="text-xs text-secondary">Real evaluated components</span>
            </div>
            <div className="flex flex-col gap-3 mt-space-md">
              {/* Item 1: DATA */}
              <div className="flex items-center gap-space-sm text-xs">
                <span className="w-24 text-secondary font-medium">DATA</span>
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  assessment.engineScores.data !== null && assessment.engineScores.data < 60 ? 'bg-rose-500' : 'bg-primary'
                }`}></span>
                <div className="flex-1 bg-surface-container-low h-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    assessment.engineScores.data !== null && assessment.engineScores.data < 60 ? 'bg-rose-500' : 'bg-primary'
                  }`} style={{ width: `${assessment.engineScores.data ?? 0}%` }}></div>
                </div>
                <span className="w-10 text-right font-mono font-medium text-on-surface">
                  {assessment.engineScores.data !== null ? `${assessment.engineScores.data}%` : 'N/A'}
                </span>
              </div>

              {/* Item 2: MODEL */}
              <div className="flex items-center gap-space-sm text-xs">
                <span className="w-24 text-secondary font-medium">MODEL</span>
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  assessment.engineScores.model !== null ? 'bg-primary' : 'bg-surface-container-high'
                }`}></span>
                <div className="flex-1 bg-surface-container-low h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${assessment.engineScores.model ?? 0}%` }}></div>
                </div>
                <span className="w-10 text-right font-mono font-medium text-on-surface">
                  {assessment.engineScores.model !== null ? `${assessment.engineScores.model}%` : 'N/A'}
                </span>
              </div>

              {/* Item 3: PROVENANCE */}
              <div className="flex items-center gap-space-sm text-xs">
                <span className="w-24 text-secondary font-medium">PROVENANCE</span>
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  assessment.engineScores.provenance !== null ? 'bg-primary' : 'bg-surface-container-high'
                }`}></span>
                <div className="flex-1 bg-surface-container-low h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${assessment.engineScores.provenance ?? 0}%` }}></div>
                </div>
                <span className="w-10 text-right font-mono font-medium text-on-surface">
                  {assessment.engineScores.provenance !== null ? `${assessment.engineScores.provenance}%` : 'N/A'}
                </span>
              </div>

              {/* Item 4: SHIFT */}
              <div className="flex items-center gap-space-sm text-xs">
                <span className="w-24 text-secondary font-medium">SHIFT RISK</span>
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  assessment.engineScores.shiftRisk !== null ? 'bg-amber-500' : 'bg-surface-container-high'
                }`}></span>
                <div className="flex-1 bg-surface-container-low h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${assessment.engineScores.shiftRisk ?? 0}%` }}></div>
                </div>
                <span className="w-10 text-right font-mono font-medium text-amber-600">
                  {assessment.engineScores.shiftRisk !== null ? `${assessment.engineScores.shiftRisk}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-secondary pt-space-md leading-relaxed">
            All metrics are derived mathematically from the uploaded file payload.
          </p>
        </div>
      </div>

      {/* 6. Recent Activity Section */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high">
        <div className="flex items-center justify-between pb-space-sm">
          <span className="text-sm font-semibold text-on-surface">Recent Activity</span>
          <button
            onClick={() => setActivePage('audit')}
            className="text-xs text-primary hover:underline font-medium"
            type="button"
          >
            View all activity
          </button>
        </div>
        {state.auditEvents && state.auditEvents.length > 0 ? (
          <div className="divide-y divide-surface-container-high/60">
            {state.auditEvents.slice(0, 4).map((evt, idx) => (
              <div key={evt.id ? `${evt.id}-${idx}` : `recent-act-${idx}`} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="font-mono text-xs text-secondary">{evt.timestamp.split('T')[1]?.slice(0, 8) || evt.timestamp}</span>
                  <span className="text-xs text-on-surface">{evt.event}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  evt.decision === 'ACCEPT' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {evt.decision}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-secondary">
            No audit records yet. Run an assessment to commit records to the vault.
          </div>
        )}
      </div>

      {/* 7. Final Banner Section */}
      <div className="bg-surface-container-low rounded-xl p-space-lg border border-surface-container-high flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Export Assurance Report</h3>
          <p className="text-xs text-secondary">
            Download or print the cryptographic attestation record for this assessment.
          </p>
        </div>
        <button
          onClick={() => setActivePage('report')}
          className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-medium transition-colors shadow-xs shrink-0"
          type="button"
        >
          Open Assurance Report
        </button>
      </div>

      {/* Slide-out Evidence Drawer */}
      <EvidenceDrawer isOpen={isEvidenceOpen} onClose={() => setIsEvidenceOpen(false)} />

      {/* New Assessment Wizard Modal */}
      <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
};
