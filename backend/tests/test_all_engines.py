import os
import json
import tempfile
import zipfile
import pytest
import numpy as np
from pathlib import Path
from PIL import Image

from backend.parsers.coco_parser import COCOParser
from backend.parsers.yolo_parser import YOLOParser
from backend.parsers.custom_parser import CustomFolderParser
from backend.parsers.dataset_inspector import DatasetInspector
from backend.assurance.data_integrity.engine import DataIntegrityEngine, compute_sha256, compute_dhash, hamming_distance
from backend.assurance.model_integrity.engine import ModelIntegrityEngine
from backend.assurance.provenance.engine import sign_provenance_record, verify_provenance_signature, ProvenanceEngine
from backend.assurance.distribution_shift.engine import DistributionShiftEngine, compute_mmd
from backend.assurance.evidence_fusion.engine import EvidenceFusionEngine
from backend.assurance.governance.engine import GovernanceEngine
from backend.storage.database import init_db, add_audit_record, get_all_audit_records, verify_audit_chain

@pytest.fixture
def temp_dataset():
    """
    Creates a temporary synthetic COCO dataset with real images, duplicates, and annotations.
    """
    with tempfile.TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        img_dir = root / "images"
        ann_dir = root / "annotations"
        img_dir.mkdir()
        ann_dir.mkdir()

        # Create 3 real images (img1, img2 different, img3 identical to img1 for duplicate test)
        img1_path = img_dir / "img_01.jpg"
        img2_path = img_dir / "img_02.jpg"
        img3_path = img_dir / "img_03.jpg"

        im1 = Image.new("RGB", (100, 100), color=(255, 0, 0))
        im1.save(img1_path)

        im2 = Image.new("RGB", (100, 100), color=(0, 255, 0))
        im2.save(img2_path)

        # img3 identical to img1
        im1.save(img3_path)

        # Create COCO instances.json
        coco_data = {
            "categories": [
                {"id": 1, "name": "vehicle"},
                {"id": 2, "name": "pedestrian"}
            ],
            "images": [
                {"id": 1, "file_name": "img_01.jpg", "width": 100, "height": 100},
                {"id": 2, "file_name": "img_02.jpg", "width": 100, "height": 100},
                {"id": 3, "file_name": "img_03.jpg", "width": 100, "height": 100}
            ],
            "annotations": [
                {"id": 101, "image_id": 1, "category_id": 1, "bbox": [10, 10, 50, 50]},
                {"id": 102, "image_id": 2, "category_id": 2, "bbox": [5, 5, 40, 40]},
                {"id": 103, "image_id": 3, "category_id": 1, "bbox": [10, 10, 50, 50]}
            ]
        }
        with open(ann_dir / "instances.json", "w") as f:
            json.dump(coco_data, f)

        yield root

def test_1_coco_parser(temp_dataset):
    parser = COCOParser(temp_dataset / "annotations" / "instances.json", temp_dataset / "images")
    res = parser.parse()
    assert res["valid"] is True
    assert res["total_images"] == 3
    assert res["total_annotations"] == 3
    assert res["class_counts"]["vehicle"] == 2
    assert res["class_counts"]["pedestrian"] == 1

def test_2_yolo_parser():
    with tempfile.TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        img_dir = root / "images"
        lbl_dir = root / "labels"
        img_dir.mkdir()
        lbl_dir.mkdir()

        # Create image and matching YOLO label
        img_path = img_dir / "frame_01.jpg"
        im = Image.new("RGB", (64, 64), color=(128, 128, 128))
        im.save(img_path)

        lbl_path = lbl_dir / "frame_01.txt"
        with open(lbl_path, "w") as f:
            f.write("0 0.5 0.5 0.25 0.25\n")

        parser = YOLOParser(root)
        res = parser.parse()
        assert res["total_images"] == 1
        assert res["valid_annotations"] == 1
        assert res["invalid_annotations"] == 0

def test_3_image_validation_and_corrupted():
    with tempfile.TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        # Create corrupted image file (plain text instead of image bytes)
        bad_img = root / "corrupt.jpg"
        with open(bad_img, "wb") as f:
            f.write(b"NOT_A_VALID_JPEG_HEADER")

        inspector = DatasetInspector(root)
        inspection = inspector.inspect()
        engine = DataIntegrityEngine(root, inspection["parse_result"])
        res = engine.analyze()
        assert res["corrupted_images"] == 1

def test_4_sha256_duplicate_detection(temp_dataset):
    # temp_dataset has img_01.jpg and img_03.jpg identical
    inspector = DatasetInspector(temp_dataset)
    inspection = inspector.inspect()
    engine = DataIntegrityEngine(temp_dataset, inspection["parse_result"])
    res = engine.analyze()
    assert res["duplicate_images"] == 1 # 1 duplicate pair
    assert len(res["duplicate_groups"]) == 1

def test_5_near_duplicate_detection():
    # Create two images that are slightly perturbed in 1 pixel
    im1 = Image.new("RGB", (32, 32), color=(100, 100, 100))
    im2 = Image.new("RGB", (32, 32), color=(100, 100, 102)) # very near duplicate
    h1 = compute_dhash(im1)
    h2 = compute_dhash(im2)
    dist = hamming_distance(h1, h2)
    assert dist <= 3

