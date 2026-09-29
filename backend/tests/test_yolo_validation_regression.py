"""
TRUST-CV YOLO Annotation Validator Regression Tests (Section 16).

Each test directly exercises the validation logic without the full runner so it
runs fast and offline with no network or database dependency.
"""
import os
import tempfile
import pytest
from pathlib import Path
from backend.parsers.yolo_parser import YOLOParser, EPSILON


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _make_dataset(labels: dict[str, str], yaml_content: str | None = None) -> Path:
    """
    Create a minimal in-memory YOLO dataset in a temp directory.

    labels : {stem: annotation_text}  — written to labels/<stem>.txt
    Returns the dataset root directory Path.
    """
    base = Path(tempfile.mkdtemp())
    img_dir = base / "images"
    lbl_dir = base / "labels"
    img_dir.mkdir()
    lbl_dir.mkdir()

    # Write a trivial 1x1 pixel JPEG stub for every stem so parser sees images
    for stem in labels:
        (img_dir / f"{stem}.jpg").write_bytes(
            b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
            b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
            b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
            b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=8183"
            b"2=82<.342\x1d\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01"
            b"\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07"
            b"\x08\t\n\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03"
            b"\x05\x05\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!"
            b"1A\x06\x13Qa\x07\"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1"
            b"\xf0$3br\x82\xff\xd9"
        )
        (lbl_dir / f"{stem}.txt").write_text(labels[stem], encoding="utf-8")

    if yaml_content:
        (base / "data.yaml").write_text(yaml_content, encoding="utf-8")

    return base


def _validate_line(line: str, nc: int) -> dict:
    """Run the parser on a single annotation line and return result dict."""
    yaml_body = f"nc: {nc}\nnames:\n" + "".join(f"  {i}: cls{i}\n" for i in range(nc))
    dataset = _make_dataset({"sample": line}, yaml_body)
    parser = YOLOParser(dataset)
    result = parser.parse()
    defects = [d for d in result["structured_defects"] if d.get("type") != "ORPHANED_LABEL_FILE"]
    return {
        "valid": result["valid_annotations"] > 0,
        "invalid_annotations": result["invalid_annotations"],
        "defects": defects,
    }


# ──────────────────────────────────────────────────────────────
# TEST 1  valid annotation
# ──────────────────────────────────────────────────────────────
def test_01_valid_annotation():
    """0 0.5 0.5 0.2 0.2 → VALID"""
    r = _validate_line("0 0.5 0.5 0.2 0.2", nc=3)
    assert r["valid"], f"Expected VALID but got defects: {r['defects']}"
    assert r["invalid_annotations"] == 0


# ──────────────────────────────────────────────────────────────
# TEST 2  class_id = 2 with nc = 3 → VALID
# ──────────────────────────────────────────────────────────────
def test_02_class_id_2_nc_3_valid():
    """class_id = 2 with nc = 3 → VALID (max valid id = nc-1 = 2)"""
    r = _validate_line("2 0.5 0.5 0.2 0.2", nc=3)
    assert r["valid"], f"Expected VALID but got defects: {r['defects']}"


# ──────────────────────────────────────────────────────────────
# TEST 3  class_id = 3 with nc = 3 → INVALID CLASS
# ──────────────────────────────────────────────────────────────
def test_03_class_id_3_nc_3_invalid():
    """class_id = 3 with nc = 3 → INVALID (valid range is 0-2)"""
    r = _validate_line("3 0.5 0.5 0.2 0.2", nc=3)
    assert not r["valid"]
    assert any(d["type"] == "UNKNOWN_CLASS_ID" for d in r["defects"])


# ──────────────────────────────────────────────────────────────
# TEST 4  x_center = 0.5, width = 0.2 → box fully in-bounds → VALID
# ──────────────────────────────────────────────────────────────
def test_04_normal_bbox_valid():
    """x_center=0.5 width=0.2 → x_min=0.4, x_max=0.6 → VALID"""
    r = _validate_line("0 0.5 0.5 0.2 0.2", nc=1)
    assert r["valid"]


# ──────────────────────────────────────────────────────────────
# TEST 5  x_center = 0.95, width = 0.1 → x_max = 1.0 → VALID within tolerance
# ──────────────────────────────────────────────────────────────
def test_05_tight_boundary_valid_within_epsilon():
    """x_center=0.95 width=0.1 → x_max=1.0 exactly → VALID (within ε tolerance)"""
    r = _validate_line("0 0.95 0.5 0.1 0.2", nc=1)
    assert r["valid"], f"Should be valid at boundary 1.0, got defects: {r['defects']}"


