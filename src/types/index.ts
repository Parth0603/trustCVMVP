// TRUST-CV Core Domain Types

export type DecisionStatus = 'ACCEPT' | 'REVIEW' | 'QUARANTINE';
export type SeverityLevel = 'INFO' | 'WARNING' | 'CRITICAL';
export type VerificationStatus = 'VERIFIED' | 'FLAGGED' | 'BROKEN' | 'PENDING' | 'MISMATCH';
export type DriftLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface GovernanceDecision {
  status: DecisionStatus;
  reason: string;
  evidence: string[];
  confidence: number; // e.g. 96 for 96%
  timestamp: string;
  sourceEngine: string;
}

export interface ContributorInfo {
  id: string;
  name: string;
  role: string;
  samplesContributed: number;
  modelsSubmitted: number;
  integrityEvents: number;
  provenanceCompleteness: number; // percentage
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'VERIFIED' | 'FLAGGED' | 'SUSPENDED';
  lastActivity: string;
  publicFingerprint: string;
}

export interface DatasetState {
  name: string;
  format: string;
  totalSamples: number;
  poisonedSamples: number;
  duplicateSamples: number;
  oodSamples: number;
  spectralAnomalies: number;
  contributorRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  integrityScore: number; // 0 to 100
  isScanning: boolean;
  lastScanned: string;
  status: VerificationStatus;
  categories: { name: string; count: number; anomalies: number }[];
  contributors: ContributorInfo[];
}

export interface ActivationNeuron {
  id: number;
  layer: string;
  activationScore: number;
  baselineScore: number;
  isAnomalous: boolean;
}

export interface ModelIntegrityState {
  modelName: string;
  version: string;
  architecture: string;
  modelHash: string;
  baselineHash: string;
  fingerprintStatus: 'MATCH' | 'MISMATCH' | 'SUSPICIOUS BEHAVIOR';
  weightStatus: 'NORMAL' | 'PERTURBED' | 'BACKDOOR_INJECTED';
  weightDrift: number; // standard deviation deviation
  triggerRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  activationAnomaly: 'NONE' | 'SUSPICIOUS_CLUSTER' | 'DETECTED';
  suspiciousClusterDetected: boolean;
  blackBoxStatus: 'CONSISTENT' | 'DEVIATING' | 'FAILED';
  integrityScore: number;
  isAnalyzing: boolean;
  lastAnalyzed: string;
  activationHeatmap: ActivationNeuron[];
}

export interface ProvenanceEvent {
  step: string;
  stageName: string;
  description: string;
  hash: string;
  timestamp: string;
  signature: string;
  verified: boolean;
}

export interface InferenceState {
  inferenceId: string;
  sampleName: string;
  inputHash: string;
  modelHash: string;
  configHash: string;
  outputHash: string;
  expectedOutputHash: string;
  tamperedOutputHash: string;
  nonce: string;
  sequenceNumber: number;
  timestamp: string;
  signature: string;
  recoveredSignature: string;
  sealStatus: 'VERIFIED' | 'BROKEN';
  signatureStatus: 'VALID' | 'INVALID';
  isTampered: boolean;
  boundingDetections: {
    label: string;
    confidence: number;
    bbox: [number, number, number, number]; // [x, y, w, h] in percentages
    color: string;
  }[];
  temporalRootHash: string;
  provenanceEvents: ProvenanceEvent[];
}

export type DistributionScenarioType =
  | 'NORMAL'
  | 'NIGHT'
  | 'WEATHER'
  | 'SENSOR_CHANGE'
  | 'TERRAIN_CHANGE'
  | 'ADVERSARIAL_INPUT';

export interface DistributionScenario {
  type: DistributionScenarioType;
  label: string;
  description: string;
  mmd: number; // Maximum Mean Discrepancy
  wasserstein: number; // Wasserstein Distance
  confidence: number; // Percentage
  driftLevel: DriftLevel;
  classification: 'LEGITIMATE_SHIFT' | 'BENIGN_BASELINE' | 'MALICIOUS_SHIFT';
  decision: DecisionStatus;
  featureDrift: { feature: string; baseline: number; current: number }[];
  evidenceText: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  event: string;
  source: 'DATA_ENGINE' | 'MODEL_ENGINE' | 'INFERENCE_ENGINE' | 'PROVENANCE_ENGINE' | 'DISTRIBUTION_ENGINE' | 'GOVERNANCE' | 'SYSTEM';
  severity: SeverityLevel;
  hash: string;
  previousHash: string;
  actor: string;
  evidence: string;
  decision: DecisionStatus;
  status: 'COMMITTED' | 'QUARANTINED' | 'FLAGGED';
}

export interface SneakernetState {
  usbConnected: boolean;
  yubikeyAuthenticated: boolean;
  packageVerified: boolean;
  packageVersion: string;
  signatureValid: boolean;
  installed: boolean;
  lastUpdateTimestamp: string;
}

export interface SystemState {
  dataset: DatasetState | null;
  model: ModelIntegrityState | null;
  inference: InferenceState | null;
  distribution: {
    currentScenario: DistributionScenarioType;
    scenarios: Record<DistributionScenarioType, DistributionScenario>;
  } | null;
  governance: GovernanceDecision | null;
  auditEvents: AuditEvent[];
  sneakernet: SneakernetState;
  demoMode: boolean;
  judgeMode: boolean;
  demoStep: number;
  lastUpdated: string | null;
  systemTrustScore: number | null; // derived composite score 0-100 or null
  activeAssessmentId?: string;
  activeAssessmentStatus?: string;
  activeAssessmentSummary?: any;
  activeAssessmentData?: any;
  activeAssessmentModel?: any;
  activeAssessmentProvenance?: any;
  activeAssessmentShift?: any;
  activeAssessmentReport?: any;
}

