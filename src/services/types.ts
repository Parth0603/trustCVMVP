// TRUST-CV Backend & Assurance Service Types
// This schema defines the contract between the frontend and future real assurance engines
// (FastAPI / PyTorch / ONNX Runtime Python services)

export type DecisionStatus = 'ACCEPT' | 'REVIEW' | 'QUARANTINE';
export type EngineVerificationStatus = 'VERIFIED' | 'REVIEW' | 'FLAGGED' | 'BROKEN';
export type SeverityLevel = 'INFO' | 'WARNING' | 'CRITICAL';

export interface BackendStatusInfo {
  isBackendConnected: boolean;
  mode: 'DEMO' | 'LIVE_PIPELINE' | 'OFFLINE';
  engineHealth: {
    dataEngine: boolean;
    modelEngine: boolean;
    provenanceEngine: boolean;
    distributionEngine: boolean;
  };
  connectedEndpoint?: string;
}

export interface TrustChainNode {
  name: 'Data' | 'Model' | 'Inference' | 'Environment' | 'Decision';
  status: 'Verified' | 'Review' | 'Flagged' | 'Broken' | 'Not Analyzed' | 'Not Available';
  isSafe: boolean;
  routeKey: string;
}

export interface AssessmentSummary {
  id: string;
  cycleId: string;
  targetModel: string;
  modelRuntime: string;
  benchmarkDataset: string;
  overallVerdict: DecisionStatus;
  riskScore: number; // 0 - 100
  assessmentConfidence: number; // percentage
  modelConfidence: number | null; // percentage or null if no model
  airGapped: boolean;
  baselineName: string;
  trustChain: TrustChainNode[];
  engineScores: {
    data: number | null;
    model: number | null;
    provenance: number | null;
    shiftRisk: number | null;
  };
  currentFinding: {
    title: string;
    description: string;
    type: string;
  };
  timestamp: string;
}

export interface DataIntegrityResult {
  score: number;
  status: EngineVerificationStatus;
  benchmarkSet: string;
  totalSamples: number;
  anomalyRatio: number;
  anomalyThreshold: number;
  attestationProtocol: string;
  classBalance: { name: string; percentage: number; colorClass: string }[];
  anomalies: {
    normalFrames: number;
    nearDuplicates: number;
    outOfDistribution: number;
    labelConflicts: number;
  };
  annotatorBatches: {
    batchId: string;
    source: string;
    samples: number;
    consensusScore: number;
    status: 'Notarized' | 'Pending' | 'Flagged';
  }[];
}

export interface ModelIntegrityResult {
  score: number;
  status: EngineVerificationStatus;
  modelTag: string;
  runtimeVersion: string;
  accessMode: 'White-box' | 'Black-box';
  fingerprintMatch: 'MATCH' | 'MISMATCH';
  behavioralBounds: 'PASS' | 'REVIEW' | 'FAIL';
  fuzzTestsCompleted: number;
  fuzzTestsTotal: number;
  triggerIndicators: 'NONE DETECTED' | 'SUSPICIOUS CLUSTER' | 'DETECTED';
  sha256Digest: string;
  signedBy: string;
  tpmSeal: string;
  patchTriggerScan: { status: string; detail: string };
  weightBitFlipTest: { status: string; detail: string };
  quantizationInvariance: { status: string; detail: string };
}

export interface ProvenanceResult {
  score: number;
  status: EngineVerificationStatus;
  frameId: string;
  latencyMs: number;
  inputFrameHash: string;
  ecdsaAttestation: string;
  executionHardware: string;
  pipelineSteps: {
    step: number;
    name: string;
    verified: boolean;
  }[];
  detectionSample: {
    label: string;
    confidence: number;
    bbox: [number, number, number, number];
  };
}

export interface DistributionShiftResult {
  riskScore: number;
  status: EngineVerificationStatus;
  classification: 'LEGITIMATE_SHIFT' | 'BENIGN_BASELINE' | 'MALICIOUS_SHIFT';
  findingTitle: string;
  findingDescription: string;
  mmd: number;
  mmdThreshold: number;
  wasserstein: number;
  adversarialRisk: number;
  ambientLux: string;
  aerosolIndex: string;
  cameraCleanliness: string;
  lensOcclusion: string;
  recommendedMitigation: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  event: string;
  source: string;
  severity: SeverityLevel;
  hash: string;
  previousHash: string;
  actor: string;
  evidence: string;
  decision: DecisionStatus;
  status: 'COMMITTED' | 'QUARANTINED' | 'FLAGGED';
}

export interface EvidenceDetail {
  title: string;
  triggerCondition: string;
  diagnostics: Record<string, string>;
  integrityAssertion: string;
}
