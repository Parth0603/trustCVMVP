"""
parsers/dataset_inspector.py — Universal Dataset Inspection Entry Point

This is the single entry point for all dataset analysis.
It delegates to:
  1. DatasetFormatDetector  (format auto-detection)
  2. Format-specific adapter (YOLO/COCO/ClassFolder/Custom)
  3. CanonicalDataset        (normalized representation)
  4. legacy_parse_result()   (bridge to existing assurance engines)

The returned dict always contains:
  - detected_format
  - task
  - normalization_report
  - parse_result  (canonical bridge dict for DataIntegrityEngine)
  - canonical     (CanonicalDataset object for future direct consumption)
"""
from pathlib import Path
from typing import Dict, Any, Optional

from ..ingestion.detector import DatasetFormatDetector
from ..canonical.normalization import legacy_parse_result, compute_statistics
from ..adapters.image_utils import IMAGE_EXTS


class DatasetInspector:
    def __init__(self, dataset_dir: Path, dataset_id: Optional[str] = None):
        self.dataset_dir = dataset_dir
        self.dataset_id = dataset_id or dataset_dir.name

    def inspect(self) -> Dict[str, Any]:
        """
        Auto-detect format, normalize to canonical, and return a unified inspection result.
        """
        detector = DatasetFormatDetector(self.dataset_dir, self.dataset_id)
        detection = detector.detect()

        image_files = [
            f for f in self.dataset_dir.rglob("*")
            if f.is_file() and f.suffix.lower() in IMAGE_EXTS
        ]
        total_size = sum(
            f.stat().st_size for f in self.dataset_dir.rglob("*") if f.is_file()
        )

        # Handle AMBIGUOUS or no adapter
        if detection.is_ambiguous or not detection.is_usable:
            errors = []
            if detection.is_ambiguous:
                errors = [{
                    "error_code": "AMBIGUOUS_DATASET_FORMAT",
                    "severity": "HIGH",
                    "category": "FORMAT_ERROR",
                    "description": "; ".join(detection.evidence),
                }]
            else:
                errors = [{
                    "error_code": "FORMAT_REQUIRES_CONFIGURATION",
                    "severity": "CRITICAL",
                    "category": "FORMAT_ERROR",
                    "description": "No recognizable dataset format detected.",
                }]

            return {
                "detected_format": detection.format_name,
                "task": "unknown",
                "dataset_name": self.dataset_dir.name,
                "number_of_images": len(image_files),
                "number_of_annotations": 0,
                "number_of_classes": 0,
                "class_names": [],
                "dataset_size_bytes": total_size,
                "validation_status": "AMBIGUOUS" if detection.is_ambiguous else "UNKNOWN",
                "normalization_report": {
                    "source_format": detection.format_name,
                    "ambiguous_formats": detection.ambiguous_formats,
                    "evidence": detection.evidence,
                },
                "parse_result": {
                    "valid": False,
                    "errors": [e["description"] for e in errors],
                    "total_images": len(image_files),
                    "total_annotations": 0,
                    "valid_annotations": 0,
                    "invalid_annotations": 0,
                    "classes": {},
                    "class_counts": {},
                    "image_annotations": {},
                    "structured_defects": errors,
                    "normalization_report": {},
                    "source_format": detection.format_name,
                    "task": "unknown",
                },
                "canonical": None,
                "format_evidence": detection.evidence,
            }

        # Run the adapter → CanonicalDataset
        adapter = detection.adapter
        canonical = adapter.adapt()

        # Compute statistics from canonical data
        stats = compute_statistics(canonical)

        # Legacy bridge for existing DataIntegrityEngine
        parse_result = legacy_parse_result(canonical)

        return {
            "detected_format": canonical.source_format,
            "task": canonical.task,
            "dataset_name": self.dataset_dir.name,
            "number_of_images": canonical.total_samples,
            "number_of_annotations": canonical.total_annotations,
            "number_of_classes": len(canonical.classes),
            "class_names": list(canonical.classes.values()),
            "dataset_size_bytes": total_size,
            "validation_status": "VALID" if not any(
                e.get("severity") == "CRITICAL"
                for e in canonical.validation_errors
            ) else "INVALID",
            "normalization_report": canonical.normalization_report,
            "parse_result": parse_result,
            "canonical": canonical,
            "format_evidence": detection.evidence,
            "statistics": stats,
        }
