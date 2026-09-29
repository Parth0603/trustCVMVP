"""
adapters/yolo.py — YOLO Dataset Adapter

Converts YOLO format (data.yaml + images/ + labels/) to CanonicalDataset.

YOLO format:
  class_id  x_center  y_center  width  height   (all normalized 0–1)

Conversion:
  x_min = x_center - width / 2
  y_min = y_center - height / 2
  x_max = x_center + width / 2
  y_max = y_center + height / 2

Class definitions are read from data.yaml → names field.
If no data.yaml exists, falls back to classes.txt.
If neither exist, class_id is used as class_name (Class_N pattern).
"""
from __future__ import annotations
import uuid
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from .base import DatasetAdapter
from .image_utils import IMAGE_EXTS, compute_sha256, load_image_meta
from ..canonical.models import (
    CanonicalDataset, CanonicalSample, CanonicalAnnotation, CanonicalBBox,
    DatasetTask,
)
from ..canonical.classes import CanonicalClassRegistry
from ..canonical.coordinates import yolo_to_canonical, EPSILON
from ..canonical.validation import CanonicalValidator

# Files that look like .txt but are NEVER YOLO annotation files
_NON_LABEL_NAMES: Set[str] = {
    "readme.txt", "classes.txt", "notes.txt", "license.txt",
    "description.txt", "info.txt", "manifest.txt", "requirements.txt",
}
_NON_LABEL_DIRS: Set[str] = {"images", "imgs", "photos", "pictures", "__macosx"}


