import React, { useState } from 'react';
import { Play, CheckCircle2, ChevronRight, RefreshCw, X, ShieldAlert, FileText, FastForward } from 'lucide-react';
import { useApp, PageRoute } from '../../state/AppContext';

interface DemoStepInfo {
  step: number;
  title: string;
  actionLabel: string;
  expectedStatus: string;
  governanceResult: 'ACCEPT' | 'REVIEW' | 'QUARANTINE';
  description: string;
  targetPage: PageRoute;
  action: () => void;
}

export const DemoRunnerModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const {
    state,
    setActivePage,
    scanDataset,
    analyzeModel,
    simulateTampering,
    restoreInference,
    setDistributionScenario,
    resetSystem
  } = useApp();

  const [currentStep, setCurrentStep] = useState(1);

  if (!isOpen) return null;

  const demoSteps: DemoStepInfo[] = [
    {
      step: 1,
      title: 'Clean Baseline Pipeline',
      actionLabel: 'Verify Clean State',
      expectedStatus: 'ACCEPT / ALL VERIFIED',
      governanceResult: 'ACCEPT',
      description: 'Establishes sovereign baseline across training data, model checkpoints, and runtime configuration.',
      targetPage: 'overview',
      action: () => {
        resetSystem();
        setActivePage('overview');
      }
    },
    {
      step: 2,
      title: 'Deep Dataset Spectral Scan',
      actionLabel: 'Trigger Dataset Scan',
      expectedStatus: '12,480 SAMPLES VERIFIED',
      governanceResult: 'ACCEPT',
      description: 'Scans multi-contributor training partitions. Spectral variance confirms zero backdoor poisoning clusters.',
      targetPage: 'data',
      action: () => {
        setActivePage('data');
        scanDataset();
      }
    },
    {
      step: 3,
      title: 'Model Fingerprint & Activation Analysis',
      actionLabel: 'Analyze Model Weights',
      expectedStatus: 'SHA-256 MATCH • ZERO TROJAN NEURONS',
      governanceResult: 'ACCEPT',
      description: 'Cryptographically verifies model weights against sovereign baseline and inspects activation layer distributions.',
      targetPage: 'model',
      action: () => {
        setActivePage('model');
        analyzeModel();
      }
    },
    {
      step: 4,
      title: 'Generate Inference & Bind Pixel Seal',
      actionLabel: 'Generate Bound Inference',
      expectedStatus: 'PIXEL SEAL VERIFIED',
      governanceResult: 'ACCEPT',
      description: 'Runs target recognition forward pass. Cryptographic Ed25519 signature is embedded into output bitstream.',
      targetPage: 'inference',
      action: () => {
        restoreInference();
        setActivePage('inference');
      }
    },
    {
      step: 5,
      title: 'Cryptographic Provenance Commit',
      actionLabel: 'Verify Provenance Chain',
      expectedStatus: 'CHAIN VERIFIED (INPUT+MODEL+CONFIG+OUTPUT)',
      governanceResult: 'ACCEPT',
      description: 'Binds raw input frame hash, model hash, config hash, and output hash into immutable provenance record.',
      targetPage: 'inference',
      action: () => {
        setActivePage('inference');
      }
    },
    {
      step: 6,
      title: 'Simulate Image Tampering Attack',
      actionLabel: 'Inject Pixel Tamper',
      expectedStatus: 'PIXEL SEAL BROKEN → QUARANTINE',
      governanceResult: 'QUARANTINE',
      description: 'Simulates adversary altering tactical bounding boxes. Steganographic signature collapses instantly.',
      targetPage: 'inference',
      action: () => {
        setActivePage('inference');
        simulateTampering();
      }
    },
    {
      step: 7,
      title: 'Inspect Cryptographic Audit Vault',
      actionLabel: 'Inspect Immutable Audit Log',
      expectedStatus: 'TAMPERING AUDIT COMMITTED',
      governanceResult: 'QUARANTINE',
      description: 'Demonstrates non-repudiation audit event generation with previous/current hash chain and contributor telemetry.',
      targetPage: 'audit',
      action: () => {
        setActivePage('audit');
      }
    },
    {
      step: 8,
      title: 'Simulate Natural Environmental Shift',
      actionLabel: 'Inject Night/Weather Shift',
      expectedStatus: 'GOVERNANCE: REVIEW (NON-MALICIOUS)',
      governanceResult: 'REVIEW',
      description: 'Demonstrates TRUST-CV distinguishing legitimate weather/lighting shift (MMD elevated) from an adversarial attack.',
      targetPage: 'distribution',
      action: () => {
        restoreInference();
        setDistributionScenario('WEATHER');
        setActivePage('distribution');
      }
    },
    {
      step: 9,
      title: 'Export Final Sovereign Assurance Report',
      actionLabel: 'Generate Formal Report',
      expectedStatus: 'COMPREHENSIVE MULTI-BOUNDARY AUDIT',
      governanceResult: (state.governance?.status || 'REVIEW') as 'ACCEPT' | 'REVIEW' | 'QUARANTINE',
      description: 'Renders formal defense audit dossier ready for commanders, operational review, and print/export archiving.',
      targetPage: 'report',
      action: () => {
        setActivePage('report');
      }
    }
  ];

  const activeStepData = demoSteps[currentStep - 1];

  const handleExecuteStep = () => {
    activeStepData.action();
    if (currentStep < 9) {
      setCurrentStep(currentStep + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-3xl rounded-xl bg-slate-900 border border-cyan-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider telemetry-mono">
                TRUST-CV — Operational Pipeline Verification Tour
              </h3>
              <p className="text-xs text-slate-400">
                Automated 9-Stage Sovereign Defense Integrity Audit Sequence (MoD / DGIS Ref: PS-26228)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-1 overflow-x-auto">
          {demoSteps.map(s => (
            <button
              key={s.step}
              onClick={() => {
                setCurrentStep(s.step);
                s.action();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-all flex-shrink-0 ${
                currentStep === s.step
                  ? 'bg-cyan-600 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : currentStep > s.step
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span>{s.step}.</span>
              <span className="truncate max-w-[80px]">{s.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                STEP {activeStepData.step} OF 9
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">
                {activeStepData.title}
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {activeStepData.description}
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">
                Expected Governance
              </span>
              <span
                className={`inline-block px-2.5 py-1 rounded text-xs font-bold font-mono uppercase mt-1 ${
                  activeStepData.governanceResult === 'ACCEPT'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : activeStepData.governanceResult === 'REVIEW'
                    ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                    : 'bg-rose-950 text-rose-400 border border-rose-500/50'
                }`}
              >
                {activeStepData.governanceResult}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
            <div className="text-slate-400 uppercase text-[10px] font-bold">Target State Outcome:</div>
            <div className="text-cyan-300 font-bold">{activeStepData.expectedStatus}</div>
            <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-800">
              Target UI View: <span className="text-white uppercase font-bold">{activeStepData.targetPage}</span>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={() => {
              resetSystem();
              setCurrentStep(1);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-mono hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Sequence
          </button>

          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <button
                onClick={() => {
                  const prev = currentStep - 1;
                  setCurrentStep(prev);
                  demoSteps[prev - 1].action();
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-semibold"
              >
                Previous Step
              </button>
            )}

            <button
              onClick={handleExecuteStep}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {activeStepData.actionLabel}
              {currentStep < 9 && <ChevronRight className="w-4 h-4 ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