def test_6_label_validation_invalid_boxes():
    with tempfile.TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        ann_path = root / "instances.json"
        coco_data = {
            "categories": [{"id": 1, "name": "vehicle"}],
            "images": [{"id": 1, "file_name": "img.jpg", "width": 50, "height": 50}],
            "annotations": [
                {"id": 1, "image_id": 1, "category_id": 1, "bbox": [0, 0, -10, 20]}, # invalid negative width
                {"id": 2, "image_id": 1, "category_id": 1, "bbox": [0, 0, 100, 100]} # exceeds bounds
            ]
        }
        with open(ann_path, "w") as f:
            json.dump(coco_data, f)

        parser = COCOParser(ann_path, root)
        res = parser.parse()
        assert res["invalid_annotations"] == 2

def test_7_class_distribution(temp_dataset):
    inspector = DatasetInspector(temp_dataset)
    inspection = inspector.inspect()
    engine = DataIntegrityEngine(temp_dataset, inspection["parse_result"])
    res = engine.analyze()
    assert len(res["class_distribution"]) == 2
    # vehicle is 2/3 (66.7%), pedestrian is 1/3 (33.3%)
    assert res["class_distribution"][0]["class_name"] in ["vehicle", "pedestrian"]

def test_8_anomaly_detection():
    with tempfile.TemporaryDirectory() as tmp_dir:
        root = Path(tmp_dir)
        # Create 10 normal gray images
        for i in range(10):
            im = Image.new("RGB", (50, 50), color=(100, 100, 100))
            im.save(root / f"normal_{i}.jpg")
        # Create 1 bright white outlier
        outlier = Image.new("RGB", (500, 20), color=(255, 255, 255))
        outlier.save(root / "outlier.jpg")

        inspector = DatasetInspector(root)
        inspection = inspector.inspect()
        engine = DataIntegrityEngine(root, inspection["parse_result"])
        res = engine.analyze()
        assert res["total_images"] == 11
        assert res["valid_images"] == 11

def test_9_model_hashing():
    with tempfile.NamedTemporaryFile(suffix=".onnx", delete=False) as f:
        f.write(b"FAKE_ONNX_MODEL_BYTES_FOR_HASHING")
        path = Path(f.name)

    try:
        engine = ModelIntegrityEngine(path)
        res = engine.analyze()
        assert len(res["model_sha256"]) == 64
        assert res["model_format"] == "ONNX"
    finally:
        os.remove(path)

def test_10_provenance_signing_and_11_verification():
    record = sign_provenance_record(
        input_hash="0x1111222233334444",
        model_hash="0x5555666677778888",
        output_hash="0x9999aaaabbbbcccc"
    )
    assert "signature" in record
    assert "public_key" in record

    # Real verification
    valid, msg = verify_provenance_signature(
        input_hash=record["input_hash"],
        model_hash=record["model_hash"],
        output_hash=record["output_hash"],
        nonce=record["nonce"],
        timestamp=record["timestamp"],
        signature_hex=record["signature"],
        public_key_hex=record["public_key"]
    )
    assert valid is True

    # Tampered test
    tampered_valid, tampered_msg = verify_provenance_signature(
        input_hash="0xTAMPERED_HASH",
        model_hash=record["model_hash"],
        output_hash=record["output_hash"],
        nonce=record["nonce"],
        timestamp=record["timestamp"],
        signature_hex=record["signature"],
        public_key_hex=record["public_key"]
    )
    assert tampered_valid is False

def test_12_audit_chain_verification():
    init_db()
    rec1 = add_audit_record("Test Event 1", "DATA_ENGINE", "INFO", "Evidence 1", "ACCEPT")
    rec2 = add_audit_record("Test Event 2", "MODEL_ENGINE", "INFO", "Evidence 2", "ACCEPT")
    
    assert rec2["previous_hash"] == rec1["hash"]
    
    verification = verify_audit_chain()
    assert verification["valid"] is True

def test_13_distribution_shift_mmd():
    # Two identical distribution matrices should have MMD ~ 0.0
    X = np.ones((10, 20))
    Y = np.ones((10, 20))
    mmd = compute_mmd(X, Y)
    assert mmd < 0.01

    # Two distinctly separated distribution matrices
    Z = np.zeros((10, 20))
    mmd_shift = compute_mmd(X, Z)
    assert mmd_shift > 0.1

def test_14_evidence_fusion_and_15_governance():
    # Case 1: Healthy checks -> ACCEPT
    data_clean = {"score": 98, "corrupted_images": 0, "invalid_annotations": 0, "duplicate_images": 0}
    model_clean = {"model_name": "Net", "fingerprint_status": "MATCH", "model_sha256": "abcdef"}
    prov_clean = {"signature_valid": True}
    shift_clean = {"shift_level": "NONE", "mmd_value": 0.04}

    fusion = EvidenceFusionEngine(data_clean, model_clean, prov_clean, shift_clean).fuse()
    gov = GovernanceEngine(fusion).decide()
    assert gov["status"] == "ACCEPT"

    # Case 2: Environmental shift detected -> REVIEW
    shift_env = {"shift_level": "MODERATE", "mmd_value": 0.18}
    fusion_env = EvidenceFusionEngine(data_clean, model_clean, prov_clean, shift_env).fuse()
    gov_env = GovernanceEngine(fusion_env).decide()
    assert gov_env["status"] == "REVIEW"

    # Case 3: Fingerprint mismatch -> QUARANTINE
    model_bad = {"model_name": "Net", "fingerprint_status": "MISMATCH", "model_sha256": "bad"}
    fusion_bad = EvidenceFusionEngine(data_clean, model_bad, prov_clean, shift_clean).fuse()
    gov_bad = GovernanceEngine(fusion_bad).decide()
    assert gov_bad["status"] == "QUARANTINE"
