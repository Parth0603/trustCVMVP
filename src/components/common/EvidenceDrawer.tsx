import React, { useState, useEffect } from 'react';
import { useApp } from '../../state/AppContext';
import { assuranceApi } from '../../services/assuranceApi';
import { EvidenceDetail } from '../../services/types';

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ isOpen, onClose }) => {
  const { state, setActivePage } = useApp();
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);

  useEffect(() => {
    if (isOpen) {
      assuranceApi.getEvidenceDetail(state).then(setEvidence);
    }
  }, [isOpen, state]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200">
      {/* Scrim Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Sheet */}
      <div className="relative z-[101] h-full w-full max-w-md bg-surface-container-lowest shadow-2xl flex flex-col justify-between p-space-lg border-l border-surface-container-high overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="flex flex-col gap-space-md">
          {/* Header */}
          <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high/60">
            <div>
              <div className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold">
                EVIDENCE LOG
              </div>
              <h3 className="font-title-md text-base font-semibold text-on-surface">
                {evidence?.title || 'Technical Evidence'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
              aria-label="Close evidence drawer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {evidence ? (
            <>
              {/* Trigger Condition */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container-high flex flex-col gap-1">
                <span className="font-label-sm text-xs font-semibold text-primary">
                  PRIMARY REASONING
                </span>
                <p className="text-sm text-on-surface leading-snug">
                  {evidence.triggerCondition}
                </p>
              </div>

              {/* Real Diagnostics */}
              <div className="flex flex-col gap-2">
                <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold">
                  Assessment Diagnostics
                </span>
                <div className="space-y-1.5 font-mono text-xs bg-surface-container-low p-space-sm rounded-lg border border-surface-container-high/60">
                  {Object.entries(evidence.diagnostics).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-0.5">
                      <span className="text-secondary">{key}:</span>
                      <span className="text-on-surface font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cryptographic & Behavioral Assertion */}
              <div className="flex flex-col gap-2 pt-space-xs">
                <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold">
                  Integrity Assertion
                </span>
                <p className="text-secondary text-sm leading-relaxed">
                  {evidence.integrityAssertion}
                </p>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-secondary">
              No technical evidence available. Complete an assessment first.
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="pt-space-md border-t border-surface-container-high/60 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              setActivePage('report');
            }}
            className="w-full py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-medium transition-colors shadow-xs"
            type="button"
          >
            View Full Assurance Report
          </button>
        </div>
      </div>
    </div>
  );
};
