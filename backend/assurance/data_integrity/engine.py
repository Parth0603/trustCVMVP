import hashlib
import math
from pathlib import Path
from typing import Dict, Any, List, Tuple
from collections import defaultdict
import numpy as np
from PIL import Image
import cv2
from sklearn.ensemble import IsolationForest

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

def compute_sha256(file_path: Path) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def compute_dhash(img_pil: Image.Image, hash_size: int = 8) -> int:
    """
    Computes difference hash (dHash) for fast near-duplicate perceptual comparison.
    """
    resized = img_pil.convert('L').resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = list(resized.getdata())
    diff = []
    for row in range(hash_size):
        for col in range(hash_size):
            pixel_left = pixels[row * (hash_size + 1) + col]
            pixel_right = pixels[row * (hash_size + 1) + col + 1]
            diff.append(pixel_left > pixel_right)
    decimal_value = 0
    for index, value in enumerate(diff):
        if value:
            decimal_value += 1 << index
    return decimal_value

def hamming_distance(h1: int, h2: int) -> int:
    return bin(h1 ^ h2).count('1')

class DataIntegrityEngine:
    def __init__(self, dataset_dir: Path, parse_result: Dict[str, Any]):
        self.dataset_dir = dataset_dir
        self.parse_result = parse_result

    def analyze(self) -> Dict[str, Any]:
        image_files = sorted([f for f in self.dataset_dir.rglob("*") if f.is_file() and f.suffix.lower() in IMAGE_EXTS])
        total_images = len(image_files)

        valid_images = 0
        corrupted_images = 0
        corrupted_file_list: List[str] = []
        
        # 1. Exact Duplicate Detection using SHA-256
        hash_to_files = defaultdict(list)
        dhash_list: List[Tuple[str, int]] = []
        
        # Feature matrix for statistical anomaly / OOD analysis
        features = []
        sample_meta = []
        
        widths = []
        heights = []
        aspect_ratios = []
        brightnesses = []
        contrasts = []

        for img_path in image_files:
            try:
                with Image.open(img_path) as pil_img:
                    pil_img.verify()
                
                with Image.open(img_path) as pil_img:
                    w, h = pil_img.size
                    widths.append(w)
                    heights.append(h)
                    ar = round(w / max(1, h), 3)
                    aspect_ratios.append(ar)
                    
                    dh = compute_dhash(pil_img)
                    dhash_list.append((img_path.name, dh))
                    
                    np_img = np.array(pil_img.convert('RGB'))
                    gray = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
                    mean_b = float(np.mean(gray))
                    std_c = float(np.std(gray))
                    brightnesses.append(mean_b)
                    contrasts.append(std_c)
                    
                    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
                    
                    features.append([w, h, ar, mean_b, std_c, lap_var])
                    sample_meta.append({
                        "name": img_path.name,
                        "width": w,
                        "height": h,
                        "brightness": round(mean_b, 1),
                        "contrast": round(std_c, 1)
                    })

                sha = compute_sha256(img_path)
                hash_to_files[sha].append(img_path.name)
                valid_images += 1
            except Exception:
                corrupted_images += 1
                corrupted_file_list.append(img_path.name)

        # Calculate exact duplicate groups
        exact_duplicate_groups = [files for files in hash_to_files.values() if len(files) > 1]
        exact_duplicate_count = sum(len(files) - 1 for files in exact_duplicate_groups)
        unique_images = valid_images - exact_duplicate_count

        # 2. Near-Duplicate Detection (Hamming distance <= 3 on dHash)
        near_duplicate_groups = []
        assigned_near = set()
        for i in range(len(dhash_list)):
            name_i, h_i = dhash_list[i]
            if name_i in assigned_near:
                continue
            group = [name_i]
            for j in range(i + 1, len(dhash_list)):
                name_j, h_j = dhash_list[j]
                if name_j in assigned_near:
                    continue
                if hamming_distance(h_i, h_j) <= 3:
                    group.append(name_j)
            if len(group) > 1:
                near_duplicate_groups.append(group)
                assigned_near.update(group)
                
        near_duplicate_count = sum(len(g) for g in near_duplicate_groups)

        # 3. Class Distribution & Shannon Entropy
        class_counts = self.parse_result.get("class_counts", {})
        total_annotations = self.parse_result.get("total_annotations", total_images)
        invalid_annotations = self.parse_result.get("invalid_annotations", 0)
        image_annotations = self.parse_result.get("image_annotations", {})
        
        class_distribution = []
        entropy = 0.0
        colors = ["bg-primary", "bg-primary-container", "bg-secondary", "bg-surface-variant", "bg-amber-500", "bg-emerald-500"]
        
        if class_counts and total_annotations > 0:
            for idx, (cls_name, count) in enumerate(class_counts.items()):
                pct = round((count / max(1, total_annotations)) * 100, 1)
                color = colors[idx % len(colors)]
                class_distribution.append({
                    "class_name": cls_name,
                    "count": count,
                    "percentage": pct,
                    "color_class": color
                })
                p = count / total_annotations
                if p > 0:
                    entropy -= p * math.log2(p)
            
            max_entropy = math.log2(max(1, len(class_counts))) if len(class_counts) > 1 else 1.0
            norm_entropy = round(min(1.0, entropy / max(0.001, max_entropy)), 2)
        else:
            norm_entropy = 1.0

        # 4. Conflicting Annotations / Label Contamination Check
        # Check if identical image content is assigned contradictory classes
        conflicting_pairs = []
        for group in exact_duplicate_groups:
            group_labels = defaultdict(list)
            for fname in group:
                anns = image_annotations.get(fname, [])
                for a in anns:
                    cname = a.get("class_name") or str(a.get("class_id"))
                    group_labels[cname].append(fname)
            if len(group_labels) > 1:
                conflicting_pairs.append({
                    "files": group,
                    "conflicting_classes": dict(group_labels)
                })

        # 5. Out-of-Distribution / Statistical Anomaly Analysis using Isolation Forest
        anomaly_indicators = []
        ood_count = 0
        if len(features) >= 5:
            try:
                X = np.array(features)
                iso = IsolationForest(contamination=0.08, random_state=42)
                preds = iso.fit_predict(X)
                scores = iso.decision_function(X)
                
                for idx, (pred, score) in enumerate(zip(preds, scores)):
                    if pred == -1:
                        meta = sample_meta[idx]
                        ood_count += 1
                        anomaly_indicators.append({
                            "sample_id": meta["name"],
                            "anomaly_score": round(float(-score), 3),
                            "reason": f"Statistical outlier (Brightness: {meta['brightness']}, Contrast: {meta['contrast']}, Dimensions: {meta['width']}x{meta['height']})"
                        })
            except Exception:
                pass

        # 6. Structured Findings Construction
        structured_findings: List[Dict[str, Any]] = []

        # (a) Conflicting Annotations (Adversarial / Contamination)
        if conflicting_pairs:
            aff_files = []
            for cp in conflicting_pairs:
                aff_files.extend(cp["files"])
            structured_findings.append({
                "category": "DATA_INTEGRITY",
                "severity": "CRITICAL",
                "finding": f"Contradictory class labels on byte-identical images ({len(conflicting_pairs)} duplicate clusters).",
                "affected_assets": list(set(aff_files)),
                "evidence": f"Identical images assigned conflicting class classifications: {[list(cp['conflicting_classes'].keys()) for cp in conflicting_pairs[:3]]}"
            })

        # (b) Malformed or Invalid Annotations from parser
        parser_defects = self.parse_result.get("structured_defects", [])
        critical_defects = [d for d in parser_defects if d.get("severity") == "CRITICAL"]
        high_defects = [d for d in parser_defects if d.get("severity") == "HIGH"]
        
        if critical_defects:
            structured_findings.append({
                "category": "DATA_INTEGRITY",
                "severity": "CRITICAL",
                "finding": f"{len(critical_defects)} critical annotation syntax/boundary violations.",
                "affected_assets": [d.get("file", "annotations") for d in critical_defects[:8]],
                "evidence": f"Sample defects: {[d.get('description', '') for d in critical_defects[:3]]}"
            })

        if high_defects:
            structured_findings.append({
                "category": "DATA_INTEGRITY",
                "severity": "HIGH",
                "finding": f"{len(high_defects)} high-severity label defects (missing or empty label files).",
                "affected_assets": [d.get("file", "annotations") for d in high_defects[:8]],
                "evidence": f"Missing/empty annotations: {[d.get('file', '') for d in high_defects[:4]]}"
            })

        # (c) Exact Duplicate Flooding
        max_flood = max((len(g) for g in exact_duplicate_groups), default=0)
        dupe_ratio = exact_duplicate_count / max(1, total_images)
        if max_flood >= 5 or dupe_ratio >= 0.25:
            flood_group = max(exact_duplicate_groups, key=len) if exact_duplicate_groups else []
            structured_findings.append({
                "category": "DATA_INTEGRITY",
                "severity": "HIGH",
                "finding": f"Exact duplicate flooding detected ({exact_duplicate_count} duplicate files, {round(dupe_ratio * 100, 1)}% of dataset).",
                "affected_assets": flood_group[:6],
                "evidence": f"Largest duplicate cluster has {max_flood} identical copies: {flood_group[:3]}..."
            })
        elif exact_duplicate_count > 0:
            structured_findings.append({
                "category": "DATA_INTEGRITY",
                "severity": "MEDIUM",
                "finding": f"{exact_duplicate_count} exact duplicate image files detected.",
                "affected_assets": [f for g in exact_duplicate_groups for f in g[:2]][:6],
                "evidence": f"Exact SHA-256 collisions across {len(exact_duplicate_groups)} groups."
            })

        # (d) Corrupted Images
        if corrupted_images > 0:
            structured_findings.append({
                "category": "DATA_INTEGRITY",
                "severity": "CRITICAL",
                "finding": f"{corrupted_images} corrupted or unreadable image files.",
                "affected_assets": corrupted_file_list[:8],
                "evidence": "Image decoders failed byte integrity / header validation."
            })

        # (e) Out of Distribution Outliers
        if ood_count > 0:
            structured_findings.append({
                "category": "DATA_INTEGRITY",
                "severity": "HIGH" if ood_count >= 3 else "MEDIUM",
                "finding": f"{ood_count} anomalous / out-of-distribution visual samples detected.",
                "affected_assets": [ano["sample_id"] for ano in anomaly_indicators[:6]],
                "evidence": f"Isolation Forest identified statistical visual outliers (mean contrast/brightness divergence)."
            })

        # (f) Severe Class Imbalance
        if class_distribution and len(class_distribution) > 1:
            counts = [c["count"] for c in class_distribution]
            max_c = max(counts)
            min_c = min(counts) or 1
            if max_c / min_c >= 4.0:
                dom_class = max(class_distribution, key=lambda x: x["count"])
                structured_findings.append({
                    "category": "DATA_INTEGRITY",
                    "severity": "MEDIUM",
                    "finding": f"Severe class imbalance: '{dom_class['class_name']}' represents {dom_class['percentage']}% of annotations.",
                    "affected_assets": [dom_class["class_name"]],
                    "evidence": f"Imbalance ratio {round(max_c / min_c, 1)}:1 between dominant and minority classes."
                })

        # Calculate composite Data Integrity Score (0 - 100)
        # Explicit score semantics:
        # integrity_score: 100 = flawless, 0 = completely corrupted/unusable
        # risk_score: 100 - integrity_score (0 = safe, 100 = critical threat)
        integrity_score = 100
        
        # Penalties based on finding severity
        for f in structured_findings:
            if f["severity"] == "CRITICAL":
                integrity_score -= 25
            elif f["severity"] == "HIGH":
                integrity_score -= 15
            elif f["severity"] == "MEDIUM":
                integrity_score -= 8
            elif f["severity"] == "LOW":
                integrity_score -= 3

        integrity_score = max(5, min(100, integrity_score))
        data_risk_score = 100 - integrity_score

        has_critical = any(f["severity"] == "CRITICAL" for f in structured_findings)
        has_high = any(f["severity"] == "HIGH" for f in structured_findings)
        
        if has_critical or integrity_score < 60:
            status = "Flagged"
        elif has_high or integrity_score < 85:
            status = "Review"
        else:
            status = "Verified"

        classes_list = [
            {
                "name": cd["class_name"],
                "count": cd["count"],
                "percentage": cd["percentage"]
            }
            for cd in class_distribution
        ]

        contributors = self.parse_result.get("contributors", [])
        anomaly_ratio = round(((corrupted_images + exact_duplicate_count + ood_count + invalid_annotations) / max(1, total_images)) * 100, 2)

        return {
            "score": integrity_score,
            "integrity_score": integrity_score,
            "risk_score": data_risk_score,
            "status": status,
            "benchmark_set": self.dataset_dir.name,
            "total_images": total_images,
            "valid_images": valid_images,
            "corrupted_images": corrupted_images,
            "unique_images": unique_images,
            "duplicate_images": exact_duplicate_count,
            "exact_duplicate_count": exact_duplicate_count,
            "duplicate_groups": exact_duplicate_groups[:10],
            "near_duplicate_images": near_duplicate_count,
            "near_duplicate_count": near_duplicate_count,
            "near_duplicate_groups": near_duplicate_groups[:10],
            "total_annotations": total_annotations,
            "invalid_annotations": invalid_annotations,
            "out_of_distribution": ood_count,
            "anomaly_ratio": anomaly_ratio,
            "label_conflicts": len(conflicting_pairs),
            "shannon_entropy": norm_entropy,
            "class_distribution": class_distribution,
            "classes": classes_list,
            "contributors": contributors,
            "findings": structured_findings,
            "image_statistics": {
                "mean_width": int(np.mean(widths)) if widths else 0,
                "mean_height": int(np.mean(heights)) if heights else 0,
                "mean_aspect_ratio": round(float(np.mean(aspect_ratios)), 2) if aspect_ratios else 0.0,
                "mean_brightness": round(float(np.mean(brightnesses)), 1) if brightnesses else 0.0,
                "mean_contrast": round(float(np.mean(contrasts)), 1) if contrasts else 0.0,
            },
            "anomaly_indicators": anomaly_indicators[:15],
            "poisoning_indicators": [f for f in structured_findings if "Contradictory" in f["finding"] or "flooding" in f["finding"]]
        }
