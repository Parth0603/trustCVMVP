import { SystemState } from '../types';
import {
  INITIAL_CONTRIBUTORS,
  INITIAL_CATEGORIES,
  INITIAL_HEATMAP_NEURONS,
  DISTRIBUTION_SCENARIOS,
  TEMPORAL_FRAMES_MOCK
} from './mockData';
import {
  pseudoHash,
  generateEd25519Signature,
  computeMerkleRoot
} from '../utils/crypto';
import { formatTimestamp } from '../utils/helpers';

const initialModelHash = pseudoHash('TRUST-CV-DEFENSE-BACKBONE-v2.4.1');
const initialInputHash = pseudoHash('RAW-SENSOR-FEED-ISR-ALPHA-CAM01-FRAME0925');
const initialConfigHash = pseudoHash('RUNTIME-INFERENCE-QUANT-FP16-DGIS-CONF');
const initialOutputHash = pseudoHash('BOUNDING-BBOX-MANIFEST-CLEAN-0925');
const initialTamperedHash = pseudoHash('TAMPERED-INJECTED-PHANTOM-TARGET-MANIFEST');

const baselineLeaves = TEMPORAL_FRAMES_MOCK.map((f) => f.hash);
const initialMerkleRoot = computeMerkleRoot(baselineLeaves);

