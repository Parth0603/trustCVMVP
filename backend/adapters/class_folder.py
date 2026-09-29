"""
adapters/class_folder.py — Class-Folder (ImageFolder) Dataset Adapter

Supports classification datasets organized as:

  dataset/
      cats/
          img1.jpg
      dogs/
          img2.jpg

or with train/val splits:

  dataset/
      train/
          cats/
          dogs/
      val/
          cats/
          dogs/

Folder names are used as class labels ONLY when the structure is unambiguous.
If the structure is ambiguous (flat dir with mixed files), returns
FORMAT_REQUIRES_CONFIGURATION.

Task: classification (image-level label, no bounding boxes).
"""
from __future__ import annotations
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Set

from .base import DatasetAdapter
from .image_utils import IMAGE_EXTS, compute_sha256, load_image_meta
from ..canonical.models import (
    CanonicalDataset, CanonicalSample, CanonicalAnnotation,
    DatasetTask,
)
from ..canonical.classes import CanonicalClassRegistry
from ..canonical.validation import CanonicalValidator

# Structural split folder names — NOT class names
_SPLIT_DIRS: Set[str] = {"train", "val", "test", "validation", "training"}


def _is_class_dir(p: Path) -> bool:
    """True if directory contains images directly (is a class folder)."""
    return p.is_dir() and any(
        f.suffix.lower() in IMAGE_EXTS for f in p.iterdir() if f.is_file()
    )


class ClassFolderAdapter(DatasetAdapter):
    """Adapter for class-folder / ImageFolder classification datasets."""

    @property
    def format_name(self) -> str:
        return "CLASS_FOLDER"

    def adapt(self) -> CanonicalDataset:
        # Try to detect class directories
        candidate_root = self._find_class_root()
        if candidate_root is None:
            return CanonicalDataset(
                dataset_id=self.dataset_id,
                source_format="CLASS_FOLDER",
                task=DatasetTask.UNKNOWN,
                classes={},
                validation_errors=[{
                    "error_code": "FORMAT_REQUIRES_CONFIGURATION",
                    "severity": "CRITICAL",
                    "category": "FORMAT_ERROR",
                    "description": (
                        "Cannot deterministically identify class folders. "
                        "Expected structure: <dataset>/<class_name>/<images>. "
                        "Provide explicit class configuration to proceed."
                    ),
                }],
            )

        # Discover class dirs
        class_dirs: List[Path] = sorted(
            d for d in candidate_root.iterdir() if _is_class_dir(d)
        )

        if not class_dirs:
            return CanonicalDataset(
                dataset_id=self.dataset_id,
                source_format="CLASS_FOLDER",
                task=DatasetTask.UNKNOWN,
                classes={},
                validation_errors=[{
                    "error_code": "FORMAT_REQUIRES_CONFIGURATION",
                    "severity": "CRITICAL",
                    "category": "FORMAT_ERROR",
                    "description": "No class subdirectories with images found.",
                }],
            )

        # Build registry from folder names
        registry = CanonicalClassRegistry()
        class_names = [d.name for d in class_dirs]
        registry.register_from_names(class_names, "CLASS_FOLDER")

        # Build samples
        samples: List[CanonicalSample] = []
        adapter_errors: List[Dict] = []

        for class_dir in class_dirs:
            canonical_id = registry.canonical_id("CLASS_FOLDER", class_names.index(class_dir.name))
            class_name = registry.name(canonical_id)

            img_files = sorted(
                f for f in class_dir.iterdir()
                if f.is_file() and f.suffix.lower() in IMAGE_EXTS
            )
            for img_path in img_files:
                sample_id = str(uuid.uuid4())
                w, h, ch, fmt, img_err = load_image_meta(img_path)
                img_hash = compute_sha256(img_path) if img_err is None else None

                ann = CanonicalAnnotation(
                    annotation_id=f"ann-cls-{sample_id}",
                    sample_id=sample_id,
                    class_id=canonical_id,
                    class_name=class_name,
                    geometry_type="image_label",
                    source_metadata={
                        "format": "CLASS_FOLDER",
                        "source_dir": class_dir.name,
                        "source_file": img_path.name,
                    },
                    raw_annotation={"class_folder": class_dir.name, "file": img_path.name},
                )

                sample = CanonicalSample(
                    sample_id=sample_id,
                    image_path=str(img_path),
                    image_hash=img_hash,
                    width=w, height=h, channels=ch, image_format=fmt,
                    is_valid_image=(img_err is None),
                    image_error=img_err,
                    source_id=img_path.name,
                    annotations=[ann] if img_err is None else [],
                )
                if img_err:
                    adapter_errors.append({
                        "error_code": "UNREADABLE_IMAGE",
                        "severity": "HIGH",
                        "category": "DATA_QUALITY",
                        "description": img_err,
                        "sample_id": sample_id,
                    })

                samples.append(sample)

        dataset = CanonicalDataset(
            dataset_id=self.dataset_id,
            source_format="CLASS_FOLDER",
            task=DatasetTask.CLASSIFICATION,
            classes=registry.id_to_name,
            samples=samples,
            validation_errors=adapter_errors,
        )
        validator = CanonicalValidator()
        dataset.validation_errors.extend(validator.validate(dataset))

        dataset.normalization_report = self._make_normalization_report(
            total_samples=len(samples),
            normalized_samples=len([s for s in samples if s.is_valid_image]),
            total_annotations=len(samples),
            normalized_annotations=len([s for s in samples if s.is_valid_image]),
            failed_annotations=len([s for s in samples if not s.is_valid_image]),
            extra={
                "class_registry": registry.to_dict(),
                "task": DatasetTask.CLASSIFICATION,
                "class_dirs_found": [d.name for d in class_dirs],
            },
        )

        return dataset

    def _find_class_root(self) -> Optional[Path]:
        """
        Find the directory that directly contains class-named subdirs.
        Handles flat layout and train/val split layouts.
        """
        # Check if root itself has class dirs
        if any(_is_class_dir(d) for d in self.dataset_dir.iterdir() if d.is_dir()
               and d.name.lower() not in _SPLIT_DIRS):
            return self.dataset_dir

        # Check one level down (train/val/test splits)
        for split_dir in self.dataset_dir.iterdir():
            if split_dir.is_dir() and split_dir.name.lower() in _SPLIT_DIRS:
                if any(_is_class_dir(d) for d in split_dir.iterdir() if d.is_dir()):
                    return split_dir

        return None
