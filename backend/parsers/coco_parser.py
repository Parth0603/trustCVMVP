import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from PIL import Image

class COCOParser:
    def __init__(self, annotation_file: Path, images_dir: Path):
        self.annotation_file = annotation_file
        self.images_dir = images_dir
        self.data: Dict[str, Any] = {}
        self.validation_errors: List[str] = []
        self.images: Dict[int, dict] = {}
        self.annotations: List[dict] = []
        self.categories: Dict[int, str] = {}
        
    def parse(self) -> Dict[str, Any]:
        try:
            with open(self.annotation_file, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
        except Exception as e:
            self.validation_errors.append(f"Failed to parse COCO JSON: {str(e)}")
            return {
                "valid": False,
                "errors": self.validation_errors,
                "images": [],
                "annotations": [],
                "classes": []
            }
            
        if not isinstance(self.data, dict):
            self.validation_errors.append("COCO JSON root must be an object")
            return {"valid": False, "errors": self.validation_errors}
            
        # Parse categories
        for cat in self.data.get("categories", []):
            if isinstance(cat, dict) and "id" in cat and "name" in cat:
                self.categories[cat["id"]] = cat["name"]
                
        # Parse images
        for img in self.data.get("images", []):
            if isinstance(img, dict) and "id" in img and "file_name" in img:
                self.images[img["id"]] = img
                
        # Parse annotations and validate bounding boxes
        valid_annotations = 0
        invalid_annotations = 0
        class_counts: Dict[str, int] = {name: 0 for name in self.categories.values()}
        
        for ann in self.data.get("annotations", []):
            if not isinstance(ann, dict):
                invalid_annotations += 1
                continue
                
            img_id = ann.get("image_id")
            cat_id = ann.get("category_id")
            bbox = ann.get("bbox") # [x, y, width, height]
            
            # Check valid category
            if cat_id not in self.categories:
                invalid_annotations += 1
                self.validation_errors.append(f"Annotation {ann.get('id')} has unknown category_id {cat_id}")
                continue
                
            class_name = self.categories[cat_id]
            class_counts[class_name] = class_counts.get(class_name, 0) + 1
            
            # Check bounding box
            if not bbox or len(bbox) != 4:
                invalid_annotations += 1
                continue
                
            x, y, w, h = bbox
            if w <= 0 or h <= 0 or x < 0 or y < 0:
                invalid_annotations += 1
                self.validation_errors.append(f"Annotation {ann.get('id')} has invalid bbox dimension [w={w}, h={h}]")
                continue
                
            # Check against image boundaries if image metadata exists
            img_info = self.images.get(img_id)
            if img_info and "width" in img_info and "height" in img_info:
                img_w, img_h = img_info["width"], img_info["height"]
                if x + w > img_w * 1.05 or y + h > img_h * 1.05: # allow 5% tolerance
                    invalid_annotations += 1
                    self.validation_errors.append(f"Annotation {ann.get('id')} exceeds image boundaries ({img_w}x{img_h})")
                    continue
                    
        image_annotations = {img.get("file_name"): [] for img in self.images.values() if img.get("file_name")}
        structured_defects = []
        for err in self.validation_errors:
            structured_defects.append({
                "type": "MALFORMED_COCO_ANNOTATION",
                "severity": "CRITICAL" if "unknown category" in err or "invalid bbox" in err else "HIGH",
                "description": err
            })

        for ann in self.annotations:
            img_id = ann.get("image_id")
            img_info = self.images.get(img_id)
            if img_info and img_info.get("file_name"):
                cat_id = ann.get("category_id")
                cls_name = self.categories.get(cat_id, f"Class_{cat_id}")
                image_annotations[img_info["file_name"]].append({
                    "class_id": cat_id,
                    "class_name": cls_name,
                    "bbox": ann.get("bbox")
                })

        contributors = self.data.get("contributors") or self.data.get("info", {}).get("contributors", [])
        return {
            "valid": len(self.validation_errors) == 0,
            "errors": self.validation_errors[:20], # cap error preview
            "total_images": len(self.images),
            "total_annotations": len(self.data.get("annotations", [])),
            "valid_annotations": valid_annotations,
            "invalid_annotations": invalid_annotations,
            "classes": self.categories,
            "class_counts": class_counts,
            "contributors": contributors,
            "image_annotations": image_annotations,
            "structured_defects": structured_defects
        }
