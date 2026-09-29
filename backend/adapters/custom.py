"""
adapters/custom.py — Custom Dataset Adapter

For datasets that don't match YOLO/COCO/ClassFolder conventions.

Policy:
  - Look for explicit metadata (dataset.yaml, annotations.json, classes.json, etc.)
  - If deterministic interpretation is possible: normalize it
  - If not: return FORMAT_REQUIRES_CONFIGURATION — never silently guess semantics
"""
from __future__ import annotations
import json
import uuid
from pathlib import Path
from typing import Dict, Optional

from .base import DatasetAdapter
from .image_utils import IMAGE_EXTS, compute_sha256, load_image_meta
from ..canonical.models import CanonicalDataset, CanonicalSample, DatasetTask
from ..canonical.validation import CanonicalValidator


class CustomAdapter(DatasetAdapter):
    """
    Adapter for custom datasets.
    Returns FORMAT_REQUIRES_CONFIGURATION when structure is ambiguous.
    """

    @property
    def format_name(self) -> str:
        return "CUSTOM"

    def adapt(self) -> CanonicalDataset:
        # Attempt to find any known metadata file
        meta = self._find_metadata()

        if meta is None:
            # Can't deterministically interpret — count images for informational purposes
            image_files = [
                f for f in self.dataset_dir.rglob("*")
                if f.is_file() and f.suffix.lower() in IMAGE_EXTS
            ]
            return CanonicalDataset(
                dataset_id=self.dataset_id,
                source_format="CUSTOM",
                task=DatasetTask.UNKNOWN,
                classes={},
                metadata={"total_images_found": len(image_files)},
                validation_errors=[{
                    "error_code": "FORMAT_REQUIRES_CONFIGURATION",
                    "severity": "CRITICAL",
                    "category": "FORMAT_ERROR",
                    "description": (
                        f"Dataset at '{self.dataset_dir.name}' uses an unrecognized structure. "
                        f"Found {len(image_files)} image(s) but no supported metadata "
                        "(data.yaml, annotations.json, classes.json, instances*.json). "
                        "Provide explicit dataset configuration to enable analysis."
                    ),
                }],
            )

        # Basic image enumeration with hashes (no annotation semantics assumed)
        image_files = sorted([
            f for f in self.dataset_dir.rglob("*")
            if f.is_file() and f.suffix.lower() in IMAGE_EXTS
        ])
        samples = []
        for img_path in image_files:
            sample_id = str(uuid.uuid4())
            w, h, ch, fmt, img_err = load_image_meta(img_path)
            samples.append(CanonicalSample(
                sample_id=sample_id,
                image_path=str(img_path),
                image_hash=compute_sha256(img_path) if not img_err else None,
                width=w, height=h, channels=ch, image_format=fmt,
                is_valid_image=(img_err is None),
                image_error=img_err,
                source_id=img_path.name,
            ))

        dataset = CanonicalDataset(
            dataset_id=self.dataset_id,
            source_format="CUSTOM",
            task=DatasetTask.UNKNOWN,
            classes={},
            samples=samples,
            metadata={"metadata_file": str(meta)},
            validation_errors=[{
                "error_code": "FORMAT_REQUIRES_CONFIGURATION",
                "severity": "HIGH",
                "category": "FORMAT_ERROR",
                "description": (
                    f"Metadata file '{meta.name}' found but annotation semantics "
                    "could not be automatically mapped. "
                    "Image hashes and dimensions are recorded for integrity checks. "
                    "Annotation analysis requires explicit format configuration."
                ),
            }],
        )
        validator = CanonicalValidator()
        dataset.validation_errors.extend(validator.validate(dataset))

        dataset.normalization_report = self._make_normalization_report(
            total_samples=len(image_files),
            normalized_samples=len([s for s in samples if s.is_valid_image]),
            total_annotations=0,
            normalized_annotations=0,
            failed_annotations=0,
            extra={"metadata_file": str(meta), "task": DatasetTask.UNKNOWN},
        )
        return dataset

    def _find_metadata(self) -> Optional[Path]:
        """Look for any recognized metadata file."""
        candidates = [
            "dataset.yaml", "dataset.yml",
            "data.yaml", "data.yml",
            "annotations.json", "labels.json",
            "classes.json", "metadata.json",
        ]
        for name in candidates:
            hits = list(self.dataset_dir.rglob(name))
            if hits:
                return hits[0]
        return None
