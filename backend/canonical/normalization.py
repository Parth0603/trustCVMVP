"""
canonical/normalization.py — Statistics and parse_result compatibility bridge

Computes canonical statistics from CanonicalDataset.
Also provides legacy_parse_result() so existing assurance engines work
without modification during the transition period.
"""
from __future__ import annotations
import math
from typing import Dict, Any, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .models import CanonicalDataset


def compute_statistics(dataset: "CanonicalDataset") -> Dict[str, Any]:
    """
    Compute dataset statistics from canonical objects.
    All numbers come from real canonical data — never fabricated.
    """
    total_samples = dataset.total_samples
    valid_samples = len(dataset.valid_samples)
    invalid_samples = len(dataset.invalid_samples)

    all_anns = dataset.all_annotations
    total_annotations = len(all_anns)

    class_dist = dataset.class_distribution()

    # Shannon entropy over class distribution
    entropy = 0.0
    if total_annotations > 0:
        for count in class_dist.values():
            p = count / total_annotations
            if p > 0:
                entropy -= p * math.log2(p)
    nc = max(1, len(class_dist))
    max_entropy = math.log2(nc) if nc > 1 else 1.0
    norm_entropy = round(min(1.0, entropy / max(1e-6, max_entropy)), 4)

    # Missing annotation count
    missing_annotation_count = sum(
        1 for s in dataset.valid_samples if not s.annotations
    )

    # Bbox area distribution
    bbox_areas = []
    for ann in all_anns:
        if ann.bbox:
            bbox_areas.append(ann.bbox.width * ann.bbox.height)

    mean_bbox_area = round(sum(bbox_areas) / max(1, len(bbox_areas)), 6) if bbox_areas else 0.0

    return {
        "total_samples": total_samples,
        "valid_samples": valid_samples,
        "invalid_samples": invalid_samples,
        "total_annotations": total_annotations,
        "missing_annotation_count": missing_annotation_count,
        "class_distribution": {
            cls: {"count": cnt, "percentage": round(cnt / max(1, total_annotations) * 100, 2)}
            for cls, cnt in class_dist.items()
        },
        "class_names": list(dataset.classes.values()),
        "num_classes": len(dataset.classes),
        "shannon_entropy": norm_entropy,
        "mean_bbox_area": mean_bbox_area,
        "source_format": dataset.source_format,
        "task": dataset.task,
    }


def legacy_parse_result(dataset: "CanonicalDataset") -> Dict[str, Any]:
    """
    Converts CanonicalDataset into the dict shape that DataIntegrityEngine
    currently expects from the old parsers.

    This allows the assurance engine to be refactored incrementally:
    the engine still accepts a dict, but that dict is now computed from
    the canonical model — not from a format-specific parser.

    Once DataIntegrityEngine is migrated to consume CanonicalDataset directly,
    this bridge can be removed.
    """
    class_dist = dataset.class_distribution()
    # class_counts: {class_name: int}
    class_counts = {name: class_dist.get(name, 0) for name in dataset.classes.values()}

    # image_annotations: {image_filename: [{class_id, class_name, bbox}]}
    image_annotations: Dict[str, List[Dict[str, Any]]] = {}
    for sample in dataset.samples:
        key = sample.source_id or sample.sample_id
        image_annotations[key] = []
        for ann in sample.annotations:
            entry: Dict[str, Any] = {
                "class_id": ann.class_id,
                "class_name": ann.class_name,
            }
            if ann.bbox:
                entry["bbox"] = [
                    ann.bbox.x_center,
                    ann.bbox.y_center,
                    ann.bbox.width,
                    ann.bbox.height,
                ]
            image_annotations[key].append(entry)

    # Count annotation validity from validation_errors
    critical_errors = [e for e in dataset.validation_errors if e.get("severity") == "CRITICAL"]
    invalid_annotations = len(critical_errors)

    # Structured defects — convert validation_errors to legacy defect format
    structured_defects: List[Dict[str, Any]] = []
    for err in dataset.validation_errors:
        structured_defects.append({
            "type": err.get("error_code", "INVALID_CANONICAL_ANNOTATION"),
            "file": err.get("sample_id", "annotations"),
            "severity": err.get("severity", "CRITICAL"),
            "description": err.get("description", ""),
        })

    return {
        "valid": len(critical_errors) == 0,
        "errors": [e["description"] for e in critical_errors[:25]],
        "total_images": dataset.total_samples,
        "total_labels": len([s for s in dataset.samples if s.annotations]),
        "missing_labels": [s.source_id for s in dataset.valid_samples if not s.annotations],
        "orphaned_labels": [],
        "empty_labels": [],
        "total_annotations": dataset.total_annotations,
        "valid_annotations": dataset.total_annotations - invalid_annotations,
        "invalid_annotations": invalid_annotations,
        "classes": dataset.classes,
        "class_counts": class_counts,
        "image_annotations": image_annotations,
        "structured_defects": structured_defects,
        "contributors": dataset.contributors,
        # Normalization metadata for the report
        "normalization_report": dataset.normalization_report,
        "source_format": dataset.source_format,
        "task": dataset.task,
    }
