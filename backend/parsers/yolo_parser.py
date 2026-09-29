import re
import yaml
from pathlib import Path
from typing import Dict, Any, List

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# Files that look like .txt but are NEVER YOLO label files
_NON_LABEL_FILENAMES = {
    "readme.txt", "classes.txt", "notes.txt", "license.txt",
    "description.txt", "info.txt", "manifest.txt"
}

# Tolerance for floating-point boundary checks
EPSILON = 1e-6


class YOLOParser:
    def __init__(self, dataset_dir: Path):
        self.dataset_dir = dataset_dir
        self.classes: Dict[int, str] = {}
        self.validation_errors: List[str] = []
        self.has_defined_classes = False

    def _load_classes(self):
        # 1. Look for classes.txt
        classes_txt = list(self.dataset_dir.rglob("classes.txt"))
        if classes_txt:
            try:
                with open(classes_txt[0], 'r', encoding='utf-8') as f:
                    for idx, line in enumerate(f):
                        name = line.strip()
                        if name:
                            self.classes[idx] = name
                    if self.classes:
                        self.has_defined_classes = True
            except Exception:
                pass

        # 2. Look for data.yaml / data.yml
        if not self.classes:
            yaml_files = list(self.dataset_dir.rglob("*.yaml")) + list(self.dataset_dir.rglob("*.yml"))
            for yf in yaml_files:
                try:
                    with open(yf, 'r', encoding='utf-8') as f:
                        data = yaml.safe_load(f)
                        if isinstance(data, dict) and "names" in data:
                            names_field = data["names"]
                            if isinstance(names_field, dict):
                                self.classes = {int(k): str(v) for k, v in names_field.items()}
                                self.has_defined_classes = True
                                break
                            elif isinstance(names_field, list):
                                self.classes = {idx: str(v) for idx, v in enumerate(names_field)}
                                self.has_defined_classes = True
                                break
                except Exception:
                    pass

    def _find_label_files(self) -> List[Path]:
        """
        Scan for YOLO .txt annotation files.

        STRICT DIRECTORY RULE:
        If a 'labels/' subdirectory exists, ONLY files inside it are
        treated as label files.  This prevents README.txt, manifest.json,
        data.yaml, etc. at the dataset root from being parsed as annotations.

        Fallback: If no 'labels/' directory exists (bare flat layout),
        scan all .txt files but apply the non-label filename exclusion list
        and skip files that are clearly in non-label directories.
        """
        # Prefer explicit labels/ directory
        labels_dirs = [p for p in self.dataset_dir.rglob("labels") if p.is_dir()]
        if labels_dirs:
            # Use the shallowest labels/ directory found
            labels_dir = min(labels_dirs, key=lambda p: len(p.parts))
            return sorted([
                f for f in labels_dir.rglob("*.txt")
                if f.is_file() and f.name.lower() not in _NON_LABEL_FILENAMES
            ])

        # Fallback: flat layout — exclude known non-label filenames and
        # files that live in directories that are clearly not label stores
        _non_label_dirs = {"images", "imgs", "photos", "pictures", "__macosx"}
        result = []
        for f in sorted(self.dataset_dir.rglob("*.txt")):
            if not f.is_file():
                continue
            if f.name.lower() in _NON_LABEL_FILENAMES:
                continue
            # Skip if any parent directory name matches a known image/asset dir
            parent_names = {p.name.lower() for p in f.parents}
            if parent_names & _non_label_dirs:
                continue
            result.append(f)
        return result

    def _validate_annotation(
        self,
        label_file: Path,
        line_idx: int,
        line: str,
    ) -> Dict[str, Any]:
        """
        Parse and validate a single YOLO annotation line.

        Returns a dict with:
          valid      : bool
          cls_id     : int | None
          xc, yc, w, h : float | None
          defect     : dict | None  — populated on failure
        """
        parts = line.split()

        if len(parts) != 5:
            msg = (f"{label_file.name}:L{line_idx+1} "
                   f"invalid field count ({len(parts)} != 5 tokens): «{line[:80]}»")
            return {
                "valid": False,
                "defect": {
                    "type": "MALFORMED_YOLO_TOKENS",
                    "file": label_file.name,
                    "line": line_idx + 1,
                    "severity": "CRITICAL",
                    "description": msg,
                    "raw_line": line[:120],
                    "validation_rule": "A YOLO annotation must have exactly 5 whitespace-separated fields: class_id x_center y_center width height"
                }
            }

        try:
            cls_id = int(parts[0])
            xc = float(parts[1])
            yc = float(parts[2])
            w  = float(parts[3])
            h  = float(parts[4])
        except ValueError:
            msg = (f"{label_file.name}:L{line_idx+1} "
                   f"non-numeric coordinate values: {parts}")
            return {
                "valid": False,
                "defect": {
                    "type": "NON_NUMERIC_COORDINATE",
                    "file": label_file.name,
                    "line": line_idx + 1,
                    "severity": "CRITICAL",
                    "description": msg,
                    "raw_line": line[:120],
                    "validation_rule": "All 5 fields must be numeric (class_id as int, coordinates as float)"
                }
            }

        # Class ID check: valid IDs are 0 … max(self.classes) inclusive
        if self.has_defined_classes and cls_id not in self.classes:
            max_valid = max(self.classes.keys()) if self.classes else -1
            msg = (f"{label_file.name}:L{line_idx+1} "
                   f"unknown class ID {cls_id}; valid range [0, {max_valid}] "
                   f"(defined: {sorted(self.classes.keys())})")
            return {
                "valid": False,
                "defect": {
                    "type": "UNKNOWN_CLASS_ID",
                    "file": label_file.name,
                    "line": line_idx + 1,
                    "severity": "CRITICAL",
                    "description": msg,
                    "raw_line": line[:120],
                    "observed_value": cls_id,
                    "valid_classes": sorted(self.classes.keys()),
                    "validation_rule": "class_id must be a valid index defined in data.yaml / classes.txt"
                }
            }

        # Normalized coordinate range checks — with EPSILON tolerance on boundaries
        errors = []

        if xc < 0.0 - EPSILON or xc > 1.0 + EPSILON:
            errors.append(f"x_center={xc:.6f} outside [0,1]")
        if yc < 0.0 - EPSILON or yc > 1.0 + EPSILON:
            errors.append(f"y_center={yc:.6f} outside [0,1]")
        if w <= 0.0 or w > 1.0 + EPSILON:
            errors.append(f"width={w:.6f} not in (0,1]")
        if h <= 0.0 or h > 1.0 + EPSILON:
            errors.append(f"height={h:.6f} not in (0,1]")

        # Bounding box boundary check (box must not extend outside the image)
        if not errors:
            x_min = xc - w / 2
            y_min = yc - h / 2
            x_max = xc + w / 2
            y_max = yc + h / 2

            if x_min < -EPSILON:
                errors.append(f"x_min={x_min:.6f} < 0 (box extends left of image)")
            if y_min < -EPSILON:
                errors.append(f"y_min={y_min:.6f} < 0 (box extends above image)")
            if x_max > 1.0 + EPSILON:
                errors.append(f"x_max={x_max:.6f} > 1 (box extends right of image)")
            if y_max > 1.0 + EPSILON:
                errors.append(f"y_max={y_max:.6f} > 1 (box extends below image)")

        if errors:
            msg = (f"{label_file.name}:L{line_idx+1} "
                   f"out-of-bounds bbox [xc={xc}, yc={yc}, w={w}, h={h}]: "
                   + "; ".join(errors))
            return {
                "valid": False,
                "defect": {
                    "type": "OUT_OF_BOUNDS_BBOX",
                    "file": label_file.name,
                    "line": line_idx + 1,
                    "severity": "CRITICAL",
                    "description": msg,
                    "raw_line": line[:120],
                    "observed_value": {"xc": xc, "yc": yc, "w": w, "h": h},
                    "validation_rule": f"All normalized coordinates must be in [0,1] with ±{EPSILON} tolerance; bounding box must not extend outside image bounds"
                }
            }

        return {
            "valid": True,
            "cls_id": cls_id,
            "xc": xc, "yc": yc, "w": w, "h": h,
        }

    def parse(self) -> Dict[str, Any]:
        self._load_classes()

        image_files = sorted([
            f for f in self.dataset_dir.rglob("*")
            if f.is_file() and f.suffix.lower() in IMAGE_EXTS
        ])
        label_files = self._find_label_files()

        # Build stem-based look-up maps
        image_map = {f.stem: f for f in image_files}
        label_map = {f.stem: f for f in label_files}

        total_annotations = 0
        valid_annotations = 0
        invalid_annotations = 0
        missing_labels: List[str] = []
        orphaned_labels: List[str] = []
        empty_labels: List[str] = []
        structured_defects: List[Dict[str, Any]] = []
        detected_class_ids = set()
        class_counts: Dict[str, int] = {v: 0 for v in self.classes.values()}
        image_annotations: Dict[str, List[Dict[str, Any]]] = {f.name: [] for f in image_files}

        # Images without labels
        for stem, img_file in image_map.items():
            if stem not in label_map:
                missing_labels.append(img_file.name)
                structured_defects.append({
                    "type": "MISSING_LABEL_FILE",
                    "file": img_file.name,
                    "severity": "HIGH",
                    "description": f"Image '{img_file.name}' has no matching YOLO annotation file."
                })

        # Parse every label file
        for label_file in label_files:
            stem = label_file.stem
            matching_img = image_map.get(stem)
            if not matching_img:
                orphaned_labels.append(label_file.name)
                structured_defects.append({
                    "type": "ORPHANED_LABEL_FILE",
                    "file": label_file.name,
                    "severity": "MEDIUM",
                    "description": f"Annotation file '{label_file.name}' has no corresponding image."
                })

            try:
                with open(label_file, 'r', encoding='utf-8') as f:
                    lines = [ln.strip() for ln in f.readlines() if ln.strip()]

                if not lines:
                    empty_labels.append(label_file.name)
                    invalid_annotations += 1
                    structured_defects.append({
                        "type": "EMPTY_LABEL_FILE",
                        "file": label_file.name,
                        "severity": "HIGH",
                        "description": f"Annotation file '{label_file.name}' is empty."
                    })
                    continue

                for line_idx, line in enumerate(lines):
                    total_annotations += 1
                    result = self._validate_annotation(label_file, line_idx, line)

                    if not result["valid"]:
                        invalid_annotations += 1
                        defect = result["defect"]
                        self.validation_errors.append(defect["description"])
                        structured_defects.append(defect)
                        continue

                    cls_id  = result["cls_id"]
                    xc, yc  = result["xc"], result["yc"]
                    w, h    = result["w"], result["h"]

                    valid_annotations += 1
                    detected_class_ids.add(cls_id)
                    cls_name = self.classes.get(cls_id, f"Class_{cls_id}")
                    class_counts[cls_name] = class_counts.get(cls_name, 0) + 1

                    if matching_img:
                        image_annotations[matching_img.name].append({
                            "class_id": cls_id,
                            "class_name": cls_name,
                            "bbox": [xc, yc, w, h]
                        })

            except Exception as e:
                msg = f"Failed reading {label_file.name}: {str(e)}"
                self.validation_errors.append(msg)
                structured_defects.append({
                    "type": "LABEL_FILE_READ_ERROR",
                    "file": label_file.name,
                    "severity": "CRITICAL",
                    "description": msg,
                    "validation_rule": "Label file must be readable UTF-8 text"
                })

        # Populate classes from detected IDs when no class map was provided
        if not self.has_defined_classes:
            for cid in sorted(detected_class_ids):
                if cid not in self.classes:
                    self.classes[cid] = f"Class_{cid}"

        is_valid = (
            len(self.validation_errors) == 0 and
            invalid_annotations == 0 and
            len(missing_labels) == 0 and
            len(empty_labels) == 0
        )

        return {
            "valid": is_valid,
            "errors": self.validation_errors[:25],
            "total_images": len(image_files),
            "total_labels": len(label_files),
            "missing_labels": missing_labels,
            "orphaned_labels": orphaned_labels,
            "empty_labels": empty_labels,
            "total_annotations": total_annotations,
            "valid_annotations": valid_annotations,
            "invalid_annotations": invalid_annotations,
            "classes": self.classes,
            "class_counts": class_counts,
            "image_annotations": image_annotations,
            "structured_defects": structured_defects
        }
