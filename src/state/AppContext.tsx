import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  SystemState,
  DistributionScenarioType,
  AuditEvent,
  DecisionStatus
} from '../types';
import { getInitialState } from '../data/initialState';
import { pseudoHash } from '../utils/crypto';
import { formatTimestamp } from '../utils/helpers';
import { realBackendApi } from '../services/realBackendApi';
import { getApiEndpoint } from '../services/apiConfig';

export type PageRoute =
  | 'landing'
  | 'overview'
  | 'data'
  | 'model'
  | 'inference'
  | 'distribution'
  | 'contributors'
  | 'attack-lab'
  | 'audit'
  | 'report';

interface AppContextType {
  state: SystemState;
  activePage: PageRoute;
  setActivePage: (page: PageRoute) => void;
  // Data actions
  scanDataset: () => void;
  simulatePoisoning: () => void;
  simulateDuplicateFlooding: () => void;
  simulateOodInsertion: () => void;
  resetDataset: () => void;
  // Model actions
  analyzeModel: () => void;
  simulateBackdoor: () => void;
  simulateModelSubstitution: () => void;
  blackBoxTest: () => void;
  resetModel: () => void;
  // Inference actions
  simulateTampering: () => void;
  restoreInference: () => void;
  // Distribution actions
  setDistributionScenario: (scenario: DistributionScenarioType) => void;
  // Sneakernet
  insertUsb: () => void;
  verifySneakernetUpdate: () => void;
  installSneakernetUpdate: () => void;
  // System actions
  resetSystem: () => void;
  toggleDemoMode: () => void;
  toggleJudgeMode: () => void;
  setDemoStep: (step: number) => void;
  runFullDemoSequence: () => void;
  // Real Local Offline Backend
  isBackendConnected: boolean;
  backendStatus: 'connected' | 'offline' | 'waking';
  wakeUpElapsed: number;
  wakeUpBackend: () => Promise<boolean>;
  assessmentProgress: { stage: string; percent: number; message: string } | null;
  runRealAssessment: (datasetUploadId: string, modelUploadId?: string, referenceUploadId?: string) => Promise<string>;
  loadRealAssessment: (assessmentId: string) => Promise<void>;
  clearRealAssessment: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SystemState>(getInitialState);
  const [activePage, setActivePage] = useState<PageRoute>('overview');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'offline' | 'waking'>('offline');
  const [wakeUpElapsed, setWakeUpElapsed] = useState<number>(0);
  const [assessmentProgress, setAssessmentProgress] = useState<{ stage: string; percent: number; message: string } | null>(null);

