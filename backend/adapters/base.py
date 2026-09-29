"""
adapters/base.py — Abstract DatasetAdapter

All format adapters must inherit from this class and implement adapt().
adapt() MUST return a CanonicalDataset.
adapt() MUST NOT return format-specific structures.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Dict, Any

from ..canonical.models import CanonicalDataset


class DatasetAdapter(ABC):
    """
    Base class for all format-specific dataset adapters.

    The critical contract:
      self.adapt() → CanonicalDataset

    Adapters are responsible for:
      1. Reading the raw format
      2. Mapping source IDs to canonical IDs via CanonicalClassRegistry
      3. Computing image hashes and dimensions
      4. Converting all coordinates to NORMALIZED_IMAGE_SPACE
      5. Preserving raw_annotation for forensic auditability
      6. Populating normalization_report

    Adapters are NOT responsible for:
      - Running assurance analysis
      - Computing integrity scores
      - Making risk/governance decisions
    """

    def __init__(self, dataset_dir: Path, dataset_id: Optional[str] = None):
        self.dataset_dir = dataset_dir
        self.dataset_id = dataset_id or dataset_dir.name

    @abstractmethod
    def adapt(self) -> CanonicalDataset:
        """
        Parse raw dataset and return a fully-normalized CanonicalDataset.
        Must never return None.
        """
        ...

    @property
    @abstractmethod
    def format_name(self) -> str:
        """Human-readable source format name e.g. 'YOLO', 'COCO'."""
        ...

    def _make_normalization_report(
        self,
        total_samples: int,
        normalized_samples: int,
        total_annotations: int,
        normalized_annotations: int,
        failed_annotations: int,
        extra: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        report = {
            "source_format": self.format_name,
            "coordinate_space": "NORMALIZED_IMAGE_SPACE",
            "total_samples": total_samples,
            "normalized_samples": normalized_samples,
            "total_annotations": total_annotations,
            "normalized_annotations": normalized_annotations,
            "failed_annotations": failed_annotations,
            "normalization_success": normalized_annotations == total_annotations,
            "source_metadata_preserved": True,
        }
        if extra:
            report.update(extra)
        return report
