import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { AssessmentWizardModal } from '../components/common/AssessmentWizardModal';

export const ContributorTrustPage: React.FC = () => {
  const { state, setActivePage } = useApp();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const contributors = state.dataset?.contributors || [];

  // EMPTY STATE: No contributor metadata exists in uploaded dataset
  if (contributors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-xl mx-auto text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high/60 border border-surface-container-high flex items-center justify-center mb-6 text-secondary">
          <span className="material-symbols-outlined text-[36px]">badge</span>
        </div>
        <div className="text-xs uppercase tracking-wider text-secondary font-semibold mb-1">
          CONTRIBUTOR CONTEXT
        </div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight mb-2">
          No contributor metadata available
        </h2>
        <p className="text-sm text-secondary mb-8 max-w-md">
          Contributor information unavailable. TRUST-CV does not fabricate vendor identities or reputation metrics when contributor provenance is absent from the dataset.
        </p>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-medium text-sm shadow-xs flex items-center gap-2"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>Upload Dataset With Metadata</span>
        </button>
        <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      </div>
    );
  }

  // REAL CONTRIBUTOR VIEW (when metadata actually exists in dataset payload)
  return (
    <div className="flex flex-col gap-space-lg w-full max-w-[1200px] mx-auto pb-space-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => setActivePage('data')}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
            title="Back to Data Integrity"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-on-surface">Contributor Trust Registry</h2>
            <p className="text-xs sm:text-sm text-secondary">
              Provenance tracking extracted from verified dataset manifest
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold border border-outline-variant/30">
          {contributors.length} Registered Contributors
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {contributors.map((c) => (
          <div
            key={c.id}
            className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-on-surface">{c.name}</h3>
                  <span className="text-xs text-secondary font-mono block mt-0.5">{c.role}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  c.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {c.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="p-2 bg-surface-container-low rounded-lg">
                  <span className="text-xs text-secondary block">Samples</span>
                  <span className="text-sm font-semibold text-on-surface font-mono">
                    {c.samplesContributed.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-surface-container-low rounded-lg">
                  <span className="text-xs text-secondary block">Models</span>
                  <span className="text-sm font-semibold text-on-surface font-mono">{c.modelsSubmitted}</span>
                </div>
                <div className="p-2 bg-surface-container-low rounded-lg">
                  <span className="text-xs text-secondary block">Provenance</span>
                  <span className="text-sm font-semibold text-primary font-mono">{c.provenanceCompleteness}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
};
