import os
import shutil
import zipfile
import uuid
from pathlib import Path
from typing import Tuple, List

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

def safe_extract_zip(zip_path: Path, target_dir: Path) -> List[Path]:
    """
    Safely extract a ZIP archive while preventing path traversal (Zip Slip vulnerability).
    """
    target_dir.mkdir(parents=True, exist_ok=True)
    extracted_files = []
    
    with zipfile.ZipFile(zip_path, 'r') as zf:
        for member in zf.infolist():
            # Sanitize member filename to prevent directory traversal
            member_path = Path(member.filename)
            if member_path.is_absolute() or ".." in member_path.parts:
                continue
            
            resolved_target = (target_dir / member_path).resolve()
            if not str(resolved_target).startswith(str(target_dir.resolve())):
                continue
                
            zf.extract(member, target_dir)
            if resolved_target.is_file():
                extracted_files.append(resolved_target)
                
    return extracted_files

def save_uploaded_file(file_bytes: bytes, filename: str) -> Tuple[str, Path]:
    """
    Save uploaded file bytes to secure storage directory with a unique UUID.
    """
    unique_id = str(uuid.uuid4())
    safe_filename = Path(filename).name # strip any path components
    dest_dir = UPLOAD_DIR / unique_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / safe_filename
    
    with open(dest_path, "wb") as f:
        f.write(file_bytes)
        
    return unique_id, dest_path

def cleanup_upload(unique_id: str):
    """
    Clean up temporary extracted files when no longer needed.
    """
    dest_dir = UPLOAD_DIR / unique_id
    if dest_dir.exists() and dest_dir.is_dir():
        shutil.rmtree(dest_dir, ignore_errors=True)
