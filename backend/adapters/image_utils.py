"""
adapters/image_utils.py — Shared image loading utilities for all adapters.

All image reading goes through here so hashing, dimension extraction,
and error handling are consistent across YOLO, COCO, ClassFolder etc.
"""
from __future__ import annotations
import hashlib
from pathlib import Path
from typing import Optional, Tuple

from PIL import Image, UnidentifiedImageError

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}


def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def load_image_meta(path: Path) -> Tuple[Optional[int], Optional[int], Optional[int], Optional[str], Optional[str]]:
    """
    Try to open an image and return (width, height, channels, format, error).
    Returns (None, None, None, None, error_msg) on failure.
    """
    try:
        with Image.open(path) as img:
            img.verify()  # check truncation / corruption

        # Re-open after verify (verify closes the file)
        with Image.open(path) as img:
            w, h = img.size
            mode = img.mode
            fmt = img.format or path.suffix.lstrip(".").upper()
            channels = len(mode)  # 'RGB'→3, 'RGBA'→4, 'L'→1 etc.
            return w, h, channels, fmt, None

    except UnidentifiedImageError as e:
        return None, None, None, None, f"UNREADABLE_IMAGE: {str(e)}"
    except Exception as e:
        return None, None, None, None, f"IMAGE_LOAD_ERROR: {str(e)}"
