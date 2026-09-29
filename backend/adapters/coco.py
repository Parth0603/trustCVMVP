"""
adapters/coco.py — COCO Dataset Adapter

Converts COCO JSON format to CanonicalDataset.

COCO bbox: [x, y, width, height] in pixel coordinates.
Conversion to normalized:
  x_min = x / img_w
  y_min = y / img_h
  x_max = (x + w) / img_w
  y_max = (y + h) / img_h

IMPORTANT: COCO category_id is NOT the canonical class_id.
The canonical class registry maps COCO category_id → sequential canonical_id.
Original COCO category_id is preserved in source_metadata.

Segmentation:
  - polygon → geometry_type="polygon", normalized coordinates stored
  - RLE     → geometry_type="rle", original dict preserved
"""
from __future__ import annotations
import json
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .base import DatasetAdapter
from .image_utils import IMAGE_EXTS, compute_sha256, load_image_meta
from ..canonical.models import (
    CanonicalDataset, CanonicalSample, CanonicalAnnotation, CanonicalBBox,
    DatasetTask,
)
from ..canonical.classes import CanonicalClassRegistry
from ..canonical.coordinates import coco_to_canonical, normalize_polygon, EPSILON
from ..canonical.validation import CanonicalValidator


class COCOAdapter(DatasetAdapter):
    """Adapter for COCO-format datasets (detection + segmentation)."""

    def __init__(self, annotation_file: Path, dataset_dir: Path, dataset_id: Optional[str] = None):
        super().__init__(dataset_dir, dataset_id)
        self.annotation_file = annotation_file

    @property
    def format_name(self) -> str:
        return "COCO"

    # ── Determine task from annotation structure ───────────────

    def _detect_task(self, annotations: List[Dict]) -> str:
        has_bbox = any("bbox" in a and a["bbox"] for a in annotations[:100])
        has_seg = any("segmentation" in a and a["segmentation"] for a in annotations[:100])
        if has_seg:
            return DatasetTask.SEGMENTATION
        if has_bbox:
            return DatasetTask.DETECTION
        return DatasetTask.UNKNOWN

    # ── Adapt ─────────────────────────────────────────────────

    def adapt(self) -> CanonicalDataset:
        # Load JSON
        try:
            with open(self.annotation_file, "r", encoding="utf-8") as f:
                data: Dict[str, Any] = json.load(f)
        except Exception as e:
            return CanonicalDataset(
                dataset_id=self.dataset_id,
                source_format="COCO",
                task=DatasetTask.UNKNOWN,
                classes={},
                validation_errors=[{
                    "error_code": "INVALID_COCO_SCHEMA",
                    "severity": "CRITICAL",
                    "category": "FORMAT_ERROR",
                    "description": f"Failed to parse COCO JSON '{self.annotation_file.name}': {e}",
                }],
            )

        if not isinstance(data, dict) or "images" not in data or "annotations" not in data:
            return CanonicalDataset(
                dataset_id=self.dataset_id,
                source_format="COCO",
                task=DatasetTask.UNKNOWN,
                classes={},
                validation_errors=[{
                    "error_code": "INVALID_COCO_SCHEMA",
                    "severity": "CRITICAL",
                    "category": "FORMAT_ERROR",
                    "description": (
                        f"File '{self.annotation_file.name}' is not a valid COCO JSON. "
                        "Expected top-level keys: 'images', 'annotations', 'categories'."
                    ),
                }],
            )

        # Build class registry from COCO categories
        registry = CanonicalClassRegistry()
        categories = data.get("categories", [])
        if categories:
            registry.register_coco_categories(categories)
        # coco_cat_id → canonical_id reverse map
        coco_cat_to_canonical: Dict[int, int] = {
            cat["id"]: registry.canonical_id("COCO", cat["id"])
            for cat in categories
            if registry.canonical_id("COCO", cat["id"]) is not None
        }

        raw_images: Dict[int, Dict] = {}
        for img in data.get("images", []):
            if isinstance(img, dict) and "id" in img:
                raw_images[img["id"]] = img

        raw_annotations_by_image: Dict[int, List[Dict]] = {}
        for ann in data.get("annotations", []):
            if not isinstance(ann, dict):
                continue
            img_id = ann.get("image_id")
            if img_id is not None:
                raw_annotations_by_image.setdefault(img_id, []).append(ann)

        task = self._detect_task(data.get("annotations", []))

        # Build sample-level ID map for tracking
        samples: List[CanonicalSample] = []
        adapter_errors: List[Dict] = []
        total_annotations = 0
        normalized_annotations = 0

        # Build image path lookup
        all_images_in_dir: Dict[str, Path] = {
            f.name: f for f in self.dataset_dir.rglob("*")
            if f.is_file() and f.suffix.lower() in IMAGE_EXTS
        }

        for img_id, img_info in raw_images.items():
            file_name = img_info.get("file_name", "")
            sample_id = str(uuid.uuid4())

            # Try to find actual image file
            img_path: Optional[Path] = (
                all_images_in_dir.get(Path(file_name).name)
                or all_images_in_dir.get(file_name)
            )

            if img_path and img_path.exists():
                real_w, real_h, ch, fmt, img_err = load_image_meta(img_path)
                img_hash = compute_sha256(img_path) if img_err is None else None
            else:
                # Image file not present — use metadata dims if available
                real_w = img_info.get("width")
                real_h = img_info.get("height")
                ch, fmt, img_hash, img_err = None, None, None, None
                if not img_path:
                    img_err = f"Image file '{file_name}' not found in dataset directory"

            # Use COCO metadata dims if real image unavailable
            meta_w = img_info.get("width") or real_w
            meta_h = img_info.get("height") or real_h

            sample = CanonicalSample(
                sample_id=sample_id,
                image_path=str(img_path) if img_path else file_name,
                image_hash=img_hash,
                width=real_w or meta_w,
                height=real_h or meta_h,
                channels=ch,
                image_format=fmt,
                is_valid_image=(img_err is None),
                image_error=img_err,
                source_id=file_name,
                metadata={"coco_image_id": img_id},
            )

            if img_err:
                adapter_errors.append({
                    "error_code": "UNREADABLE_IMAGE",
                    "severity": "HIGH",
                    "category": "DATA_QUALITY",
                    "description": img_err,
                    "sample_id": sample_id,
                })

            # Normalize annotations for this image
            img_w = meta_w or 1
            img_h = meta_h or 1

            for raw_ann in raw_annotations_by_image.get(img_id, []):
                total_annotations += 1
                ann_result = self._normalize_annotation(
                    raw_ann, sample_id, img_w, img_h,
                    registry, coco_cat_to_canonical, task,
                )
                if isinstance(ann_result, dict):
                    # It's an error dict
                    ann_result["sample_id"] = sample_id
                    adapter_errors.append(ann_result)
                else:
                    sample.annotations.append(ann_result)
                    normalized_annotations += 1

            samples.append(sample)

        # Run canonical validator
        dataset = CanonicalDataset(
            dataset_id=self.dataset_id,
            source_format="COCO",
            task=task,
            classes=registry.id_to_name,
            samples=samples,
            contributors=data.get("contributors", []),
            metadata={"info": data.get("info", {})},
            validation_errors=adapter_errors,
        )
        validator = CanonicalValidator()
        dataset.validation_errors.extend(validator.validate(dataset))

        dataset.normalization_report = self._make_normalization_report(
            total_samples=len(raw_images),
            normalized_samples=len([s for s in samples if s.is_valid_image]),
            total_annotations=total_annotations,
            normalized_annotations=normalized_annotations,
            failed_annotations=total_annotations - normalized_annotations,
            extra={
                "class_registry": registry.to_dict(),
                "task": task,
                "annotation_file": self.annotation_file.name,
            },
        )

        return dataset

    def _normalize_annotation(
        self,
        raw_ann: Dict[str, Any],
        sample_id: str,
        img_w: int,
        img_h: int,
        registry: CanonicalClassRegistry,
        coco_cat_to_canonical: Dict[int, int],
        task: str,
    ):
        """Returns CanonicalAnnotation or error dict."""
        ann_id = raw_ann.get("id", str(uuid.uuid4()))
        coco_cat_id = raw_ann.get("category_id")
        canonical_id = coco_cat_to_canonical.get(coco_cat_id)

        if canonical_id is None:
            return {
                "error_code": "INVALID_COCO_SCHEMA",
                "severity": "CRITICAL",
                "category": "ANNOTATION_ERROR",
                "description": (
                    f"Annotation id={ann_id} references unknown COCO category_id={coco_cat_id}"
                ),
                "observed_value": coco_cat_id,
                "validation_rule": "category_id must be defined in COCO categories list",
            }

        class_name = registry.name(canonical_id) or f"Category_{coco_cat_id}"

        # Determine geometry
        seg = raw_ann.get("segmentation")
        bbox_raw = raw_ann.get("bbox")  # [x, y, w, h] pixel

        geometry_type = "bbox"
        canon_bbox: Optional[CanonicalBBox] = None
        canon_seg: Optional[List[float]] = None
        rle: Optional[Dict] = None

        if seg:
            if isinstance(seg, dict) and "counts" in seg:
                # RLE
                geometry_type = "rle"
                rle = seg
            elif isinstance(seg, list) and len(seg) > 0:
                # Polygon(s)
                geometry_type = "polygon"
                # COCO stores polygons as list of flat coord lists; use the first
                flat = seg[0] if isinstance(seg[0], list) else seg
                canon_seg = normalize_polygon(flat, img_w, img_h)
                # Also derive bbox from polygon extremes for downstream engines
                if len(flat) >= 4:
                    xs = flat[0::2]
                    ys = flat[1::2]
                    px_x, px_y = min(xs), min(ys)
                    px_w = max(xs) - min(xs)
                    px_h = max(ys) - min(ys)
                    canon_coords = coco_to_canonical(px_x, px_y, px_w, px_h, img_w, img_h)
                    canon_bbox = CanonicalBBox(**canon_coords)

        if bbox_raw and len(bbox_raw) == 4 and geometry_type == "bbox":
            x, y, w, h = bbox_raw
            if w <= 0 or h <= 0:
                return {
                    "error_code": "INVALID_COCO_SCHEMA",
                    "severity": "CRITICAL",
                    "category": "ANNOTATION_ERROR",
                    "description": (
                        f"Annotation id={ann_id} has non-positive bbox [w={w}, h={h}]"
                    ),
                    "observed_value": bbox_raw,
                    "validation_rule": "COCO bbox width and height must be > 0",
                }
            canon_coords = coco_to_canonical(x, y, w, h, img_w, img_h)
            canon_bbox = CanonicalBBox(**canon_coords)

        return CanonicalAnnotation(
            annotation_id=f"ann-coco-{ann_id}",
            sample_id=sample_id,
            class_id=canonical_id,
            class_name=class_name,
            geometry_type=geometry_type,
            bbox=canon_bbox,
            segmentation=canon_seg,
            rle=rle,
            attributes={
                k: v for k, v in raw_ann.items()
                if k not in ("id", "image_id", "category_id", "bbox", "segmentation")
            },
            source_metadata={
                "format": "COCO",
                "source_annotation_id": ann_id,
                "source_category_id": coco_cat_id,
                "source_bbox": bbox_raw,
                "image_dimensions": {"width": img_w, "height": img_h},
            },
            raw_annotation=raw_ann,
        )
