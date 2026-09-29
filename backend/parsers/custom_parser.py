from pathlib import Path
from typing import Dict, Any, List

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

class CustomFolderParser:
    def __init__(self, dataset_dir: Path):
        self.dataset_dir = dataset_dir
        
    def parse(self) -> Dict[str, Any]:
        image_files = [f for f in self.dataset_dir.rglob("*") if f.is_file() and f.suffix.lower() in IMAGE_EXTS]
        
        # Check if organized by subfolders: dataset_dir/class_name/image.png
        class_counts: Dict[str, int] = {}
        for img in image_files:
            rel_parent = img.parent.relative_to(self.dataset_dir)
            if rel_parent.parts:
                class_name = rel_parent.parts[0]
            else:
                class_name = "Uncategorized"
            class_counts[class_name] = class_counts.get(class_name, 0) + 1
            
        classes = {idx: name for idx, name in enumerate(sorted(class_counts.keys()))}
        
        return {
            "valid": len(image_files) > 0,
            "errors": [] if len(image_files) > 0 else ["No image files found in dataset folder"],
            "total_images": len(image_files),
            "total_annotations": len(image_files),
            "valid_annotations": len(image_files),
            "invalid_annotations": 0,
            "classes": classes,
            "class_counts": class_counts
        }
