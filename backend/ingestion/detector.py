"""
ingestion/detector.py — TRUST-CV Deterministic Format Detector

Determines the dataset format and returns the appropriate adapter.
Never guesses when multiple formats are detected.

Priority order:
  1. COCO  — instances*.json / JSON with "images" + "annotations" + "categories"
  2. YOLO  — labels/ directory OR data.yaml with "names"
  3. CLASS_FOLDER — subdirectories each containing images
  4. CUSTOM — any other structure with metadata files

Returns:
  (format_name, adapter_instance)

Special return codes:
  AMBIGUOUS_DATASET_FORMAT — multiple formats detected
  UNKNOWN                   — no recognizable format found
"""
from __future__ import annotations
import json
from pathlib import Path
from typing import List, Optional, Set, Tuple, Union

from ..adapters.yolo import YOLOAdapter
from ..adapters.coco import COCOAdapter
from ..adapters.class_folder import ClassFolderAdapter
from ..adapters.custom import CustomAdapter
from ..adapters.image_utils import IMAGE_EXTS

# Structural markers for class-folder detection
_SPLIT_DIRS: Set[str] = {"train", "val", "test", "validation", "training"}


class FormatDetectionResult:
    def __init__(
        self,
        format_name: str,
        adapter=None,
        evidence: Optional[List[str]] = None,
        ambiguous_formats: Optional[List[str]] = None,
    ):
        self.format_name = format_name
        self.adapter = adapter
        self.evidence = evidence or []
        self.ambiguous_formats = ambiguous_formats or []

    @property
    def is_ambiguous(self) -> bool:
        return self.format_name == "AMBIGUOUS_DATASET_FORMAT"

    @property
    def is_unknown(self) -> bool:
        return self.format_name == "UNKNOWN"

    @property
    def is_usable(self) -> bool:
        return self.adapter is not None


class DatasetFormatDetector:
    """
    Deterministic format detector.
    Scans structural signals and returns a single unambiguous result.
    """

    def __init__(self, dataset_dir: Path, dataset_id: Optional[str] = None):
        self.dataset_dir = dataset_dir
        self.dataset_id = dataset_id or dataset_dir.name

    def detect(self) -> FormatDetectionResult:
        coco_files = self._find_coco_files()
        yolo_signals = self._find_yolo_signals()
        class_folder_root = self._find_class_folder_root()

        detected = []
        if coco_files:
            detected.append("COCO")
        if yolo_signals:
            detected.append("YOLO")
        if class_folder_root and not yolo_signals:
            # Class folder is subordinate to YOLO (YOLO has labels/ dirs)
            detected.append("CLASS_FOLDER")

        if len(detected) > 1:
            return FormatDetectionResult(
                format_name="AMBIGUOUS_DATASET_FORMAT",
                evidence=[
                    f"Multiple format indicators found: {detected}",
                    *([f"COCO: {[f.name for f in coco_files[:3]]}"] if coco_files else []),
                    *([f"YOLO: {yolo_signals}"] if yolo_signals else []),
                    *([f"CLASS_FOLDER: root={class_folder_root}"] if class_folder_root else []),
                ],
                ambiguous_formats=detected,
            )

        if detected == ["COCO"]:
            best_file = self._pick_best_coco_file(coco_files)
            return FormatDetectionResult(
                format_name="COCO",
                adapter=COCOAdapter(best_file, self.dataset_dir, self.dataset_id),
                evidence=[f"COCO annotation file: {best_file.name}"],
            )

        if detected == ["YOLO"]:
            return FormatDetectionResult(
                format_name="YOLO",
                adapter=YOLOAdapter(self.dataset_dir, self.dataset_id),
                evidence=yolo_signals,
            )

        if detected == ["CLASS_FOLDER"]:
            return FormatDetectionResult(
                format_name="CLASS_FOLDER",
                adapter=ClassFolderAdapter(self.dataset_dir, self.dataset_id),
                evidence=[f"Class folder root: {class_folder_root}"],
            )

        # Nothing matched — check for any metadata file before giving up
        custom_adapter = CustomAdapter(self.dataset_dir, self.dataset_id)
        return FormatDetectionResult(
            format_name="CUSTOM",
            adapter=custom_adapter,
            evidence=["No standard format markers found; attempting custom detection"],
        )

    # ── COCO signal detection ─────────────────────────────────

    def _find_coco_files(self) -> List[Path]:
        json_files = list(self.dataset_dir.rglob("*.json"))
        coco_files = []
        for jf in json_files:
            if jf.stat().st_size > 50_000_000:  # >50MB — skip for detection
                continue
            try:
                with open(jf, "r", encoding="utf-8", errors="ignore") as f:
                    head = f.read(8192)
                if '"images"' in head and '"annotations"' in head and '"categories"' in head:
                    coco_files.append(jf)
            except Exception:
                continue
        return coco_files

    def _pick_best_coco_file(self, files: List[Path]) -> Path:
        """Prefer instances_*.json, then annotations.json, then first found."""
        for f in files:
            if f.name.startswith("instances"):
                return f
        for f in files:
            if f.name == "annotations.json":
                return f
        return files[0]

    # ── YOLO signal detection ─────────────────────────────────

    def _find_yolo_signals(self) -> List[str]:
        signals = []

        # labels/ directory
        labels_dirs = [p for p in self.dataset_dir.rglob("labels") if p.is_dir()]
        if labels_dirs:
            signals.append(f"labels/ directory at: {labels_dirs[0].relative_to(self.dataset_dir)}")

        # data.yaml / data.yml with names field
        yaml_files = list(self.dataset_dir.rglob("*.yaml")) + list(self.dataset_dir.rglob("*.yml"))
        for yf in yaml_files:
            try:
                with open(yf, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read(4096)
                if "names:" in content:
                    signals.append(f"YOLO config: {yf.name}")
                    break
            except Exception:
                continue

        return signals

    # ── Class-folder signal detection ─────────────────────────

    def _find_class_folder_root(self) -> Optional[str]:
        """Returns the path string of the first root that looks like a class folder."""
        # Check direct children
        direct_class_dirs = [
            d for d in self.dataset_dir.iterdir()
            if d.is_dir()
            and d.name.lower() not in _SPLIT_DIRS
            and any(f.suffix.lower() in IMAGE_EXTS for f in d.iterdir() if f.is_file())
        ]
        if len(direct_class_dirs) >= 2:
            return str(self.dataset_dir)

        # Check one level down (train/val splits)
        for split_dir in self.dataset_dir.iterdir():
            if split_dir.is_dir() and split_dir.name.lower() in _SPLIT_DIRS:
                class_dirs = [
                    d for d in split_dir.iterdir()
                    if d.is_dir()
                    and any(f.suffix.lower() in IMAGE_EXTS for f in d.iterdir() if f.is_file())
                ]
                if len(class_dirs) >= 2:
                    return str(split_dir)

        return None