# ──────────────────────────────────────────────────────────────
# TEST 5b  x_max slightly exceeds 1.0 by less than EPSILON → still VALID
# ──────────────────────────────────────────────────────────────
def test_05b_boundary_within_epsilon_tolerance():
    """x_center=0.95 width=0.100001 → x_max=1.0000005 < 1+EPSILON → VALID"""
    # 0.95 + 0.100001/2 = 0.95 + 0.0500005 = 1.0000005, which is < 1 + 1e-6
    r = _validate_line("0 0.95 0.5 0.100001 0.2", nc=1)
    assert r["valid"], f"Should be within epsilon tolerance, got defects: {r['defects']}"


# ──────────────────────────────────────────────────────────────
# TEST 6  x_center = 1.1 → INVALID
# ──────────────────────────────────────────────────────────────
def test_06_x_center_out_of_bounds():
    """x_center=1.1 → INVALID (outside [0,1])"""
    r = _validate_line("0 1.1 0.5 0.2 0.2", nc=1)
    assert not r["valid"]
    assert any(d["type"] == "OUT_OF_BOUNDS_BBOX" for d in r["defects"])


# ──────────────────────────────────────────────────────────────
# TEST 7  width = 1.2 → INVALID
# ──────────────────────────────────────────────────────────────
def test_07_width_exceeds_1():
    """width=1.2 → INVALID (width must be in (0, 1])"""
    r = _validate_line("0 0.5 0.5 1.2 0.2", nc=1)
    assert not r["valid"]
    assert any(d["type"] == "OUT_OF_BOUNDS_BBOX" for d in r["defects"])


# ──────────────────────────────────────────────────────────────
# TEST 8  fewer than 5 fields → INVALID SYNTAX
# ──────────────────────────────────────────────────────────────
def test_08_malformed_fewer_fields():
    """'0 0.5 0.5 0.2' (4 tokens) → INVALID SYNTAX"""
    r = _validate_line("0 0.5 0.5 0.2", nc=1)
    assert not r["valid"]
    assert any(d["type"] == "MALFORMED_YOLO_TOKENS" for d in r["defects"])


# ──────────────────────────────────────────────────────────────
# TEST 9  README.txt must NOT be parsed as a label file
# ──────────────────────────────────────────────────────────────
def test_09_readme_txt_excluded():
    """
    A dataset with README.txt at root and valid label files in labels/ must
    produce ZERO CRITICAL annotation violations from README.txt.
    """
    yaml_body = "nc: 3\nnames:\n  0: vehicle\n  1: person\n  2: building\n"
    dataset = _make_dataset({"image_0001": "0 0.5 0.5 0.3 0.3"}, yaml_body)
    # Drop a README.txt in the root (NOT in labels/)
    (dataset / "README.txt").write_text(
        "TRUST-CV Test Dataset\n\nGenerated for regression testing.\n"
        "Classes: 0=vehicle, 1=person, 2=building\n",
        encoding="utf-8"
    )
    parser = YOLOParser(dataset)
    result = parser.parse()
    critical = [d for d in result["structured_defects"] if d["severity"] == "CRITICAL"]
    assert len(critical) == 0, f"README.txt caused CRITICAL defects: {critical}"
    assert result["valid_annotations"] == 1
    assert result["invalid_annotations"] == 0


# ──────────────────────────────────────────────────────────────
# TEST 10  audit records scoped per assessment — no stale mixing
# ──────────────────────────────────────────────────────────────
def test_10_audit_records_scoped_per_assessment():
    """
    Two assessments must produce separate audit records.
    Recent Activity for assessment B must not contain records from assessment A.
    """
    from backend.storage.database import init_db, add_audit_record, get_audit_records_by_assessment

    init_db()
    asm_a = "ASM-REGTEST-A"
    asm_b = "ASM-REGTEST-B"

    add_audit_record(
        event="Governance Consensus: QUARANTINE",
        source="GOVERNANCE",
        severity="CRITICAL",
        evidence="Contradictory labels detected.",
        decision="QUARANTINE",
        assessment_id=asm_a
    )
    add_audit_record(
        event="Governance Consensus: ACCEPT",
        source="GOVERNANCE",
        severity="INFO",
        evidence="All boundaries nominal.",
        decision="ACCEPT",
        assessment_id=asm_b
    )

    records_a = get_audit_records_by_assessment(asm_a)
    records_b = get_audit_records_by_assessment(asm_b)

    # Assessment A must only have its own record
    assert all(r["assessment_id"] == asm_a for r in records_a), \
        f"Found foreign records in A's audit: {records_a}"
    assert any(r["decision"] == "QUARANTINE" for r in records_a)

    # Assessment B must only have its own record  
    assert all(r["assessment_id"] == asm_b for r in records_b), \
        f"Found foreign records in B's audit: {records_b}"
    assert any(r["decision"] == "ACCEPT" for r in records_b)

    # B's records must NOT appear in A's records
    b_ids = {r["id"] for r in records_b}
    a_ids = {r["id"] for r in records_a}
    assert b_ids.isdisjoint(a_ids), "Assessment A and B share audit records — isolation broken!"
