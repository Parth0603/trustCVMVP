import os
import uuid
import asyncio
from pathlib import Path
from typing import Optional, List
from datetime import datetime, timezone

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .schemas.schemas import (
    UploadDatasetResponse,
    UploadModelResponse,
    StartAssessmentRequest,
    StartAssessmentResponse,
    AssessmentStatus,
    AssessmentSummaryResponse,
    DataIntegrityResult,
    ModelIntegrityResult,
    ProvenanceResult,
    DistributionShiftResult,
    AssuranceReportResponse,
    VerifyProvenanceRequest,
    VerifyProvenanceResponse,
    AuditRecordSchema
)
from .storage.database import (
    init_db,
    save_upload,
    get_upload,
    create_assessment,
    get_assessment,
    get_latest_assessment,
    get_all_audit_records,
    get_audit_records_by_assessment,
    verify_audit_chain
)
from .storage.file_storage import safe_extract_zip, save_uploaded_file, UPLOAD_DIR
from .parsers.dataset_inspector import DatasetInspector
from .assurance.runner import run_assessment_sync
from .assurance.provenance.engine import verify_provenance_signature, create_canonical_payload

app = FastAPI(
    title="TRUST-CV Offline AI Integrity Assurance API",
    description="Sovereign Defensive AI Integrity Assurance Layer for Computer Vision Pipelines (SIH 2026 PS-26228)",
    version="2.0.0"
)

# Enable CORS for local Vite development and Vercel cloud deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/")
def root_index():
    return {
        "service": "TRUST-CV Local/Cloud Assurance Engine",
        "status": "online",
        "health_endpoint": "/api/health",
        "version": "2.0.0"
    }

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "TRUST-CV Local Assurance Engine",
        "mode": "AIR_GAPPED_OFFLINE",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "active_enclave": "Local Hardware PCR Simulator"
    }

@app.post("/api/assessments/upload-dataset", response_model=UploadDatasetResponse)
async def upload_dataset(file: UploadFile = File(...)):
    """
    Upload real COCO, YOLO, or Custom image folder dataset (ZIP archive or image).
    Inspects and validates real files locally.
    """
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    upload_id, saved_path = save_uploaded_file(file_bytes, file.filename)
    
    # If ZIP, safely extract it to target dir
    if saved_path.suffix.lower() == ".zip":
        extract_dir = saved_path.parent / "extracted"
        safe_extract_zip(saved_path, extract_dir)
        inspect_target = extract_dir
    else:
        inspect_target = saved_path.parent

    # Run real inspection
    inspector = DatasetInspector(inspect_target)
    inspection = inspector.inspect()

    # Strip non-JSON-serializable canonical object before storing metadata
    inspection_meta = {k: v for k, v in inspection.items() if k != "canonical"}

    save_upload(
        upload_id=upload_id,
        upload_type="dataset",
        file_name=file.filename,
        file_path=str(saved_path),
        detected_format=inspection["detected_format"],
        metadata=inspection_meta
    )

    return UploadDatasetResponse(
        upload_id=upload_id,
        dataset_name=inspection["dataset_name"],
        detected_format=inspection["detected_format"],
        format=inspection["detected_format"],
        file_count=inspection["number_of_images"],
        size_bytes=inspection["dataset_size_bytes"],
        dataset_size_bytes=inspection["dataset_size_bytes"],
        validation_status=inspection["validation_status"],
        number_of_images=inspection["number_of_images"],
        total_images=inspection["number_of_images"],
        number_of_annotations=inspection["number_of_annotations"],
        total_annotations=inspection["number_of_annotations"],
        number_of_classes=inspection["number_of_classes"],
        num_classes=inspection["number_of_classes"],
        class_names=inspection["class_names"],
        validation_errors=inspection.get("validation_errors", []),
        message=f"Successfully uploaded and parsed {inspection['detected_format']} dataset."
    )

@app.post("/api/assessments/upload-model", response_model=UploadModelResponse)
async def upload_model(file: UploadFile = File(...)):
    """
    Upload real model checkpoint (ONNX, PyTorch, or binary).
    Calculates SHA-256 fingerprint of the actual uploaded bytes.
    """
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded model file is empty.")

    upload_id, saved_path = save_uploaded_file(file_bytes, file.filename)
    
    import hashlib
    sha256 = hashlib.sha256(file_bytes).hexdigest()
    ext = saved_path.suffix.lower()
    
    if ext == ".onnx":
        fmt = "ONNX"
        access_mode = "WHITE-BOX"
    elif ext in [".pt", ".pth"]:
        fmt = "PyTorch"
        access_mode = "BLACK-BOX"
    else:
        fmt = f"Binary ({ext or 'raw'})"
        access_mode = "BLACK-BOX"

    save_upload(
        upload_id=upload_id,
        upload_type="model",
        file_name=file.filename,
        file_path=str(saved_path),
        detected_format=fmt,
        metadata={"sha256": sha256, "format": fmt, "access_mode": access_mode}
    )

    return UploadModelResponse(
        model_id=upload_id,
        model_name=file.filename,
        model_format=fmt,
        size_bytes=len(file_bytes),
        sha256=sha256,
        access_mode=access_mode,
        message="Model artifact registered and fingerprinted."
    )

