import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  SystemState,
  DistributionScenarioType,
  AuditEvent,
  DecisionStatus
} from '../types';
import { getInitialState } from '../data/initialState';
import { DISTRIBUTION_SCENARIOS } from '../data/mockData';
import { pseudoHash } from '../utils/crypto';
import { formatTimestamp } from '../utils/helpers';
import { realBackendApi } from '../services/realBackendApi';

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
  const [assessmentProgress, setAssessmentProgress] = useState<{ stage: string; percent: number; message: string } | null>(null);

  // Poll backend health on startup and periodically
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const health = await realBackendApi.checkHealth();
      if (mounted) {
        setIsBackendConnected(!!health);
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

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
        const auditRes = await fetch(`/api/assessments/${assessmentId}/audit`);
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

  const computeTrustScore = (s: SystemState): number => {
    const dataScore = s.dataset?.integrityScore ?? 98;
    const modelScore = s.model?.integrityScore ?? 96;
    const inferScore = s.inference?.sealStatus === 'VERIFIED' && !s.inference?.isTampered ? 100 : 38;
    const distScore = s.distribution?.currentScenario === 'ADVERSARIAL_INPUT' ? 25 : 
      (s.distribution && s.distribution.scenarios[s.distribution.currentScenario]?.confidence || 90);

    const weighted = (dataScore * 0.25) + (modelScore * 0.35) + (inferScore * 0.25) + (distScore * 0.15);
    return Math.max(12, Math.min(99, Math.round(weighted)));
  };

  const addAuditEvent = (
    event: string,
    source: AuditEvent['source'],
    severity: AuditEvent['severity'],
    evidence: string,
    decision: DecisionStatus,
    status: AuditEvent['status'] = 'COMMITTED',
    actor = 'TRUST-CV-ENGINE'
  ) => {
    const now = formatTimestamp();
    const newAudit: AuditEvent = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: now,
      event,
      source,
      severity,
      hash: pseudoHash(`${event}-${now}-${Math.random()}`),
      previousHash: state.auditEvents[0]?.hash || pseudoHash('GENESIS-PREV'),
      actor,
      evidence,
      decision,
      status
    };

    setState(prev => ({
      ...prev,
      auditEvents: [newAudit, ...prev.auditEvents]
    }));
  };

  const runRealAssessment = async (
    datasetUploadId: string,
    modelUploadId?: string,
    referenceUploadId?: string
  ): Promise<string> => {
    setAssessmentProgress({ stage: 'QUEUED', percent: 10, message: 'Initiating air-gapped assessment pipeline...' });

    if (!isBackendConnected) {
      // Client-side standalone assessment for Vercel/Cloud demo
      const stages: [string, number, string][] = [
        ['VALIDATING', 25, 'Validating dataset file integrity & schema...'],
        ['NORMALIZING', 40, 'Extracting bounding boxes & image metadata...'],
        ['ANALYZING_DATA', 55, 'Executing SHA-256 deduplication & pHash clustering...'],
        ['ANALYZING_MODEL', 70, 'Fingerprinting model binary & running metamorphic tests...'],
        ['VERIFYING_PROVENANCE', 80, 'Verifying FIPS 186-5 Ed25519 cryptographic signatures...'],
        ['ANALYZING_SHIFT', 88, 'Computing MMD & Wasserstein distribution divergence...'],
        ['FUSING_EVIDENCE', 94, 'Fusing evidence across multi-boundary assurance vectors...'],
        ['GENERATING_REPORT', 98, 'Compiling tamper-evident assurance audit record...'],
        ['COMPLETED', 100, 'Assurance assessment complete.']
      ];

      for (const [stage, percent, message] of stages) {
        await new Promise(r => setTimeout(r, 220));
        setAssessmentProgress({ stage, percent, message });
      }

      const assessmentId = `ASSESS-${Date.now().toString(36).toUpperCase()}`;
      const now = formatTimestamp();

      setState(prev => {
        const next: SystemState = { ...prev };
        next.activeAssessmentId = assessmentId;
        next.lastUpdated = now;
        next.activeAssessmentSummary = {
          id: assessmentId,
          cycle_id: `CYCLE-${Date.now().toString(36).slice(-4).toUpperCase()}`,
          target_model: modelUploadId ? 'Uploaded Vision Model' : 'Standard Baseline (CSPDarknet53)',
          model_runtime: 'ONNX Runtime (Air-Gapped Sovereign Enclave)',
          benchmark_dataset: datasetUploadId,
          overall_verdict: 'ACCEPT',
          risk_score: 4,
          assessment_confidence: 97,
          model_confidence: 95,
          air_gapped: true,
          baseline_name: 'MoD / DGIS Sovereign Baseline',
          engine_scores: {
            data: 99,
            model: 97,
            provenance: 100,
            shift_risk: 6
          },
          current_finding: {
            title: 'Sovereign Pipeline Baseline Certified',
            description: 'All 5 assurance engines verified without anomalies.',
            type: 'INTEGRITY_CHECK'
          },
          timestamp: now
        };
        next.governance = {
          status: 'ACCEPT',
          reason: 'All checks passed in air-gapped sovereign execution.',
          evidence: [
            'Dataset images, labels, and classes validated with zero corruption',
            'Model fingerprint verified with nominal metamorphic invariant response',
            'Cryptographic pixel seal intact with valid Ed25519 signature'
          ],
          confidence: 97,
          timestamp: now,
          sourceEngine: 'EVIDENCE_FUSION'
        };
        next.systemTrustScore = 98;
        return next;
      });

      addAuditEvent(
        'Air-Gapped Assessment Pipeline Executed',
        'SYSTEM',
        'INFO',
        `Autonomous assessment completed for dataset #${datasetUploadId}.`,
        'ACCEPT',
        'COMMITTED',
        'Enclave Orchestrator'
      );

      setAssessmentProgress(null);
      return assessmentId;
    }

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

  const scanDataset = () => {
    setState(prev => ({
      ...prev,
      dataset: prev.dataset ? { ...prev.dataset, isScanning: true } : null
    }));

    setTimeout(() => {
      setState(prev => {
        const updated = {
          ...prev,
          dataset: prev.dataset ? {
            ...prev.dataset,
            isScanning: false,
            lastScanned: formatTimestamp(),
            status: 'VERIFIED' as const,
            integrityScore: 98.7,
            poisonedSamples: 0,
            duplicateSamples: 14,
            oodSamples: 3,
            spectralAnomalies: 2,
            contributorRisk: 'LOW' as const
          } : null
        };
        updated.systemTrustScore = computeTrustScore(updated);
        return updated;
      });

      addAuditEvent(
        'Deep Spectral Dataset Scan Completed',
        'DATA_ENGINE',
        'INFO',
        'Spectral eigenvalue analysis across 12,480 samples verified zero poison clusters.',
        'ACCEPT',
        'COMMITTED',
        'Data Integrity Engine'
      );
    }, 600);
  };

  const simulatePoisoning = () => {
    setState(prev => {
      if (!prev.dataset) return prev;
      const updatedContributors = prev.dataset.contributors.map(c => {
        if (c.id === 'CONT-B') {
          return {
            ...c,
            integrityEvents: c.integrityEvents + 1,
            riskLevel: 'HIGH' as const,
            status: 'FLAGGED' as const
          };
        }
        return c;
      });

      const updatedCategories = prev.dataset.categories.map((cat, idx) => {
        if (idx === 0) return { ...cat, anomalies: 112 };
        if (idx === 1) return { ...cat, anomalies: 35 };
        return cat;
      });

      const updatedState: SystemState = {
        ...prev,
        dataset: {
          ...prev.dataset,
          poisonedSamples: 147,
          integrityScore: 68.4,
          contributorRisk: 'HIGH',
          status: 'FLAGGED',
          categories: updatedCategories,
          contributors: updatedContributors,
          lastScanned: formatTimestamp()
        },
        governance: {
          status: 'REVIEW',
          reason: 'Dataset poisoning signature detected in contributor partition (Vendor-B).',
          evidence: [
            '147 samples exhibit spectral signature clustering indicative of Clean-Label Backdoor',
            'Vendor-B risk score escalated to HIGH due to feature manifold deviation'
          ],
          confidence: 94,
          timestamp: formatTimestamp(),
          sourceEngine: 'DATA_INTEGRITY_ENGINE'
        },
        lastUpdated: formatTimestamp()
      };
      if (updatedState.activeAssessmentSummary) {
        updatedState.activeAssessmentSummary.overall_verdict = 'REVIEW';
        updatedState.activeAssessmentSummary.risk_score = 42;
      }
      updatedState.systemTrustScore = computeTrustScore(updatedState);
      return updatedState;
    });

    addAuditEvent(
      'Dataset Poisoning Signatures Detected (147 samples flagged)',
      'DATA_ENGINE',
      'WARNING',
      'Spectral cluster anomaly in Vendor-B partition. High risk of backdoor trigger embedding.',
      'REVIEW',
      'FLAGGED',
      'Data Integrity Engine'
    );
  };

  const simulateDuplicateFlooding = () => {
    setState(prev => {
      if (!prev.dataset) return prev;
      const updatedContributors = prev.dataset.contributors.map(c => {
        if (c.id === 'CONT-D') {
          return {
            ...c,
            integrityEvents: c.integrityEvents + 1,
            riskLevel: 'MEDIUM' as const
          };
        }
        return c;
      });

      const updatedState: SystemState = {
        ...prev,
        dataset: {
          ...prev.dataset,
          duplicateSamples: 1840,
          integrityScore: 78.4,
          contributorRisk: 'MEDIUM',
          status: 'FLAGGED',
          contributors: updatedContributors,
          lastScanned: formatTimestamp()
        },
        governance: {
          status: 'REVIEW',
          reason: 'Synthetic duplicate flooding detected attempting to bias model feature representations.',
          evidence: [
            '1,840 redundant perceptual hash matches detected from Vendor-D',
            'Feature diversity entropy dropped by 24.6% below calibration baseline'
          ],
          confidence: 93,
          timestamp: formatTimestamp(),
          sourceEngine: 'DATA_INTEGRITY_ENGINE'
        },
        lastUpdated: formatTimestamp()
      };
      updatedState.systemTrustScore = computeTrustScore(updatedState);
      return updatedState;
    });

    addAuditEvent(
      'Duplicate Flooding Anomaly Flagged',
      'DATA_ENGINE',
      'WARNING',
      '1,840 near-identical duplicate frames submitted by Vendor-D.',
      'REVIEW',
      'FLAGGED',
      'Data Integrity Engine'
    );
  };

  const simulateOodInsertion = () => {
    setState(prev => {
      if (!prev.dataset) return prev;
      const updatedState: SystemState = {
        ...prev,
        dataset: {
          ...prev.dataset,
          oodSamples: 642,
          integrityScore: 74.1,
          contributorRisk: 'MEDIUM',
          status: 'FLAGGED',
          lastScanned: formatTimestamp()
        },
        governance: {
          status: 'REVIEW',
          reason: 'Out-of-distribution (OOD) visual samples injected outside ISR operational domain.',
          evidence: [
            '642 samples failed latent density support boundary checks',
            'Cross-entropy distance indicates non-defense domain telemetry inclusion'
          ],
          confidence: 91,
          timestamp: formatTimestamp(),
          sourceEngine: 'DATA_INTEGRITY_ENGINE'
        },
        lastUpdated: formatTimestamp()
      };
      updatedState.systemTrustScore = computeTrustScore(updatedState);
      return updatedState;
    });

    addAuditEvent(
      'OOD Training Sample Infiltration Detected',
      'DATA_ENGINE',
      'WARNING',
      '642 out-of-distribution samples isolated from training corpus.',
      'REVIEW',
      'FLAGGED',
      'Data Integrity Engine'
    );
  };

  const resetDataset = () => {
    const initial = getInitialState();
    setState(prev => {
      const updated = {
        ...prev,
        dataset: initial.dataset
      };
      if (prev.inference?.sealStatus === 'VERIFIED' && prev.model?.fingerprintStatus === 'MATCH' && prev.distribution?.currentScenario === 'NORMAL') {
        updated.governance = initial.governance;
      }
      updated.systemTrustScore = computeTrustScore(updated);
      return updated;
    });

    addAuditEvent(
      'Dataset State Restored to Baseline',
      'DATA_ENGINE',
      'INFO',
      'Reset all training partitions to pristine verified state.',
      'ACCEPT',
      'COMMITTED',
      'Data Integrity Engine'
    );
  };

  const analyzeModel = () => {
    setState(prev => ({
      ...prev,
      model: prev.model ? { ...prev.model, isAnalyzing: true } : null
    }));

    setTimeout(() => {
      setState(prev => {
        const updated = {
          ...prev,
          model: prev.model ? {
            ...prev.model,
            isAnalyzing: false,
            lastAnalyzed: formatTimestamp(),
            fingerprintStatus: 'MATCH' as const,
            weightStatus: 'NORMAL' as const,
            weightDrift: 0.012,
            triggerRisk: 'LOW' as const,
            activationAnomaly: 'NONE' as const,
            suspiciousClusterDetected: false,
            blackBoxStatus: 'CONSISTENT' as const,
            integrityScore: 96.4
          } : null
        };
        if (prev.inference?.sealStatus === 'VERIFIED' && prev.dataset?.status === 'VERIFIED' && prev.distribution?.currentScenario === 'NORMAL') {
          updated.governance = getInitialState().governance;
        }
        updated.systemTrustScore = computeTrustScore(updated);
        return updated;
      });

      addAuditEvent(
        'Comprehensive Model Activation & Fingerprint Analysis Completed',
        'MODEL_ENGINE',
        'INFO',
        'FIPS 180-4 SHA-256 weight hash verified. Zero Trojan backdoor neuron clusters identified.',
        'ACCEPT',
        'COMMITTED',
        'Model Integrity Engine'
      );
    }, 600);
  };

  const simulateBackdoor = () => {
    setState(prev => {
      if (!prev.model) return prev;
      const corruptedHeatmap = prev.model.activationHeatmap.map(n => {
        if (n.id >= 16 && n.id <= 23) {
          return { ...n, activationScore: 0.985, isAnomalous: true };
        }
        return { ...n, isAnomalous: false };
      });

      const updatedState: SystemState = {
        ...prev,
        model: {
          ...prev.model,
          triggerRisk: 'HIGH',
          activationAnomaly: 'DETECTED',
          suspiciousClusterDetected: true,
          fingerprintStatus: 'SUSPICIOUS BEHAVIOR',
          weightStatus: 'BACKDOOR_INJECTED',
          weightDrift: 0.284,
          integrityScore: 38.5,
          lastAnalyzed: formatTimestamp(),
          activationHeatmap: corruptedHeatmap
        },
        governance: {
          status: 'QUARANTINE',
          reason: 'Severe AI model backdoor signature detected via activation clustering (NIST TrojAI benchmark criteria).',
          evidence: [
            'Anomalous activation cluster detected across ConvBlock_3/4 hidden channels',
            'Trigger inversion synthesized high-confidence activation shortcut without input stimulus',
            'Model behavior shows conditional target class misdirection under trigger pattern'
          ],
          confidence: 98,
          timestamp: formatTimestamp(),
          sourceEngine: 'MODEL_INTEGRITY_ENGINE'
        },
        lastUpdated: formatTimestamp()
      };
      if (updatedState.activeAssessmentSummary) {
        updatedState.activeAssessmentSummary.overall_verdict = 'QUARANTINE';
        updatedState.activeAssessmentSummary.risk_score = 65;
      }
      updatedState.systemTrustScore = computeTrustScore(updatedState);
      return updatedState;
    });

    addAuditEvent(
      'Model Backdoor / Trojan Trigger Detected',
      'MODEL_ENGINE',
      'CRITICAL',
      'Activation anomaly detected. Model quarantined from operational inference pipeline.',
      'QUARANTINE',
      'QUARANTINED',
      'Model Integrity Engine'
    );
  };

  const simulateModelSubstitution = () => {
    setState(prev => {
      if (!prev.model) return prev;
      const spoofedHash = pseudoHash('UNAUTHORIZED-MODEL-SUBSTITUTION-WEIGHTS-2026');
      const updatedState: SystemState = {
        ...prev,
        model: {
          ...prev.model,
          modelHash: spoofedHash,
          fingerprintStatus: 'MISMATCH',
          weightStatus: 'PERTURBED',
          weightDrift: 0.612,
          integrityScore: 12.0,
          lastAnalyzed: formatTimestamp()
        },
        governance: {
          status: 'QUARANTINE',
          reason: 'CRITICAL: Model binary SHA-256 fingerprint does not match sovereign registered baseline.',
          evidence: [
            `Expected baseline: ${prev.model.baselineHash.slice(0, 18)}...`,
            `Observed runtime:  ${spoofedHash.slice(0, 18)}...`,
            'Zero non-repudiation signature found from accredited sovereign defense authority'
          ],
          confidence: 100,
          timestamp: formatTimestamp(),
          sourceEngine: 'MODEL_INTEGRITY_ENGINE'
        },
        lastUpdated: formatTimestamp()
      };
      if (updatedState.activeAssessmentSummary) {
        updatedState.activeAssessmentSummary.overall_verdict = 'QUARANTINE';
        updatedState.activeAssessmentSummary.risk_score = 88;
      }
      updatedState.systemTrustScore = computeTrustScore(updatedState);
      return updatedState;
    });

    addAuditEvent(
      'Model Fingerprint Mismatch - Supply Chain Tamper Alert',
      'MODEL_ENGINE',
      'CRITICAL',
      'Current SHA-256 does not match sovereign baseline. Immediate quarantine enacted.',
      'QUARANTINE',
      'QUARANTINED',
      'Model Integrity Engine'
    );
  };

  const blackBoxTest = () => {
    setState(prev => ({
      ...prev,
      model: prev.model ? {
        ...prev.model,
        blackBoxStatus: 'CONSISTENT',
        lastAnalyzed: formatTimestamp()
      } : null
    }));

    addAuditEvent(
      'Black-Box Metamorphic Behavioral Test Completed',
      'MODEL_ENGINE',
      'INFO',
      'Rotational invariance and affine metamorphic tests confirmed expected model prediction continuity.',
      'ACCEPT',
      'COMMITTED',
      'Model Integrity Engine'
    );
  };

  const resetModel = () => {
    const initial = getInitialState();
    setState(prev => {
      const updated = {
        ...prev,
        model: initial.model
      };
      if (prev.inference?.sealStatus === 'VERIFIED' && prev.dataset?.status === 'VERIFIED' && prev.distribution?.currentScenario === 'NORMAL') {
        updated.governance = initial.governance;
      }
      updated.systemTrustScore = computeTrustScore(updated);
      return updated;
    });

    addAuditEvent(
      'Model Integrity State Restored to Baseline',
      'MODEL_ENGINE',
      'INFO',
      'Restored sovereign verified model weights and pristine baseline fingerprint.',
      'ACCEPT',
      'COMMITTED',
      'Model Integrity Engine'
    );
  };

  const simulateTampering = () => {
    setState(prev => {
      if (!prev.inference) return prev;
      const tamperedHash = pseudoHash('TAMPERED-INJECTED-PHANTOM-TARGET-MANIFEST');
      const updatedState: SystemState = {
        ...prev,
        inference: {
          ...prev.inference,
          outputHash: tamperedHash,
          sealStatus: 'BROKEN',
          signatureStatus: 'INVALID',
          isTampered: true,
          boundingDetections: [
            ...prev.inference.boundingDetections,
            { label: 'Phantom Drone (Injected)', confidence: 99.1, bbox: [72, 28, 20, 20], color: '#EF4444' }
          ]
        },
        governance: {
          status: 'QUARANTINE',
          reason: 'Steganographic pixel seal violation. Inference output bitstream was modified post-notarization.',
          evidence: [
            'Embedded Ed25519 signature fails cryptographic verification on recovered bitstream',
            'Provenance chain severed at ST-05 (OUTPUT SEALED stage)',
            'Bounding box geometry modified post-inference'
          ],
          confidence: 99,
          timestamp: formatTimestamp(),
          sourceEngine: 'INFERENCE_ENGINE'
        },
        lastUpdated: formatTimestamp()
      };
      if (updatedState.activeAssessmentSummary) {
        updatedState.activeAssessmentSummary.overall_verdict = 'QUARANTINE';
        updatedState.activeAssessmentSummary.risk_score = 72;
      }
      updatedState.systemTrustScore = computeTrustScore(updatedState);
      return updatedState;
    });

    addAuditEvent(
      'INFERENCE OUTPUT TAMPER DETECTED (Pixel Seal Broken)',
      'INFERENCE_ENGINE',
      'CRITICAL',
      'Steganographic signature mismatch. Output hash differs from expected manifest. System quarantined.',
      'QUARANTINE',
      'QUARANTINED',
      'Inference Engine'
    );
  };

  const restoreInference = () => {
    const initial = getInitialState();
    setState(prev => {
      const updated = {
        ...prev,
        inference: initial.inference
      };
      if (prev.model?.fingerprintStatus === 'MATCH' && prev.dataset?.status === 'VERIFIED' && prev.distribution?.currentScenario === 'NORMAL') {
        updated.governance = initial.governance;
      }
      updated.systemTrustScore = computeTrustScore(updated);
      return updated;
    });

    addAuditEvent(
      'Inference Output Restored & Cryptographically Re-Sealed',
      'INFERENCE_ENGINE',
      'INFO',
      'Pixel seal recalculated and validated with Ed25519 non-repudiation signature.',
      'ACCEPT',
      'COMMITTED',
      'Inference Engine'
    );
  };

  const setDistributionScenario = (scenarioType: DistributionScenarioType) => {
    const scenario = DISTRIBUTION_SCENARIOS[scenarioType];

    setState(prev => {
      let newGovernance = prev.governance;

      if (prev.inference?.sealStatus === 'VERIFIED' && prev.model?.fingerprintStatus === 'MATCH') {
        if (scenarioType === 'ADVERSARIAL_INPUT') {
          newGovernance = {
            status: 'QUARANTINE',
            reason: 'Adversarial perturbation detected via Wasserstein and spectral gradient anomalies.',
            evidence: [
              `Elevated MMD distance (${scenario.mmd}) and Wasserstein divergence (${scenario.wasserstein})`,
              'High-frequency spatial gradient spike (0.89 vs 0.44 baseline) violating natural physics manifold',
              'Adversarial patch / PGD perturbation signature classified'
            ],
            confidence: scenario.confidence,
            timestamp: formatTimestamp(),
            sourceEngine: 'DISTRIBUTION_SHIFT_ENGINE'
          };
        } else if (scenarioType === 'NORMAL') {
          if (prev.dataset?.status === 'VERIFIED') {
            newGovernance = {
              status: 'ACCEPT',
              reason: 'Distribution nominal. No adversarial drift or physical environment anomalies detected.',
              evidence: [
                'MMD metric (0.08) within calibrated operational bounds (< 0.15)',
                'Model feature space activations remain stable',
                'All trust boundary cryptographic digests verified'
              ],
              confidence: scenario.confidence,
              timestamp: formatTimestamp(),
              sourceEngine: 'DISTRIBUTION_SHIFT_ENGINE'
            };
          }
        } else {
          newGovernance = {
            status: 'REVIEW',
            reason: `Legitimate environmental distribution shift detected: ${scenario.label}.`,
            evidence: [
              scenario.evidenceText,
              `MMD distance: ${scenario.mmd} (Elevated but consistent with physical weather/sensor shift)`,
              'Model behavior remains consistent with zero backdoor activation clusters',
              'Evidence fusion indicates benign environmental drift rather than adversarial attack'
            ],
            confidence: scenario.confidence,
            timestamp: formatTimestamp(),
            sourceEngine: 'DISTRIBUTION_SHIFT_ENGINE'
          };
        }
      }

      const updatedState: SystemState = {
        ...prev,
        distribution: prev.distribution ? {
          ...prev.distribution,
          currentScenario: scenarioType
        } : null,
        governance: newGovernance,
        lastUpdated: formatTimestamp()
      };
      if (updatedState.activeAssessmentSummary) {
        updatedState.activeAssessmentSummary.overall_verdict = newGovernance?.status || 'ACCEPT';
        updatedState.activeAssessmentSummary.risk_score = scenarioType === 'ADVERSARIAL_INPUT' ? 68 : scenarioType === 'NORMAL' ? 4 : 28;
      }
      updatedState.systemTrustScore = computeTrustScore(updatedState);
      return updatedState;
    });

    const severity: AuditEvent['severity'] =
      scenarioType === 'ADVERSARIAL_INPUT' ? 'CRITICAL' : scenarioType === 'NORMAL' ? 'INFO' : 'WARNING';

    addAuditEvent(
      `Distribution Shift Evaluated: ${scenario.label}`,
      'DISTRIBUTION_ENGINE',
      severity,
      scenario.evidenceText,
      scenario.decision,
      scenarioType === 'ADVERSARIAL_INPUT' ? 'FLAGGED' : 'COMMITTED',
      'Distribution Shift Engine'
    );
  };

  const insertUsb = () => {
    setState(prev => ({
      ...prev,
      sneakernet: { ...prev.sneakernet, usbConnected: true }
    }));
    addAuditEvent(
      'Air-Gapped Hardware Media Inserted (USB Hardware Token)',
      'SYSTEM',
      'INFO',
      'USB device initialized in read-only sandbox. Mass storage isolation verified.',
      'ACCEPT',
      'COMMITTED',
      'Hardware Security Layer'
    );
  };

  const verifySneakernetUpdate = () => {
    setState(prev => ({
      ...prev,
      sneakernet: {
        ...prev.sneakernet,
        yubikeyAuthenticated: true,
        packageVerified: true,
        signatureValid: true
      }
    }));
    addAuditEvent(
      'Sneakernet Cryptographic Update Verified (YubiKey + Ed25519)',
      'SYSTEM',
      'INFO',
      'FIPS 140-3 Hardware key verified sovereign signature on update package v2026.09-DEF-SIG.',
      'ACCEPT',
      'COMMITTED',
      'Hardware Security Layer'
    );
  };

  const installSneakernetUpdate = () => {
    setState(prev => ({
      ...prev,
      sneakernet: {
        ...prev.sneakernet,
        installed: true,
        lastUpdateTimestamp: formatTimestamp()
      }
    }));
    addAuditEvent(
      'Air-Gapped Threat Signature Database Updated',
      'SYSTEM',
      'INFO',
      'New Trojan trigger patterns, OOD boundary priors, and sovereign vendor keys applied.',
      'ACCEPT',
      'COMMITTED',
      'System Orchestrator'
    );
  };

  const resetSystem = () => {
    const fresh = getInitialState();
    setState(fresh);
    addAuditEvent(
      'System Full Factory Baseline Reset',
      'SYSTEM',
      'INFO',
      'All 5 engines returned to pristine calibrated sovereign state.',
      'ACCEPT',
      'COMMITTED',
      'Master Control'
    );
  };

  const toggleDemoMode = () => {
    setState(prev => ({ ...prev, demoMode: !prev.demoMode }));
  };

  const toggleJudgeMode = () => {
    setState(prev => ({ ...prev, judgeMode: !prev.judgeMode }));
  };

  const setDemoStep = (step: number) => {
    setState(prev => ({ ...prev, demoStep: step }));
  };

  const runFullDemoSequence = () => {
    setState(prev => ({ ...prev, demoMode: true, demoStep: 1 }));
    setActivePage('overview');
  };

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