export const getInitialState = (): SystemState => {
  const now = formatTimestamp();

  return {
    dataset: {
      name: 'ISR-Vision-Alpha',
      format: 'COCO / YOLOv8-GeoAnnotation',
      totalSamples: 12480,
      poisonedSamples: 0,
      duplicateSamples: 14,
      oodSamples: 3,
      spectralAnomalies: 2,
      contributorRisk: 'LOW',
      integrityScore: 98.7,
      isScanning: false,
      lastScanned: now,
      status: 'VERIFIED',
      categories: JSON.parse(JSON.stringify(INITIAL_CATEGORIES)),
      contributors: JSON.parse(JSON.stringify(INITIAL_CONTRIBUTORS))
    },
    model: {
      modelName: 'TRUST-CV Vision Model v2.4',
      version: 'v2.4.1-rc3-DGIS',
      architecture: 'CSPDarknet53-Defense-Backbone + BiFPN',
      modelHash: initialModelHash,
      baselineHash: initialModelHash,
      fingerprintStatus: 'MATCH',
      weightStatus: 'NORMAL',
      weightDrift: 0.012,
      triggerRisk: 'LOW',
      activationAnomaly: 'NONE',
      suspiciousClusterDetected: false,
      blackBoxStatus: 'CONSISTENT',
      integrityScore: 96.4,
      isAnalyzing: false,
      lastAnalyzed: now,
      activationHeatmap: JSON.parse(JSON.stringify(INITIAL_HEATMAP_NEURONS))
    },
    inference: {
      inferenceId: 'INF-20260925-0842-DGIS',
      sampleName: 'SECTOR-NORTH-UAV-PATROL-0925.RAW',
      inputHash: initialInputHash,
      modelHash: initialModelHash,
      configHash: initialConfigHash,
      outputHash: initialOutputHash,
      expectedOutputHash: initialOutputHash,
      tamperedOutputHash: initialTamperedHash,
      nonce: '0x8F9C21A4B7D03E19',
      sequenceNumber: 10429,
      timestamp: now,
      signature: generateEd25519Signature(initialOutputHash),
      recoveredSignature: generateEd25519Signature(initialOutputHash),
      sealStatus: 'VERIFIED',
      signatureStatus: 'VALID',
      isTampered: false,
      boundingDetections: [
        { label: 'Recon UAV (Airborne)', confidence: 94.2, bbox: [18, 22, 28, 19], color: '#38BDF8' },
        { label: 'Tactical Mobile Asset', confidence: 91.8, bbox: [58, 62, 24, 25], color: '#10B981' },
        { label: 'Air Defence Radar Radar', confidence: 89.5, bbox: [32, 48, 20, 26], color: '#06B6D4' }
      ],
      temporalRootHash: initialMerkleRoot,
      provenanceEvents: [
        {
          step: 'ST-01',
          stageName: 'INPUT RECEIVED',
          description: 'Raw EO sensor payload ingested via secure air-gapped interface with hardware timestamp.',
          hash: initialInputHash,
          timestamp: now,
          signature: generateEd25519Signature(initialInputHash),
          verified: true
        },
        {
          step: 'ST-02',
          stageName: 'MODEL VERIFIED',
          description: 'Model weight cryptographic fingerprint evaluated against baseline registry.',
          hash: initialModelHash,
          timestamp: now,
          signature: generateEd25519Signature(initialModelHash),
          verified: true
        },
        {
          step: 'ST-03',
          stageName: 'CONFIG VERIFIED',
          description: 'Quantization parameters, NMS thresholds, and hyper-parameters validated.',
          hash: initialConfigHash,
          timestamp: now,
          signature: generateEd25519Signature(initialConfigHash),
          verified: true
        },
        {
          step: 'ST-04',
          stageName: 'INFERENCE GENERATED',
          description: 'Forward pass completed; 3 target bounding regions localized with 91.8% mean confidence.',
          hash: pseudoHash('INFERENCE-FORWARD-PASS-OK'),
          timestamp: now,
          signature: generateEd25519Signature(pseudoHash('INFERENCE-FORWARD-PASS-OK')),
          verified: true
        },
        {
          step: 'ST-05',
          stageName: 'OUTPUT SEALED',
          description: 'Cryptographic pixel seal steganographically bound into output manifest and bitstream.',
          hash: initialOutputHash,
          timestamp: now,
          signature: generateEd25519Signature(initialOutputHash),
          verified: true
        },
        {
          step: 'ST-06',
          stageName: 'PROVENANCE COMMITTED',
          description: 'Immutable provenance record committed to air-gapped cryptographic journal.',
          hash: pseudoHash(initialInputHash + initialModelHash + initialOutputHash),
          timestamp: now,
          signature: generateEd25519Signature(pseudoHash(initialInputHash + initialModelHash + initialOutputHash)),
          verified: true
        }
      ]
    },
    distribution: {
      currentScenario: 'NORMAL',
      scenarios: DISTRIBUTION_SCENARIOS
    },
    governance: {
      status: 'ACCEPT',
      reason: 'No significant integrity anomalies detected across multi-contributor pipeline.',
      evidence: [
        'Model weight fingerprint matches registered sovereign baseline',
        'Cryptographic provenance chain verified with valid Ed25519 signatures',
        'Steganographic pixel seal verified with zero bitstream modification',
        'Environmental distribution drift within baseline tolerances (MMD 0.08)'
      ],
      confidence: 96,
      timestamp: now,
      sourceEngine: 'GOVERNANCE_CONSENSUS'
    },
    auditEvents: [
      {
        id: 'AUD-0091',
        timestamp: now,
        event: 'System Baseline Integrity Audit Completed',
        source: 'GOVERNANCE',
        severity: 'INFO',
        hash: pseudoHash('AUD-0091-INIT'),
        previousHash: pseudoHash('GENESIS-BLOCK-HASH'),
        actor: 'DGIS-SOV-AGENT-01',
        evidence: 'All 5 integrity assurance engines operational in air-gapped configuration.',
        decision: 'ACCEPT',
        status: 'COMMITTED'
      },
      {
        id: 'AUD-0090',
        timestamp: now,
        event: 'Model Fingerprint Verified',
        source: 'MODEL_ENGINE',
        severity: 'INFO',
        hash: initialModelHash,
        previousHash: pseudoHash('AUD-0089-HASH'),
        actor: 'Sovereign Checksum Validator',
        evidence: 'SHA-256 weight hash matches baseline without deviation.',
        decision: 'ACCEPT',
        status: 'COMMITTED'
      },
      {
        id: 'AUD-0089',
        timestamp: now,
        event: 'Dataset Ingestion Quality Check',
        source: 'DATA_ENGINE',
        severity: 'INFO',
        hash: pseudoHash('DATASET-ISR-VISION-ALPHA-INGEST'),
        previousHash: pseudoHash('AUD-0088-HASH'),
        actor: 'Data Integrity Scanner',
        evidence: '12,480 samples indexed across 6 contributors with nominal spectral variance.',
        decision: 'ACCEPT',
        status: 'COMMITTED'
      }
    ],
    sneakernet: {
      usbConnected: false,
      yubikeyAuthenticated: false,
      packageVerified: false,
      packageVersion: 'v2026.09-DEF-SIG',
      signatureValid: true,
      installed: false,
      lastUpdateTimestamp: '2026-09-24 18:00:00 UTC'
    },
    demoMode: false,
    judgeMode: false,
    demoStep: 0,
    lastUpdated: now,
    systemTrustScore: 97,
    activeAssessmentId: 'ASSESS-ISR-001',
    activeAssessmentStatus: 'COMPLETED',
    activeAssessmentSummary: {
      id: 'ASSESS-ISR-001',
      cycle_id: 'CYCLE-20260925-01',
      target_model: 'TRUST-CV Vision Model v2.4 (CSPDarknet53)',
      model_runtime: 'ONNX Runtime (Air-Gapped Sovereign Enclave)',
      benchmark_dataset: 'ISR-Vision-Alpha (COCO/YOLO)',
      overall_verdict: 'ACCEPT',
      risk_score: 3,
      assessment_confidence: 96,
      model_confidence: 94,
      air_gapped: true,
      baseline_name: 'MoD / DGIS Sovereign Baseline',
      engine_scores: {
        data: 99,
        model: 96,
        provenance: 100,
        shift_risk: 8
      },
      current_finding: {
        title: 'Nominal Sovereign Baseline Certified',
        description: 'All 5 integrity assurance engines verified under FIPS 186-5 non-repudiation protocol.',
        type: 'INTEGRITY_CHECK'
      },
      timestamp: now
    },
    activeAssessmentData: {
      upload_id: 'UP-DATASET-01',
      dataset_name: 'ISR-Vision-Alpha',
      format: 'COCO',
      total_images: 12480,
      total_annotations: 42190,
      number_of_images: 12480,
      number_of_annotations: 42190,
      num_classes: 6,
      number_of_classes: 6,
      classes: JSON.parse(JSON.stringify(INITIAL_CATEGORIES)).map((c: any) => ({
        name: c.name,
        count: c.count,
        percentage: Math.round((c.count / 12480) * 100)
      })),
      dataset_size_bytes: 489201100,
      validation_status: 'VALID',
      validation_errors: [],
      status: 'VERIFIED',
      integrity_score: 99,
      exact_duplicate_count: 0,
      near_duplicate_count: 14,
      corrupted_images: 0,
      anomaly_indicators: [],
      poisoning_indicators: [],
      duplicate_clusters: [],
      contributors: JSON.parse(JSON.stringify(INITIAL_CONTRIBUTORS))
    },
    activeAssessmentModel: {
      analyzed: true,
      upload_id: 'UP-MODEL-01',
      model_name: 'TRUST-CV Vision Model v2.4',
      model_format: 'ONNX',
      model_size_bytes: 84920110,
      sha256: initialModelHash,
      fingerprint_match: 'MATCH',
      behavioral_bounds: 'PASS',
      fuzz_tests_completed: 1000,
      fuzz_tests_total: 1000,
      trigger_indicators: 'NONE DETECTED',
      behavioral_consistency: '99.8%',
      access_mode: 'WHITE_BOX',
      score: 96,
      status: 'VALID'
    },
    activeAssessmentProvenance: {
      analyzed: true,
      status: 'VALID',
      frame_id: '#FRAME-ISR-0925-ALPHA',
      latency_ms: 1.18,
      input_hash: initialInputHash,
      model_hash: initialModelHash,
      signature: generateEd25519Signature(initialOutputHash),
      signature_valid: true,
      chain_verified: true,
      score: 100,
      sample_label: 'Recon UAV (Airborne)',
      sample_confidence: 94.2,
      sample_bbox: [18, 22, 28, 19],
      pipeline_steps: [
        { step: 1, name: 'Sensor Ingest & SHA-256', verified: true },
        { step: 2, name: 'Model Attested Weight Match', verified: true },
        { step: 3, name: 'Isolated Enclave Execution', verified: true },
        { step: 4, name: 'Output Canonical Bitstream', verified: true },
        { step: 5, name: 'Ed25519 Digital Notarization', verified: true },
      ]
    },
    activeAssessmentShift: {
      status: 'VALID',
      reference_baseline_provided: true,
      has_reference: true,
      shift_level: 'LOW',
      risk_score: 8,
      mmd: 0.08,
      wasserstein: 0.04,
      adversarial_risk: 0.01,
      finding_description: 'Empirical MMD divergence is 0.08 with Wasserstein distance 0.04 (calibrated nominal operational bounds).'
    },
    activeAssessmentReport: {
      id: 'REP-ISR-2026-001',
      title: 'TRUST-CV Sovereign AI Integrity Assurance Report',
      generated_at: now,
      verdict: 'ACCEPT',
      certification: 'FIPS 180-4 / FIPS 186-5 Certified'
    }
  };
};
