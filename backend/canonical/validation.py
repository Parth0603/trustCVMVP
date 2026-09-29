"""
canonical/validation.py — TRUST-CV Format-Agnostic Annotation Validator

All formats pass through this single validator after normalization.
NO format-specific branches.

Error taxonomy:
  FORMAT_ERROR          — Structural schema problem (pre-normalization)
  ANNOTATION_ERROR      — Invalid post-normalization annotation value
  DATA_QUALITY          — Missing annotation file, empty annotation, etc.
  STATISTICAL_ANOMALY   — Outlier, NOT a validity violation
"""
from __future__ import annotations
from typing import List, Dict, Any, Optional, TYPE_CHECKING

from .coordinates import EPSILON, validate_canonical_bbox

if TYPE_CHECKING:
    from .models import CanonicalDataset, CanonicalSample, CanonicalAnnotation


# ─────────────────────────────────────────────────────────────
#  Severity levels (ordered)
# ─────────────────────────────────────────────────────────────
SEVERITY_CRITICAL = "CRITICAL"
SEVERITY_HIGH = "HIGH"
SEVERITY_MEDIUM = "MEDIUM"
SEVERITY_LOW = "LOW"
SEVERITY_INFO = "INFO"


def _finding(
    category: str,
    severity: str,
    error_code: str,
    description: str,
    sample_id: Optional[str] = None,
    annotation_id: Optional[str] = None,
    observed_value: Any = None,
    validation_rule: Optional[str] = None,
) -> Dict[str, Any]:
    f: Dict[str, Any] = {
        "category": category,
        "severity": severity,
        "error_code": error_code,
        "description": description,
    }
    if sample_id:
        f["sample_id"] = sample_id
    if annotation_id:
        f["annotation_id"] = annotation_id
    if observed_value is not None:
        f["observed_value"] = observed_value
    if validation_rule:
        f["validation_rule"] = validation_rule
    return f


