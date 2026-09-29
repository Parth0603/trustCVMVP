from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum
from datetime import datetime

class AssessmentStatus(str, Enum):
    QUEUED = "QUEUED"
    VALIDATING = "VALIDATING"
    NORMALIZING = "NORMALIZING"
    ANALYZING_DATA = "ANALYZING_DATA"
    ANALYZING_MODEL = "ANALYZING_MODEL"
    VERIFYING_PROVENANCE = "VERIFYING_PROVENANCE"
    ANALYZING_SHIFT = "ANALYZING_SHIFT"
    FUSING_EVIDENCE = "FUSING_EVIDENCE"
    GENERATING_REPORT = "GENERATING_REPORT"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class DecisionStatus(str, Enum):
    ACCEPT = "ACCEPT"
    REVIEW = "REVIEW"
    QUARANTINE = "QUARANTINE"

class DatasetFormat(str, Enum):
    COCO = "COCO"
    YOLO = "YOLO"
    CUSTOM = "CUSTOM"
    UNKNOWN = "UNKNOWN"

class UploadDatasetResponse(BaseModel):
    upload_id: str
    dataset_name: str
    detected_format: DatasetFormat
    format: Optional[str] = None
    file_count: int
    size_bytes: int
    dataset_size_bytes: Optional[int] = None
    validation_status: str
    number_of_images: int
    total_images: Optional[int] = None
    number_of_annotations: int
    total_annotations: Optional[int] = None
    number_of_classes: int
    num_classes: Optional[int] = None
    class_names: List[str]
    validation_errors: List[str] = []
    message: str

class UploadModelResponse(BaseModel):
    model_id: str
    model_name: str
    model_format: str
    size_bytes: int
    sha256: str
    access_mode: str
    message: str

class StartAssessmentRequest(BaseModel):
    dataset_upload_id: str
    model_upload_id: Optional[str] = None
    reference_upload_id: Optional[str] = None
    baseline_reference_id: Optional[str] = "highway_daylight_v2"
    selected_engines: List[str] = Field(default_factory=lambda: ["data", "model", "provenance", "shift"])

class StartAssessmentResponse(BaseModel):
    assessment_id: str
    status: AssessmentStatus
    created_at: str
    message: str

class ClassDistributionItem(BaseModel):
    class_name: str
    count: int
    percentage: float
    color_class: Optional[str] = None

class DataIntegrityResult(BaseModel):
    score: int
    status: str
    benchmark_set: str
    total_images: int
    valid_images: int
    corrupted_images: int
    unique_images: int
    duplicate_images: int
    duplicate_groups: List[List[str]]
    near_duplicate_images: int
    near_duplicate_groups: List[List[str]]
    total_annotations: int
    invalid_annotations: int
    out_of_distribution: int
    anomaly_ratio: float
    label_conflicts: int
    shannon_entropy: float
    class_distribution: List[ClassDistributionItem]
    image_statistics: Dict[str, Any]
    anomaly_indicators: List[Dict[str, Any]]
    poisoning_indicators: List[Dict[str, Any]]

class BehavioralTestItem(BaseModel):
    test_name: str
    description: str
    status: str
    confidence_delta: float
    output_consistent: bool

class ModelIntegrityResult(BaseModel):
    score: int
    status: str
    model_name: str
    model_format: str
    model_sha256: str
    reference_sha256: Optional[str] = None
    fingerprint_status: str
    access_mode: str
    behavioral_status: str
    fuzz_tests_passed: int
    fuzz_tests_total: int
    behavioral_tests: List[BehavioralTestItem]
    trigger_indicators: str
    tpm_seal: str
    signed_by: str
    reason: Optional[str] = None

class ProvenanceStep(BaseModel):
    step: int
    name: str
    verified: bool

class ProvenanceResult(BaseModel):
    score: int
    status: str
    input_hash: str
    model_hash: str
    config_hash: str
    output_hash: str
    timestamp: str
    nonce: str
    signature: str
    public_key: str
    signature_valid: bool
    chain_verified: bool
    pipeline_steps: List[ProvenanceStep]

class DistributionShiftResult(BaseModel):
    metric: str
    mmd_value: Optional[float] = None
    mmd_threshold: float = 0.12
    wasserstein_value: Optional[float] = None
    shift_level: str
    has_reference: bool
    classification: str
    status: str
    risk_score: int
    finding_title: str
    finding_description: str
    ambient_lux: Optional[str] = None
    aerosol_index: Optional[str] = None
    feature_divergence: Dict[str, Any] = Field(default_factory=dict)
    recommended_mitigation: str

class EvidenceItem(BaseModel):
    engine: str
    finding: str
    severity: str
    confidence: float
    evidence: str
    affected_asset: str

class GovernanceDecisionResult(BaseModel):
    status: DecisionStatus
    risk_score: int
    confidence: int
    reason: str
    recommended_action: str
    affected_asset: str
    findings: List[EvidenceItem]

class TrustChainNode(BaseModel):
    name: str
    status: str
    isSafe: bool
    routeKey: str

class AssessmentSummaryResponse(BaseModel):
    id: str
    cycle_id: str
    status: AssessmentStatus
    created_at: str
    completed_at: Optional[str] = None
    target_model: str
    model_runtime: str
    benchmark_dataset: str
    overall_verdict: DecisionStatus
    risk_score: int
    model_confidence: int
    air_gapped: bool
    baseline_name: str
    trust_chain: List[TrustChainNode]
    engine_scores: Dict[str, Any]
    current_finding: Dict[str, Any]

class AuditRecordSchema(BaseModel):
    id: str
    timestamp: str
    event: str
    source: str
    severity: str
    hash: str
    previous_hash: str
    actor: str
    evidence: str
    decision: str
    status: str

class AssuranceReportResponse(BaseModel):
    assessment_id: str
    cycle_id: str
    created_at: str
    target: str
    status: str
    executive_summary: str
    pillars: List[Dict[str, Any]]
    governance_verdict: Dict[str, Any]
    scope_and_limitations: List[str]
    crypto_signature: str
    notarization: str

class VerifyProvenanceRequest(BaseModel):
    input_hash: str
    model_hash: str
    output_hash: str
    nonce: str
    timestamp: str
    signature: str
    public_key: str

class VerifyProvenanceResponse(BaseModel):
    valid: bool
    reason: str
    canonical_payload: str
