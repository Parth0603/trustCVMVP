import os
import pytest
from backend.assurance.evidence_fusion.engine import EvidenceFusionEngine
from backend.assurance.governance.engine import GovernanceEngine
from backend.assurance.runner import run_assessment_sync
from backend.assurance.data_integrity.engine import DataIntegrityEngine
from backend.parsers.yolo_parser import YOLOParser
from backend.storage.database import init_db, save_upload, create_assessment

def test_rule_1_clean_dataset_yields_accept():
    """Clean dataset with nominal metrics must yield ACCEPT."""
    data_clean = {
        "status": "Verified",
        "score": 98,
        "total_images": 20,
        "corrupted_images": 0,
        "invalid_annotations": 0,
        "duplicate_images": 0,
        "findings": []
    }
    fusion = EvidenceFusionEngine(data_result=data_clean).fuse()
    gov = GovernanceEngine(fusion).decide()
    assert gov["status"] == "ACCEPT"
    assert gov["risk_score"] <= 20
    assert "QUARANTINE" not in gov["status"]

def test_rule_2_high_severity_integrity_violations_cannot_accept():
    """A dataset with high/critical integrity violations must escalate to QUARANTINE, never ACCEPT."""
    data_bad = {
        "status": "Flagged",
        "score": 15,
        "total_images": 20,
        "corrupted_images": 5,
        "invalid_annotations": 12,
        "findings": [
            {
                "finding": "Conflicting duplicate annotations detected: identical image assigned contradictory classes.",
                "severity": "CRITICAL",
                "affected_assets": ["img_01.jpg", "img_02.jpg"]
            },
            {
                "finding": "Malformed YOLO syntax or out-of-bounds coordinates detected.",
                "severity": "CRITICAL",
                "affected_assets": ["label_01.txt"]
            }
        ]
    }
    fusion = EvidenceFusionEngine(data_result=data_bad).fuse()
    gov = GovernanceEngine(fusion).decide()
    assert gov["status"] == "QUARANTINE"
    assert gov["status"] != "ACCEPT"
    assert gov["risk_score"] >= 75
    assert len(gov["blocking_findings"]) >= 1

def test_rule_3_no_model_uploaded_yields_not_analyzed_and_null_confidence():
    """When no model is uploaded, model integrity and model confidence must be NOT_ANALYZED / None."""
    model_empty = {"status": "NOT_ANALYZED", "model_format": "None", "analyzed": False}
    fusion = EvidenceFusionEngine(model_result=model_empty).fuse()
    assert "MODEL_INTEGRITY" in fusion["not_analyzed_engines"]
    assert "MODEL_INTEGRITY" not in fusion["analyzed_engines"]

def test_rule_4_no_inference_records_yields_not_analyzed():
    """Inference provenance must not report Verified if no real inference records were executed."""
    prov_empty = {"status": "NOT_ANALYZED", "analyzed": False}
    fusion = EvidenceFusionEngine(provenance_result=prov_empty).fuse()
    assert "INFERENCE_PROVENANCE" in fusion["not_analyzed_engines"]
    assert "INFERENCE_PROVENANCE" not in fusion["analyzed_engines"]

def test_rule_5_no_reference_baseline_yields_not_analyzed():
    """Without a reference baseline, distribution shift must be NOT_ANALYZED."""
    shift_empty = {"status": "NOT_ANALYZED", "analyzed": False, "shift_level": "NOT_ANALYZED"}
    fusion = EvidenceFusionEngine(shift_result=shift_empty).fuse()
    assert "DISTRIBUTION_SHIFT" in fusion["not_analyzed_engines"]
    assert "DISTRIBUTION_SHIFT" not in fusion["analyzed_engines"]

def test_rule_6_multiple_high_severity_escalates_to_quarantine():
    """Multiple HIGH severity findings must escalate to QUARANTINE."""
    data_high = {
        "status": "Flagged",
        "score": 40,
        "total_images": 15,
        "findings": [
            {
                "finding": "High coordinate bounding box out of bounds.",
                "severity": "HIGH",
                "affected_assets": ["box1"]
            },
            {
                "finding": "Significant label distribution anomaly.",
                "severity": "HIGH",
                "affected_assets": ["box2"]
            }
        ]
    }
    fusion = EvidenceFusionEngine(data_result=data_high).fuse()
    gov = GovernanceEngine(fusion).decide()
    assert gov["status"] == "QUARANTINE"

def test_rule_7_only_distribution_shift_yields_review_not_quarantine():
    """Environmental shift alone without malicious attacks must escalate to REVIEW, not QUARANTINE."""
    data_clean = {"score": 95, "total_images": 10, "findings": []}
    shift_mod = {"shift_level": "MODERATE", "mmd_value": 0.19}
    fusion = EvidenceFusionEngine(data_result=data_clean, shift_result=shift_mod).fuse()
    gov = GovernanceEngine(fusion).decide()
    assert gov["status"] == "REVIEW"
    assert gov["status"] != "QUARANTINE"
    assert "Operator review required" in gov["reason"]

def test_quarantine_dataset_real_sync_execution():
    """Verify that running the real user quarantine test dataset yields QUARANTINE and high risk score."""
    quar_zip = "backend/uploads/fa20be7c-8ec8-4322-9a62-268fb0b05275/TRUST-CV_quarantine_test_dataset.zip"
    if not os.path.exists(quar_zip):
        pytest.skip("Quarantine dataset zip not found.")

    import uuid
    init_db()
    upload_id = f"test-quar-upload-{uuid.uuid4()}"
    save_upload(
        upload_id=upload_id,
        upload_type="dataset",
        file_name="TRUST-CV_quarantine_test_dataset.zip",
        file_path=os.path.abspath(quar_zip),
        detected_format="YOLO",
        metadata={"image_count": 27}
    )
    asm_id = f"ASM-TEST-{uuid.uuid4()}"
    create_assessment(asm_id, "CYC-TEST", "TRUST-CV_quarantine_test_dataset.zip")

    summary = run_assessment_sync(
        assessment_id=asm_id,
        cycle_id="CYC-TEST",
        dataset_upload_id=upload_id,
        model_upload_id=None,
        reference_upload_id=None
    )

    # Must be QUARANTINE
    assert summary["overall_verdict"] == "QUARANTINE"
    # Risk score must reflect the high severity (>= 80)
    assert summary["risk_score"] >= 80
    # Model confidence must be None
    assert summary["model_confidence"] is None
    # Trust chain must accurately reflect states
    tc_dict = {node["name"]: node["status"] for node in summary["trust_chain"]}
    assert tc_dict["Data"] == "Flagged"
    assert tc_dict["Model"] == "Not Analyzed"
    assert tc_dict["Inference"] == "Not Analyzed"
    assert tc_dict["Environment"] == "Not Analyzed"
    assert tc_dict["Decision"] == "QUARANTINE"