class YOLOAdapter(DatasetAdapter):
    """Adapter for YOLO object-detection datasets."""

    @property
    def format_name(self) -> str:
        return "YOLO"

    # ── Class loading ─────────────────────────────────────────

    def _load_class_registry(self) -> CanonicalClassRegistry:
        registry = CanonicalClassRegistry()

        # 1. data.yaml / data.yml
        yaml_files = list(self.dataset_dir.rglob("*.yaml")) + list(self.dataset_dir.rglob("*.yml"))
        for yf in yaml_files:
            try:
                with open(yf, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                if isinstance(data, dict) and "names" in data:
                    names = data["names"]
                    if isinstance(names, dict):
                        # {0: "cat", 1: "dog"}
                        id_to_name = {int(k): str(v) for k, v in names.items()}
                        registry.register_from_map(id_to_name, "YOLO")
                        return registry
                    elif isinstance(names, list):
                        registry.register_from_names(names, "YOLO")
                        return registry
            except Exception:
                continue

        # 2. classes.txt
        classes_txts = list(self.dataset_dir.rglob("classes.txt"))
        if classes_txts:
            try:
                with open(classes_txts[0], "r", encoding="utf-8") as f:
                    names = [line.strip() for line in f if line.strip()]
                if names:
                    registry.register_from_names(names, "YOLO")
                    return registry
            except Exception:
                pass

        # No class definitions found — will be inferred from detected IDs
        return registry

    # ── Label file discovery ──────────────────────────────────

    def _find_label_files(self) -> List[Path]:
        """Scan labels/ directory; fall back to flat layout with blocklist."""
        labels_dirs = [p for p in self.dataset_dir.rglob("labels") if p.is_dir()]
        if labels_dirs:
            labels_dir = min(labels_dirs, key=lambda p: len(p.parts))
            return sorted([
                f for f in labels_dir.rglob("*.txt")
                if f.is_file() and f.name.lower() not in _NON_LABEL_NAMES
            ])

        # Flat layout fallback
        result = []
        for f in sorted(self.dataset_dir.rglob("*.txt")):
            if not f.is_file():
                continue
            if f.name.lower() in _NON_LABEL_NAMES:
                continue
            parent_names = {p.name.lower() for p in f.parents}
            if parent_names & _NON_LABEL_DIRS:
                continue
            result.append(f)
        return result

    # ── Annotation parsing ────────────────────────────────────

    def _parse_annotation_line(
        self,
        line: str,
        line_idx: int,
        label_file: Path,
        registry: CanonicalClassRegistry,
        inferred_ids: set,
    ) -> Tuple[Optional[CanonicalAnnotation], Optional[Dict]]:
        """
        Parse one YOLO annotation line.
        Returns (CanonicalAnnotation, None) on success or (None, error_dict) on failure.
        """
        parts = line.split()
        if len(parts) != 5:
            return None, {
                "error_code": "INVALID_YOLO_LABEL",
                "severity": "CRITICAL",
                "file": label_file.name,
                "line": line_idx + 1,
                "description": (
                    f"{label_file.name}:L{line_idx+1} invalid field count "
                    f"({len(parts)} ≠ 5): «{line[:80]}»"
                ),
                "raw_line": line[:120],
                "validation_rule": "YOLO: exactly 5 whitespace-separated fields required",
            }

        try:
            src_cls_id = int(parts[0])
            xc = float(parts[1])
            yc = float(parts[2])
            w  = float(parts[3])
            h  = float(parts[4])
        except ValueError:
            return None, {
                "error_code": "INVALID_YOLO_LABEL",
                "severity": "CRITICAL",
                "file": label_file.name,
                "line": line_idx + 1,
                "description": (
                    f"{label_file.name}:L{line_idx+1} non-numeric values: {parts}"
                ),
                "raw_line": line[:120],
                "validation_rule": "All 5 fields must be numeric (int class_id, float coords)",
            }

        # Resolve class
        if registry.num_classes > 0:
            canonical_id = registry.canonical_id("YOLO", src_cls_id)
            if canonical_id is None:
                max_valid = max(registry.id_to_name.keys())
                return None, {
                    "error_code": "INVALID_YOLO_LABEL",
                    "severity": "CRITICAL",
                    "file": label_file.name,
                    "line": line_idx + 1,
                    "description": (
                        f"{label_file.name}:L{line_idx+1} unknown class_id={src_cls_id}; "
                        f"valid range [0, {max_valid}]"
                    ),
                    "observed_value": src_cls_id,
                    "validation_rule": "class_id must be defined in data.yaml names",
                }
        else:
            # No class definitions — infer
            canonical_id = src_cls_id
            inferred_ids.add(src_cls_id)

        class_name = registry.name(canonical_id) or f"Class_{canonical_id}"

        # Pre-normalization bounds check (YOLO-specific)
        coord_errors = []
        if xc < -EPSILON or xc > 1.0 + EPSILON:
            coord_errors.append(f"x_center={xc:.6f} ∉ [0,1]")
        if yc < -EPSILON or yc > 1.0 + EPSILON:
            coord_errors.append(f"y_center={yc:.6f} ∉ [0,1]")
        if w <= 0 or w > 1.0 + EPSILON:
            coord_errors.append(f"width={w:.6f} ∉ (0,1]")
        if h <= 0 or h > 1.0 + EPSILON:
            coord_errors.append(f"height={h:.6f} ∉ (0,1]")
        if coord_errors:
            return None, {
                "error_code": "INVALID_YOLO_LABEL",
                "severity": "CRITICAL",
                "file": label_file.name,
                "line": line_idx + 1,
                "description": (
                    f"{label_file.name}:L{line_idx+1} out-of-range YOLO coords: "
                    + "; ".join(coord_errors)
                ),
                "observed_value": {"xc": xc, "yc": yc, "w": w, "h": h},
                "validation_rule": "YOLO normalized coords: x_center,y_center∈[0,1]; width,height∈(0,1]",
            }

        canonical_coords = yolo_to_canonical(xc, yc, w, h)
        bbox = CanonicalBBox(**canonical_coords)

        ann_id = f"ann-{label_file.stem}-L{line_idx+1}"
        ann = CanonicalAnnotation(
            annotation_id=ann_id,
            sample_id=label_file.stem,
            class_id=canonical_id,
            class_name=class_name,
            geometry_type="bbox",
            bbox=bbox,
            source_metadata={
                "format": "YOLO",
                "source_file": label_file.name,
                "source_line": line_idx + 1,
                "source_class_id": src_cls_id,
            },
            raw_annotation={
                "class_id": src_cls_id,
                "x_center": xc, "y_center": yc,
                "width": w, "height": h,
            },
        )
        return ann, None

    # ── Main adapt ────────────────────────────────────────────

    def adapt(self) -> CanonicalDataset:
        registry = self._load_class_registry()
        inferred_ids: set = set()

        image_files = sorted([
            f for f in self.dataset_dir.rglob("*")
            if f.is_file() and f.suffix.lower() in IMAGE_EXTS
        ])
        label_files = self._find_label_files()

        image_map: Dict[str, Path] = {f.stem: f for f in image_files}
        label_map: Dict[str, Path] = {f.stem: f for f in label_files}

        samples: List[CanonicalSample] = []
        adapter_errors: List[Dict] = []
        total_annotations = 0
        normalized_annotations = 0

        for stem, img_path in image_map.items():
            sample_id = str(uuid.uuid4())
            w, h, ch, fmt, img_err = load_image_meta(img_path)

            sample = CanonicalSample(
                sample_id=sample_id,
                image_path=str(img_path),
                image_hash=compute_sha256(img_path) if img_err is None else None,
                width=w, height=h, channels=ch, image_format=fmt,
                is_valid_image=(img_err is None),
                image_error=img_err,
                source_id=img_path.name,
            )

            if img_err is not None:
                samples.append(sample)
                continue

            lbl_path = label_map.get(stem)
            if lbl_path is None:
                # Missing label — DATA_QUALITY
                adapter_errors.append({
                    "error_code": "MISSING_ANNOTATION",
                    "severity": "HIGH",
                    "category": "DATA_QUALITY",
                    "description": f"No annotation file for image '{img_path.name}'",
                    "sample_id": sample_id,
                })
                samples.append(sample)
                continue

            try:
                with open(lbl_path, "r", encoding="utf-8") as f:
                    lines = [ln.strip() for ln in f if ln.strip()]
            except Exception as e:
                adapter_errors.append({
                    "error_code": "FORMAT_ERROR",
                    "severity": "CRITICAL",
                    "category": "FORMAT_ERROR",
                    "description": f"Cannot read label file '{lbl_path.name}': {e}",
                    "sample_id": sample_id,
                })
                samples.append(sample)
                continue

            if not lines:
                adapter_errors.append({
                    "error_code": "DATA_QUALITY",
                    "severity": "HIGH",
                    "category": "DATA_QUALITY",
                    "description": f"Empty annotation file '{lbl_path.name}'",
                    "sample_id": sample_id,
                })
                samples.append(sample)
                continue

            for line_idx, line in enumerate(lines):
                total_annotations += 1
                ann, err = self._parse_annotation_line(
                    line, line_idx, lbl_path, registry, inferred_ids
                )
                if err:
                    err["category"] = "ANNOTATION_ERROR"
                    err["sample_id"] = sample_id
                    adapter_errors.append(err)
                else:
                    assert ann is not None
                    ann.sample_id = sample_id
                    sample.annotations.append(ann)
                    normalized_annotations += 1

            samples.append(sample)

        # Handle orphaned label files (no matching image)
        for stem, lbl_path in label_map.items():
            if stem not in image_map:
                adapter_errors.append({
                    "error_code": "ORPHANED_LABEL_FILE",
                    "severity": "MEDIUM",
                    "category": "DATA_QUALITY",
                    "description": f"Label file '{lbl_path.name}' has no matching image",
                })

        # Finalize class registry for inferred datasets
        if registry.num_classes == 0 and inferred_ids:
            for cid in sorted(inferred_ids):
                registry._register_one(cid, f"Class_{cid}", "YOLO", cid)

        # Run canonical validator
        dataset = CanonicalDataset(
            dataset_id=self.dataset_id,
            source_format="YOLO",
            task=DatasetTask.DETECTION,
            classes=registry.id_to_name,
            samples=samples,
            validation_errors=adapter_errors,
        )
        validator = CanonicalValidator()
        validator_findings = validator.validate(dataset)
        dataset.validation_errors.extend(validator_findings)

        dataset.normalization_report = self._make_normalization_report(
            total_samples=len(image_files),
            normalized_samples=len([s for s in samples if s.is_valid_image]),
            total_annotations=total_annotations,
            normalized_annotations=normalized_annotations,
            failed_annotations=total_annotations - normalized_annotations,
            extra={
                "class_registry": registry.to_dict(),
                "task": DatasetTask.DETECTION,
            },
        )

        return dataset
