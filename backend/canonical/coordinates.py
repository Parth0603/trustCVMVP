"""
canonical/coordinates.py — TRUST-CV Coordinate Authority

Single source of truth for:
  - EPSILON floating-point tolerance
  - NORMALIZED_IMAGE_SPACE coordinate convention
  - All bbox conversion utilities
"""

# ─────────────────────────────────────────────────────────────
#  GLOBAL TOLERANCE  (used everywhere — NEVER redefine locally)
# ─────────────────────────────────────────────────────────────
EPSILON: float = 1e-6

# Canonical coordinate space identifier stored in every CanonicalBBox
NORMALIZED_IMAGE_SPACE = "NORMALIZED_IMAGE_SPACE"


def clamp(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Clamp value to [lo, hi]."""
    return max(lo, min(hi, value))


# ─────────────────────────────────────────────────────────────
#  YOLO → canonical
# ─────────────────────────────────────────────────────────────

def yolo_to_canonical(xc: float, yc: float, w: float, h: float) -> dict:
    """
    Convert YOLO center-format normalized coordinates to canonical x_min/y_min/x_max/y_max.

    Input coordinates must already have been validated (caller's responsibility).
    Returns dict suitable for CanonicalBBox construction.
    """
    x_min = xc - w / 2.0
    y_min = yc - h / 2.0
    x_max = xc + w / 2.0
    y_max = yc + h / 2.0
    return {
        "x_min": x_min,
        "y_min": y_min,
        "x_max": x_max,
        "y_max": y_max,
        "x_center": xc,
        "y_center": yc,
        "width": w,
        "height": h,
        "coordinate_space": NORMALIZED_IMAGE_SPACE,
    }


# ─────────────────────────────────────────────────────────────
#  COCO → canonical
# ─────────────────────────────────────────────────────────────

def coco_to_canonical(x: float, y: float, w: float, h: float,
                      img_w: int, img_h: int) -> dict:
    """
    Convert COCO pixel bbox [x, y, width, height] to canonical normalized coords.

    x, y — top-left pixel corner
    w, h — pixel width and height
    img_w, img_h — source image dimensions
    """
    x_min = x / img_w
    y_min = y / img_h
    x_max = (x + w) / img_w
    y_max = (y + h) / img_h
    return {
        "x_min": x_min,
        "y_min": y_min,
        "x_max": x_max,
        "y_max": y_max,
        "x_center": x_min + (x_max - x_min) / 2.0,
        "y_center": y_min + (y_max - y_min) / 2.0,
        "width": x_max - x_min,
        "height": y_max - y_min,
        "coordinate_space": NORMALIZED_IMAGE_SPACE,
    }


# ─────────────────────────────────────────────────────────────
#  Pixel restoration
# ─────────────────────────────────────────────────────────────

def canonical_to_pixel(x_min: float, y_min: float, x_max: float, y_max: float,
                       img_w: int, img_h: int) -> dict:
    """Restore canonical normalized coordinates back to pixel coordinates."""
    return {
        "x_pixel": round(x_min * img_w),
        "y_pixel": round(y_min * img_h),
        "width_pixel": round((x_max - x_min) * img_w),
        "height_pixel": round((y_max - y_min) * img_h),
    }


# ─────────────────────────────────────────────────────────────
#  Polygon normalization
# ─────────────────────────────────────────────────────────────

def normalize_polygon(points: list, img_w: int, img_h: int) -> list:
    """
    Normalize a flat polygon list [x0, y0, x1, y1, ...] from pixel to [0,1] space.
    Returns normalized flat list.
    """
    result = []
    for i, v in enumerate(points):
        if i % 2 == 0:  # x coordinate
            result.append(v / img_w)
        else:           # y coordinate
            result.append(v / img_h)
    return result


# ─────────────────────────────────────────────────────────────
#  Bbox validation (canonical coords, post-normalization)
# ─────────────────────────────────────────────────────────────

def validate_canonical_bbox(x_min: float, y_min: float,
                             x_max: float, y_max: float) -> list:
    """
    Validate canonical normalized bbox.
    Returns list of error strings (empty = valid).
    """
    errors = []
    if x_min < -EPSILON:
        errors.append(f"x_min={x_min:.8f} < 0")
    if y_min < -EPSILON:
        errors.append(f"y_min={y_min:.8f} < 0")
    if x_max > 1.0 + EPSILON:
        errors.append(f"x_max={x_max:.8f} > 1")
    if y_max > 1.0 + EPSILON:
        errors.append(f"y_max={y_max:.8f} > 1")
    if x_min > x_max + EPSILON:
        errors.append(f"x_min={x_min:.8f} > x_max={x_max:.8f}")
    if y_min > y_max + EPSILON:
        errors.append(f"y_min={y_min:.8f} > y_max={y_max:.8f}")
    bbox_w = x_max - x_min
    bbox_h = y_max - y_min
    if bbox_w <= 0:
        errors.append(f"bbox width={bbox_w:.8f} <= 0")
    if bbox_h <= 0:
        errors.append(f"bbox height={bbox_h:.8f} <= 0")
    return errors