@app.post("/api/assessments/upload-reference-dataset", response_model=UploadDatasetResponse)
async def upload_reference_dataset(file: UploadFile = File(...)):
    """
    Upload reference baseline dataset for real Maximum Mean Discrepancy (MMD) distribution shift testing.
    """
    return await upload_dataset(file)

@app.post("/api/assessments/start", response_model=StartAssessmentResponse)
async def start_assessment(req: StartAssessmentRequest, background_tasks: BackgroundTasks):
    """
    Initiate assessment across Data, Model, Provenance, and Distribution Shift boundaries.
    Executes real analysis locally in a background task.
    """
    dataset_info = get_upload(req.dataset_upload_id)
    if not dataset_info:
        raise HTTPException(status_code=404, detail="Dataset upload ID not found.")

    assessment_id = f"ASM-{str(uuid.uuid4())[:8].upper()}"
    cycle_id = f"#{datetime.now().strftime('%y%m')}-{assessment_id[-4:]}"
    dataset_name = dataset_info["file_name"]

    model_name = None
    if req.model_upload_id:
        model_info = get_upload(req.model_upload_id)
        if model_info:
            model_name = model_info["file_name"]

    create_assessment(assessment_id, cycle_id, dataset_name, model_name)

    # Launch actual analysis execution in background
    background_tasks.add_task(
        run_assessment_sync,
        assessment_id=assessment_id,
        cycle_id=cycle_id,
        dataset_upload_id=req.dataset_upload_id,
        model_upload_id=req.model_upload_id,
        reference_upload_id=req.reference_upload_id
    )

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return StartAssessmentResponse(
        assessment_id=assessment_id,
        status=AssessmentStatus.QUEUED,
        created_at=now_str,
        message="Assessment queued for local offline assurance processing."
    )

@app.get("/api/assessments/{assessment_id}/status")
def get_status(assessment_id: str):
    res = get_assessment(assessment_id)
    if not res:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    return {
        "assessment_id": assessment_id,
        "status": res["status"],
        "created_at": res["created_at"],
        "completed_at": res["completed_at"]
    }

@app.get("/api/assessments/{assessment_id}/summary")
def get_summary(assessment_id: str):
    res = get_assessment(assessment_id)
    if not res:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    if not res.get("summary"):
        return {
            "id": assessment_id,
            "status": res["status"],
            "message": f"Assessment is currently in state: {res['status']}"
        }
    return res["summary"]

@app.get("/api/assessments/latest/summary")
def get_latest_summary():
    res = get_latest_assessment()
    if not res or not res.get("summary"):
        raise HTTPException(status_code=404, detail="No completed assessment found.")
    return res["summary"]

@app.get("/api/assessments/{assessment_id}/data")
def get_data_result(assessment_id: str):
    res = get_assessment(assessment_id)
    if not res:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    if not res.get("data_result"):
        raise HTTPException(status_code=400, detail="Data analysis not yet completed.")
    return res["data_result"]

@app.get("/api/assessments/{assessment_id}/model")
def get_model_result(assessment_id: str):
    res = get_assessment(assessment_id)
    if not res:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    if not res.get("model_result"):
        raise HTTPException(status_code=400, detail="Model analysis not yet completed.")
    return res["model_result"]

@app.get("/api/assessments/{assessment_id}/provenance")
def get_provenance_result(assessment_id: str):
    res = get_assessment(assessment_id)
    if not res:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    if not res.get("provenance_result"):
        raise HTTPException(status_code=400, detail="Provenance analysis not yet completed.")
    return res["provenance_result"]

@app.get("/api/assessments/{assessment_id}/shift")
def get_shift_result(assessment_id: str):
    res = get_assessment(assessment_id)
    if not res:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    if not res.get("shift_result"):
        raise HTTPException(status_code=400, detail="Shift analysis not yet completed.")
    return res["shift_result"]

@app.get("/api/assessments/{assessment_id}/report")
def get_report(assessment_id: str):
    res = get_assessment(assessment_id)
    if not res:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    if not res.get("report"):
        raise HTTPException(status_code=400, detail="Report generation not yet completed.")
    return res["report"]

@app.get("/api/audit")
def get_audit_trail():
    """
    Returns full tamper-evident audit ledger with forward hash chain verification.
    """
    records = get_all_audit_records()
    verification = verify_audit_chain()
    return {
        "records": records,
        "verification": verification
    }

@app.get("/api/assessments/{assessment_id}/audit")
def get_assessment_audit(assessment_id: str):
    """
    Returns audit records scoped to a single assessment (for Recent Activity).
    """
    records = get_audit_records_by_assessment(assessment_id)
    return {
        "assessment_id": assessment_id,
        "records": records
    }

@app.post("/api/provenance/verify", response_model=VerifyProvenanceResponse)
def verify_provenance(req: VerifyProvenanceRequest):
    """
    Verifies an arbitrary Ed25519 digital signature against the canonical provenance payload.
    """
    valid, reason = verify_provenance_signature(
        input_hash=req.input_hash,
        model_hash=req.model_hash,
        output_hash=req.output_hash,
        nonce=req.nonce,
        timestamp=req.timestamp,
        signature_hex=req.signature,
        public_key_hex=req.public_key
    )
    canonical = create_canonical_payload(req.input_hash, req.model_hash, req.output_hash, req.nonce, req.timestamp)
    return VerifyProvenanceResponse(
        valid=valid,
        reason=reason,
        canonical_payload=canonical
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