class CanonicalValidator:
    """
    Validates a CanonicalDataset post-normalization.
    Populates dataset.validation_errors and returns a structured findings list.
    """

    def validate(self, dataset: "CanonicalDataset") -> List[Dict[str, Any]]:
        """
        Run all validation checks on the canonical dataset.
        Returns list of structured finding dicts (NEVER modifies annotations).
        """
        findings: List[Dict[str, Any]] = []
        valid_class_ids = set(dataset.classes.keys())

        for sample in dataset.samples:
            if not sample.is_valid_image:
                findings.append(_finding(
                    category="DATA_QUALITY",
                    severity=SEVERITY_HIGH,
                    error_code="UNREADABLE_IMAGE",
                    description=f"Image '{sample.source_id}' could not be decoded: {sample.image_error}",
                    sample_id=sample.sample_id,
                    observed_value=sample.image_error,
                    validation_rule="Image file must be readable and contain valid pixel data",
                ))
                continue  # no point validating annotations on a broken image

            if not sample.annotations:
                findings.append(_finding(
                    category="DATA_QUALITY",
                    severity=SEVERITY_HIGH,
                    error_code="MISSING_ANNOTATION",
                    description=f"Sample '{sample.source_id}' has no annotations.",
                    sample_id=sample.sample_id,
                    validation_rule="Each image in a detection/segmentation dataset should have at least one annotation",
                ))
                # Not CRITICAL — could be a valid background-only image in some protocols
                continue

            for ann in sample.annotations:
                findings.extend(
                    self._validate_annotation(ann, valid_class_ids, sample)
                )

        return findings

    def _validate_annotation(
        self,
        ann: "CanonicalAnnotation",
        valid_class_ids: set,
        sample: "CanonicalSample",
    ) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []

        # ── Class ID ─────────────────────────────────────────
        if ann.class_id not in valid_class_ids:
            findings.append(_finding(
                category="ANNOTATION_ERROR",
                severity=SEVERITY_CRITICAL,
                error_code="INVALID_CANONICAL_ANNOTATION",
                description=(
                    f"Annotation '{ann.annotation_id}' references unknown class_id={ann.class_id}. "
                    f"Valid ids: {sorted(valid_class_ids)}"
                ),
                sample_id=sample.sample_id,
                annotation_id=ann.annotation_id,
                observed_value=ann.class_id,
                validation_rule="class_id must be registered in the CanonicalClassRegistry",
            ))
            return findings  # no point checking geometry if class is unknown

        # ── Geometry by type ─────────────────────────────────
        if ann.geometry_type == "bbox":
            findings.extend(self._validate_bbox(ann, sample))

        elif ann.geometry_type == "polygon":
            findings.extend(self._validate_polygon(ann, sample))

        elif ann.geometry_type == "rle":
            # RLE is preserved as-is; structural check only
            if ann.rle is None:
                findings.append(_finding(
                    category="ANNOTATION_ERROR",
                    severity=SEVERITY_CRITICAL,
                    error_code="INVALID_CANONICAL_ANNOTATION",
                    description=f"Annotation '{ann.annotation_id}' is declared RLE but rle field is None.",
                    sample_id=sample.sample_id,
                    annotation_id=ann.annotation_id,
                    validation_rule="RLE annotations must carry the rle dict",
                ))

        elif ann.geometry_type == "image_label":
            pass  # class check already done above

        else:
            findings.append(_finding(
                category="FORMAT_ERROR",
                severity=SEVERITY_MEDIUM,
                error_code="UNSUPPORTED_TASK",
                description=f"Unknown geometry_type='{ann.geometry_type}'",
                sample_id=sample.sample_id,
                annotation_id=ann.annotation_id,
            ))

        return findings

    def _validate_bbox(
        self, ann: "CanonicalAnnotation", sample: "CanonicalSample"
    ) -> List[Dict[str, Any]]:
        findings = []
        if ann.bbox is None:
            findings.append(_finding(
                category="ANNOTATION_ERROR",
                severity=SEVERITY_CRITICAL,
                error_code="INVALID_CANONICAL_ANNOTATION",
                description=f"Annotation '{ann.annotation_id}' geometry_type='bbox' but bbox is None.",
                sample_id=sample.sample_id,
                annotation_id=ann.annotation_id,
                validation_rule="Detection annotations must have a valid CanonicalBBox",
            ))
            return findings

        bbox_errors = validate_canonical_bbox(
            ann.bbox.x_min, ann.bbox.y_min,
            ann.bbox.x_max, ann.bbox.y_max
        )
        for err in bbox_errors:
            findings.append(_finding(
                category="ANNOTATION_ERROR",
                severity=SEVERITY_CRITICAL,
                error_code="INVALID_CANONICAL_ANNOTATION",
                description=f"Annotation '{ann.annotation_id}' bbox violation: {err}",
                sample_id=sample.sample_id,
                annotation_id=ann.annotation_id,
                observed_value={
                    "x_min": ann.bbox.x_min, "y_min": ann.bbox.y_min,
                    "x_max": ann.bbox.x_max, "y_max": ann.bbox.y_max,
                },
                validation_rule=(
                    f"All normalized bbox coords must be in [0,1]±{EPSILON}; "
                    "x_min≤x_max, y_min≤y_max; width>0, height>0"
                ),
            ))
        return findings

    def _validate_polygon(
        self, ann: "CanonicalAnnotation", sample: "CanonicalSample"
    ) -> List[Dict[str, Any]]:
        findings = []
        pts = ann.segmentation
        if pts is None or len(pts) < 6:
            findings.append(_finding(
                category="ANNOTATION_ERROR",
                severity=SEVERITY_CRITICAL,
                error_code="INVALID_CANONICAL_ANNOTATION",
                description=(
                    f"Annotation '{ann.annotation_id}' polygon has fewer than 3 points "
                    f"(got {len(pts) // 2 if pts else 0})"
                ),
                sample_id=sample.sample_id,
                annotation_id=ann.annotation_id,
                validation_rule="Polygon segmentation must have at least 3 (x,y) point pairs",
            ))
            return findings

        for i in range(0, len(pts), 2):
            x = pts[i]
            y = pts[i + 1] if i + 1 < len(pts) else None
            if y is None:
                findings.append(_finding(
                    category="ANNOTATION_ERROR",
                    severity=SEVERITY_CRITICAL,
                    error_code="INVALID_CANONICAL_ANNOTATION",
                    description=f"Annotation '{ann.annotation_id}' polygon has odd number of coordinates",
                    sample_id=sample.sample_id,
                    annotation_id=ann.annotation_id,
                ))
                break
            if x < -EPSILON or x > 1 + EPSILON or y < -EPSILON or y > 1 + EPSILON:
                findings.append(_finding(
                    category="ANNOTATION_ERROR",
                    severity=SEVERITY_CRITICAL,
                    error_code="INVALID_CANONICAL_ANNOTATION",
                    description=(
                        f"Annotation '{ann.annotation_id}' polygon point ({x:.4f},{y:.4f}) outside [0,1]"
                    ),
                    sample_id=sample.sample_id,
                    annotation_id=ann.annotation_id,
                    observed_value={"x": x, "y": y},
                    validation_rule=f"Normalized polygon coordinates must be in [0,1]±{EPSILON}",
                ))
        return findings