  // Poll backend health on startup and periodically
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (backendStatus === 'waking') return;
      const health = await realBackendApi.checkHealth();
      if (mounted) {
        setIsBackendConnected(!!health);
        setBackendStatus(health ? 'connected' : 'offline');
      }
    };
    check();
    const interval = setInterval(check, 6000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [backendStatus]);

  const wakeUpBackend = async (): Promise<boolean> => {
    setBackendStatus('waking');
    setWakeUpElapsed(0);
    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setWakeUpElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const maxWaitMs = 90000;
    try {
      while (Date.now() - startTime < maxWaitMs) {
        try {
          const health = await realBackendApi.checkHealth();
          if (health) {
            clearInterval(timerInterval);
            setIsBackendConnected(true);
            setBackendStatus('connected');
            return true;
          }
        } catch {
          // container is booting on Render
        }
        await new Promise(r => setTimeout(r, 2500));
      }
    } finally {
      clearInterval(timerInterval);
    }

    setBackendStatus('offline');
    setIsBackendConnected(false);
    return false;
  };

  const clearRealAssessment = () => {
    setState(getInitialState());
  };

  const loadRealAssessment = async (assessmentId: string) => {
    try {
      const [summary, dataRes, modelRes, provRes, shiftRes, reportRes] = await Promise.all([
        realBackendApi.getSummary(assessmentId).catch(() => null),
        realBackendApi.getDataResult(assessmentId).catch(() => null),
        realBackendApi.getModelResult(assessmentId).catch(() => null),
        realBackendApi.getProvenanceResult(assessmentId).catch(() => null),
        realBackendApi.getShiftResult(assessmentId).catch(() => null),
        realBackendApi.getReport(assessmentId).catch(() => null),
      ]);

      // Fetch audit events scoped to this assessment only (not the full global vault)
      let auditRecords: AuditEvent[] = [];
      try {
        const auditRes = await fetch(getApiEndpoint(`/api/assessments/${assessmentId}/audit`));
        if (auditRes.ok) {
          const data = await auditRes.json();
          if (data.records && Array.isArray(data.records)) {
            auditRecords = data.records.map((r: any) => ({
              id: r.record_id || r.id,
              timestamp: r.timestamp,
              event: r.event_type || r.event || 'Audit Block Committed',
              source: (r.source || 'DATA_ENGINE') as any,
              severity: (r.severity || 'INFO') as any,
              hash: r.current_hash || r.hash || '0x00000000',
              previousHash: r.previous_hash || r.previousHash || '0x00000000',
              actor: r.actor || 'TRUST-CV-ENGINE',
              evidence: r.evidence_summary || r.evidence || 'Cryptographically committed block',
              decision: (r.governance_decision || r.decision || 'ACCEPT') as any,
              status: (r.status || 'COMMITTED') as any,
            }));
          }
        }
      } catch {
        // ignore
      }

      setState(prev => {
        const next: SystemState = { ...prev };
        next.activeAssessmentId = assessmentId;
        next.activeAssessmentSummary = summary;
        next.activeAssessmentData = dataRes;
        next.activeAssessmentModel = modelRes;
        next.activeAssessmentProvenance = provRes;
        next.activeAssessmentShift = shiftRes;
        next.activeAssessmentReport = reportRes;
        next.auditEvents = auditRecords;
        next.lastUpdated = summary?.timestamp || formatTimestamp();

        if (summary) {
          next.governance = {
            status: summary.overall_verdict || 'REVIEW',
            reason: summary.current_finding?.description || 'Assessment complete',
            evidence: (summary as any).blocking_findings?.length > 0
              ? (summary as any).blocking_findings
              : [
                  `Assurance cycle: ${summary.cycle_id}`,
                  `Air-gapped verification: ${summary.air_gapped ? 'Confirmed' : 'No'}`,
                  `Risk score: ${summary.risk_score}/100`,
                ],
            confidence: summary.assessment_confidence || summary.model_confidence || 95,
            timestamp: summary.timestamp,
            sourceEngine: 'EVIDENCE_FUSION'
          };
          next.systemTrustScore = Math.max(0, 100 - (summary.risk_score || 0));
        }

        if (dataRes) {
          const totalSamples = dataRes.total_images || 0;
          const duplicateSamples = (dataRes.exact_duplicate_count || 0) + (dataRes.near_duplicate_count || 0);
          const oodSamples = (dataRes.anomaly_indicators || []).length;
          const poisonedSamples = (dataRes.poisoning_indicators || []).length;
          next.dataset = {
            name: summary?.benchmark_dataset || dataRes.dataset_name || 'Uploaded Dataset',
            format: dataRes.format || 'COCO',
            totalSamples,
            duplicateSamples,
            oodSamples,
            poisonedSamples,
            spectralAnomalies: 0,
            status: dataRes.status === 'Verified' ? 'VERIFIED' : 'FLAGGED',
            integrityScore: dataRes.integrity_score ?? 100,
            isScanning: false,
            lastScanned: summary?.timestamp || formatTimestamp(),
            contributorRisk: dataRes.status === 'Verified' ? 'LOW' : 'HIGH',
            categories: (dataRes.classes || []).map((c: any) => ({
              name: c.name,
              count: c.count,
              anomalies: 0
            })),
            contributors: (dataRes.contributors || []).map((ct: any) => ({
              id: ct.id || `contrib-${Math.random().toString(36).slice(2, 6)}`,
              name: ct.name || 'Anonymous Vendor',
              role: ct.role || 'Dataset Provider',
              status: ct.status || 'VERIFIED',
              samplesContributed: ct.samplesContributed ?? ct.samples ?? 0,
              modelsSubmitted: ct.modelsSubmitted ?? ct.models ?? 0,
              provenanceCompleteness: ct.provenanceCompleteness ?? 100
            }))
          };
        }

        if (modelRes && modelRes.analyzed === true && modelRes.status !== 'NOT_ANALYZED' && modelRes.model_format !== 'NONE') {
          const isMatch = modelRes.fingerprint_match === 'MATCH';
          const isPass = modelRes.behavioral_bounds === 'PASS';
          next.model = {
            modelName: modelRes.model_name || 'Uploaded Model',
            version: 'v1.0 (Analyzed)',
            architecture: modelRes.model_format || 'ONNX',
            modelHash: modelRes.sha256 || '',
            baselineHash: modelRes.sha256 || '',
            fingerprintStatus: isMatch ? 'MATCH' : 'MISMATCH',
            weightStatus: isMatch ? 'NORMAL' : 'PERTURBED',
            weightDrift: 0,
            triggerRisk: isPass ? 'LOW' : 'HIGH',
            activationAnomaly: 'NONE',
            suspiciousClusterDetected: !isPass,
            blackBoxStatus: isPass ? 'CONSISTENT' : 'DEVIATING',
            integrityScore: modelRes.score ?? (isMatch && isPass ? 100 : 45),
            isAnalyzing: false,
            lastAnalyzed: summary?.timestamp || formatTimestamp(),
            activationHeatmap: []
          };
        } else {
          next.model = null;
        }

        if (provRes && provRes.analyzed === true && provRes.status !== 'NOT_ANALYZED') {
          next.inference = {
            inferenceId: provRes.frame_id || '#ASSESSED-FRAME-01',
            sampleName: 'Inference Attestation',
            inputHash: provRes.input_hash || '',
            modelHash: provRes.model_hash || '',
            configHash: '',
            outputHash: '',
            expectedOutputHash: '',
            tamperedOutputHash: '',
            nonce: '',
            sequenceNumber: 1,
            timestamp: summary?.timestamp || formatTimestamp(),
            signature: provRes.signature || '',
            recoveredSignature: provRes.signature || '',
            sealStatus: provRes.chain_verified ? 'VERIFIED' : 'BROKEN',
            signatureStatus: provRes.signature_valid ? 'VALID' : 'INVALID',
            isTampered: !provRes.signature_valid,
            boundingDetections: [],
            temporalRootHash: '',
            provenanceEvents: []
          };
        } else {
          next.inference = null;
        }

        return next;
      });
    } catch (err) {
      console.error("Failed to load real assessment data:", err);
    }
  };

  const runRealAssessment = async (
    datasetUploadId: string,
    modelUploadId?: string,
    referenceUploadId?: string
  ): Promise<string> => {
    setAssessmentProgress({ stage: 'QUEUED', percent: 10, message: 'Initiating air-gapped assessment pipeline...' });

    const res = await realBackendApi.startAssessment({
      dataset_upload_id: datasetUploadId,
      model_upload_id: modelUploadId,
      reference_upload_id: referenceUploadId
    });

    const assessmentId = res.assessment_id;

    const stageMap: Record<string, { percent: number; message: string }> = {
      QUEUED: { percent: 15, message: 'Queueing analysis jobs...' },
      VALIDATING: { percent: 25, message: 'Validating dataset file integrity & schema...' },
      NORMALIZING: { percent: 40, message: 'Extracting bounding boxes & image metadata...' },
      ANALYZING_DATA: { percent: 55, message: 'Executing SHA-256 deduplication & pHash clustering...' },
      ANALYZING_MODEL: { percent: 70, message: 'Fingerprinting model binary & running metamorphic tests...' },
      VERIFYING_PROVENANCE: { percent: 80, message: 'Verifying FIPS 186-5 Ed25519 cryptographic signatures...' },
      ANALYZING_SHIFT: { percent: 88, message: 'Computing MMD & Wasserstein distribution divergence...' },
      FUSING_EVIDENCE: { percent: 94, message: 'Fusing evidence across multi-boundary assurance vectors...' },
      GENERATING_REPORT: { percent: 98, message: 'Compiling tamper-evident assurance audit record...' },
      COMPLETED: { percent: 100, message: 'Assurance assessment complete.' },
      FAILED: { percent: 100, message: 'Assessment failed.' }
    };

    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 120) {
      attempts++;
      await new Promise(r => setTimeout(r, 600));
      try {
        const st = await realBackendApi.getStatus(assessmentId);
        const stageInfo = stageMap[st.status] || { percent: 50, message: `Processing: ${st.status}...` };
        setAssessmentProgress({
          stage: st.status,
          percent: stageInfo.percent,
          message: stageInfo.message
        });

        if (st.status === 'COMPLETED') {
          completed = true;
          break;
        } else if (st.status === 'FAILED') {
          throw new Error('Assessment processing failed on backend.');
        }
      } catch (e: any) {
        if (e.message?.includes('failed')) throw e;
      }
    }

    await loadRealAssessment(assessmentId);
    setAssessmentProgress(null);
    return assessmentId;
  };

  // Safe dummy stubs to maintain interface compatibility without injecting fake data
  const scanDataset = () => {
    if (state.activeAssessmentId) {
      loadRealAssessment(state.activeAssessmentId);
    }
  };

  const simulatePoisoning = () => {};
  const simulateDuplicateFlooding = () => {};
  const simulateOodInsertion = () => {};
  const resetDataset = () => {};
  const analyzeModel = () => {
    if (state.activeAssessmentId) {
      loadRealAssessment(state.activeAssessmentId);
    }
  };
  const simulateBackdoor = () => {};
  const simulateModelSubstitution = () => {};
  const blackBoxTest = () => {};
  const resetModel = () => {};
  const simulateTampering = () => {};
  const restoreInference = () => {};
  const setDistributionScenario = () => {};
  const insertUsb = () => {};
  const verifySneakernetUpdate = () => {};
  const installSneakernetUpdate = () => {};
  const resetSystem = () => {
    clearRealAssessment();
  };
  const toggleDemoMode = () => {};
  const toggleJudgeMode = () => {};
  const setDemoStep = () => {};
  const runFullDemoSequence = () => {};

  return (
    <AppContext.Provider
      value={{
        state,
        activePage,
        setActivePage,
        scanDataset,
        simulatePoisoning,
        simulateDuplicateFlooding,
        simulateOodInsertion,
        resetDataset,
        analyzeModel,
        simulateBackdoor,
        simulateModelSubstitution,
        blackBoxTest,
        resetModel,
        simulateTampering,
        restoreInference,
        setDistributionScenario,
        insertUsb,
        verifySneakernetUpdate,
        installSneakernetUpdate,
        resetSystem,
        toggleDemoMode,
        toggleJudgeMode,
        setDemoStep,
        runFullDemoSequence,
        isBackendConnected,
        backendStatus,
        wakeUpElapsed,
        wakeUpBackend,
        assessmentProgress,
        runRealAssessment,
        loadRealAssessment,
        clearRealAssessment
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
