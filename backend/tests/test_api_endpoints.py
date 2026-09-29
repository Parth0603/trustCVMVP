import io
import json
import zipfile
from PIL import Image
import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

def create_synthetic_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as zf:
        # Create an image
        img_io = io.BytesIO()
        im = Image.new("RGB", (64, 64), color=(255, 100, 100))
        im.save(img_io, format="JPEG")
        zf.writestr("images/sample_01.jpg", img_io.getvalue())
        
        # Create coco json
        coco = {
            "categories": [{"id": 1, "name": "vehicle"}],
            "images": [{"id": 1, "file_name": "sample_01.jpg", "width": 64, "height": 64}],
            "annotations": [{"id": 1, "image_id": 1, "category_id": 1, "bbox": [5, 5, 20, 20]}]
        }
        zf.writestr("annotations/instances.json", json.dumps(coco))
    return buf.getvalue()

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["mode"] == "AIR_GAPPED_OFFLINE"

def test_dataset_upload_and_assessment_flow():
    zip_bytes = create_synthetic_zip()
    
    # 1. Upload Dataset
    res_upload = client.post(
        "/api/assessments/upload-dataset",
        files={"file": ("dataset.zip", zip_bytes, "application/zip")}
    )
    assert res_upload.status_code == 200
    upload_data = res_upload.json()
    assert upload_data["detected_format"] == "COCO"
    assert upload_data["number_of_images"] == 1
    assert "vehicle" in upload_data["class_names"]
    
    dataset_upload_id = upload_data["upload_id"]
    
    # 2. Upload Model
    fake_model_bytes = b"FAKE_ONNX_MODEL_FILE_STREAM"
    res_model = client.post(
        "/api/assessments/upload-model",
        files={"file": ("detector.onnx", fake_model_bytes, "application/octet-stream")}
    )
    assert res_model.status_code == 200
    model_data = res_model.json()
    assert len(model_data["sha256"]) == 64
    model_upload_id = model_data["model_id"]
    
    # 3. Start Assessment
    res_start = client.post(
        "/api/assessments/start",
        json={
            "dataset_upload_id": dataset_upload_id,
            "model_upload_id": model_upload_id
        }
    )
    assert res_start.status_code == 200
    start_data = res_start.json()
    assessment_id = start_data["assessment_id"]
    assert assessment_id.startswith("ASM-")
    
    # 4. Check Status
    res_status = client.get(f"/api/assessments/{assessment_id}/status")
    assert res_status.status_code == 200
    
    # 5. Check Audit Records
    res_audit = client.get("/api/audit")
    assert res_audit.status_code == 200
    audit_data = res_audit.json()
    assert "records" in audit_data
    assert "verification" in audit_data
    assert audit_data["verification"]["valid"] is True

def test_provenance_verification_endpoint():
    res = client.post(
        "/api/provenance/verify",
        json={
            "input_hash": "0x1111",
            "model_hash": "0x2222",
            "output_hash": "0x3333",
            "nonce": "0x4444",
            "timestamp": "2026-09-29 04:00:00 UTC",
            "signature": "00" * 64,
            "public_key": "00" * 32
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert "failed" in data["reason"].lower() or "error" in data["reason"].lower()
