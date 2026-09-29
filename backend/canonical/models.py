"""
canonical/models.py — TRUST-CV Canonical Data Model

Formal internal schema for ALL dataset formats.
Assurance engines consume only these types — never raw parser output.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# ─────────────────────────────────────────────────────────────
#  Task types
# ─────────────────────────────────────────────────────────────

class DatasetTask:
    CLASSIFICATION = "classification"
    DETECTION = "detection"
    SEGMENTATION = "segmentation"
    KEYPOINT = "keypoint"
    UNKNOWN = "unknown"


# ─────────────────────────────────────────────────────────────
#  Error taxonomy
# ─────────────────────────────────────────────────────────────

class ErrorCategory:
    FORMAT_ERROR          = "FORMAT_ERROR"
    DATA_QUALITY          = "DATA_QUALITY"
    ANNOTATION_ERROR      = "ANNOTATION_ERROR"
    STATISTICAL_ANOMALY   = "STATISTICAL_ANOMALY"
    DUPLICATE             = "DUPLICATE"
    OOD_INDICATOR         = "OOD_INDICATOR"
    POISONING_INDICATOR   = "POISONING_INDICATOR"
    PROVENANCE_FAILURE    = "PROVENANCE_FAILURE"
    MODEL_INTEGRITY       = "MODEL_INTEGRITY_FAILURE"
    DISTRIBUTION_SHIFT    = "DISTRIBUTION_SHIFT"


# ─────────────────────────────────────────────────────────────
#  Canonical BBox
# ─────────────────────────────────────────────────────────────

@dataclass
class CanonicalBBox:
    """
    Normalized image-space bounding box.
    All values in [0, 1] with EPSILON tolerance.
    """
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    x_center: float
    y_center: float
    width: float          # normalized width  = x_max - x_min
    height: float         # normalized height = y_max - y_min
    coordinate_space: str = "NORMALIZED_IMAGE_SPACE"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "x_min": self.x_min,
            "y_min": self.y_min,
            "x_max": self.x_max,
            "y_max": self.y_max,
            "x_center": self.x_center,
            "y_center": self.y_center,
            "width": self.width,
            "height": self.height,
            "coordinate_space": self.coordinate_space,
        }


# ─────────────────────────────────────────────────────────────
#  Canonical Annotation
# ─────────────────────────────────────────────────────────────

@dataclass
class CanonicalAnnotation:
    """
    Single annotation in canonical form.
    geometry_type determines which geometry fields are populated.
    raw_annotation preserves original source for forensic auditability.
    """
    annotation_id: str
    sample_id: str
    class_id: int                         # canonical 0-indexed class ID
    class_name: str
    geometry_type: str                    # "bbox" | "polygon" | "rle" | "image_label"
    bbox: Optional[CanonicalBBox] = None
    segmentation: Optional[List[float]] = None   # flat normalized polygon points
    rle: Optional[Dict[str, Any]] = None
    keypoints: Optional[List[float]] = None
    confidence: Optional[float] = None
    attributes: Dict[str, Any] = field(default_factory=dict)
    # Forensic / provenance chain
    source_metadata: Dict[str, Any] = field(default_factory=dict)
    # Original raw representation (never mutated)
    raw_annotation: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "annotation_id": self.annotation_id,
            "sample_id": self.sample_id,
            "class_id": self.class_id,
            "class_name": self.class_name,
            "geometry_type": self.geometry_type,
            "bbox": self.bbox.to_dict() if self.bbox else None,
            "segmentation": self.segmentation,
            "rle": self.rle,
            "keypoints": self.keypoints,
            "confidence": self.confidence,
            "attributes": self.attributes,
            "source_metadata": self.source_metadata,
        }


# ─────────────────────────────────────────────────────────────
#  Canonical Sample
# ─────────────────────────────────────────────────────────────

@dataclass
class CanonicalSample:
    """
    Single image + its annotations.
    image_hash is SHA-256 of raw file bytes (computed by adapter).
    """
    sample_id: str
    image_path: str                           # absolute path string
    image_hash: Optional[str] = None          # SHA-256 hex
    width: Optional[int] = None
    height: Optional[int] = None
    channels: Optional[int] = None
    image_format: Optional[str] = None        # "JPEG" | "PNG" etc.
    annotations: List[CanonicalAnnotation] = field(default_factory=list)
    contributor_id: Optional[str] = None
    source_id: Optional[str] = None          # original filename / ID
    timestamp: Optional[str] = None
    environment: Optional[str] = None
    is_valid_image: bool = True
    image_error: Optional[str] = None         # set if image is unreadable
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sample_id": self.sample_id,
            "image_path": self.image_path,
            "image_hash": self.image_hash,
            "width": self.width,
            "height": self.height,
            "channels": self.channels,
            "image_format": self.image_format,
            "annotations": [a.to_dict() for a in self.annotations],
            "contributor_id": self.contributor_id,
            "source_id": self.source_id,
            "is_valid_image": self.is_valid_image,
            "image_error": self.image_error,
            "metadata": self.metadata,
        }


# ─────────────────────────────────────────────────────────────
#  Canonical Dataset
# ─────────────────────────────────────────────────────────────

@dataclass
class CanonicalDataset:
    """
    Top-level canonical representation of a dataset.
    This is the ONLY object passed into assurance engines.
    """
    dataset_id: str
    source_format: str               # "YOLO" | "COCO" | "CLASS_FOLDER" | "CUSTOM" | "UNKNOWN"
    task: str                        # DatasetTask.*
    classes: Dict[int, str]          # canonical_id → class_name
    samples: List[CanonicalSample] = field(default_factory=list)
    contributors: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    # Normalization report (populated by adapter after parsing)
    normalization_report: Dict[str, Any] = field(default_factory=dict)
    # Validation errors from the canonical validator
    validation_errors: List[Dict[str, Any]] = field(default_factory=list)

    # ── Convenience properties ──────────────────────────────

    @property
    def total_samples(self) -> int:
        return len(self.samples)

    @property
    def valid_samples(self) -> List[CanonicalSample]:
        return [s for s in self.samples if s.is_valid_image]

    @property
    def invalid_samples(self) -> List[CanonicalSample]:
        return [s for s in self.samples if not s.is_valid_image]

    @property
    def all_annotations(self) -> List[CanonicalAnnotation]:
        return [ann for s in self.samples for ann in s.annotations]

    @property
    def total_annotations(self) -> int:
        return sum(len(s.annotations) for s in self.samples)

    def class_distribution(self) -> Dict[str, int]:
        dist: Dict[str, int] = {name: 0 for name in self.classes.values()}
        for ann in self.all_annotations:
            dist[ann.class_name] = dist.get(ann.class_name, 0) + 1
        return dist

    def to_dict(self) -> Dict[str, Any]:
        return {
            "dataset_id": self.dataset_id,
            "source_format": self.source_format,
            "task": self.task,
            "classes": self.classes,
            "total_samples": self.total_samples,
            "valid_samples": len(self.valid_samples),
            "invalid_samples": len(self.invalid_samples),
            "total_annotations": self.total_annotations,
            "contributors": self.contributors,
            "metadata": self.metadata,
            "normalization_report": self.normalization_report,
            "validation_errors": self.validation_errors,
        }
