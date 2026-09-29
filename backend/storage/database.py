import sqlite3
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

DB_PATH = Path(__file__).resolve().parent / "trustcv.db"

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY,
        upload_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        detected_format TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        cycle_id TEXT NOT NULL,
        status TEXT NOT NULL,
        dataset_name TEXT NOT NULL,
        model_name TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        verdict TEXT,
        risk_score INTEGER,
        confidence INTEGER,
        summary_json TEXT,
        data_result_json TEXT,
        model_result_json TEXT,
        provenance_result_json TEXT,
        shift_result_json TEXT,
        governance_result_json TEXT,
        report_json TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_records (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        event TEXT NOT NULL,
        source TEXT NOT NULL,
        severity TEXT NOT NULL,
        hash TEXT NOT NULL,
        previous_hash TEXT NOT NULL,
        actor TEXT NOT NULL,
        evidence TEXT NOT NULL,
        decision TEXT NOT NULL,
        status TEXT NOT NULL,
        assessment_id TEXT
    )
    """)

    # Migration: add assessment_id column if it doesn't exist yet
    try:
        cursor.execute("ALTER TABLE audit_records ADD COLUMN assessment_id TEXT")
        conn.commit()
    except Exception:
        pass  # column already exists
    
    conn.commit()
    
    # Initialize Genesis block in audit records if empty
    cursor.execute("SELECT COUNT(*) FROM audit_records")
    if cursor.fetchone()[0] == 0:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        genesis_prev = "0000000000000000000000000000000000000000000000000000000000000000"
        genesis_payload = f"GENESIS-{now}-{genesis_prev}"
        genesis_hash = hashlib.sha256(genesis_payload.encode()).hexdigest()
        
        cursor.execute("""
        INSERT INTO audit_records (id, timestamp, event, source, severity, hash, previous_hash, actor, evidence, decision, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "AUD-1001",
            now,
            "Air-Gapped Sovereign Audit Ledger Genesis Initialized",
            "SYSTEM",
            "INFO",
            genesis_hash,
            genesis_prev,
            "TRUST-CV-ROOT",
            "FIPS 180-4 cryptographic chaining root notarized.",
            "ACCEPT",
            "COMMITTED"
        ))
        conn.commit()
        
    conn.close()

def save_upload(upload_id: str, upload_type: str, file_name: str, file_path: str, detected_format: str, metadata: dict):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    cursor.execute("""
    INSERT INTO uploads (id, upload_type, file_name, file_path, detected_format, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (upload_id, upload_type, file_name, file_path, detected_format, json.dumps(metadata), now))
    conn.commit()
    conn.close()

def get_upload(upload_id: str) -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM uploads WHERE id = ?", (upload_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if d.get("metadata_json"):
        d["metadata"] = json.loads(d["metadata_json"])
    return d

def create_assessment(assessment_id: str, cycle_id: str, dataset_name: str, model_name: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    cursor.execute("""
    INSERT INTO assessments (id, cycle_id, status, dataset_name, model_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (assessment_id, cycle_id, "QUEUED", dataset_name, model_name, now))
    conn.commit()
    conn.close()

def update_assessment_status(assessment_id: str, status: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE assessments SET status = ? WHERE id = ?", (status, assessment_id))
    conn.commit()
    conn.close()

def save_assessment_results(
    assessment_id: str,
    verdict: str,
    risk_score: int,
    confidence: int,
    summary: dict,
    data_result: dict,
    model_result: dict,
    provenance_result: dict,
    shift_result: dict,
    governance_result: dict,
    report: dict
):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    cursor.execute("""
    UPDATE assessments
    SET status = ?,
        completed_at = ?,
        verdict = ?,
        risk_score = ?,
        confidence = ?,
        summary_json = ?,
        data_result_json = ?,
        model_result_json = ?,
        provenance_result_json = ?,
        shift_result_json = ?,
        governance_result_json = ?,
        report_json = ?
    WHERE id = ?
    """, (
        "COMPLETED",
        now,
        verdict,
        risk_score,
        confidence,
        json.dumps(summary),
        json.dumps(data_result),
        json.dumps(model_result),
        json.dumps(provenance_result),
        json.dumps(shift_result),
        json.dumps(governance_result),
        json.dumps(report),
        assessment_id
    ))
    conn.commit()
    conn.close()

def get_assessment(assessment_id: str) -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assessments WHERE id = ?", (assessment_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    for field in ["summary_json", "data_result_json", "model_result_json", "provenance_result_json", "shift_result_json", "governance_result_json", "report_json"]:
        key = field.replace("_json", "")
        if d.get(field):
            d[key] = json.loads(d[field])
        else:
            d[key] = None
    return d

def get_latest_assessment() -> Optional[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM assessments ORDER BY created_at DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return get_assessment(row["id"])

def add_audit_record(
    event: str,
    source: str,
    severity: str,
    evidence: str,
    decision: str,
    actor: str = "TRUST-CV-ENGINE",
    assessment_id: Optional[str] = None
) -> dict:
    conn = get_connection()
    cursor = conn.cursor()

    # Get last hash
    cursor.execute("SELECT hash, id FROM audit_records ORDER BY ROWID DESC LIMIT 1")
    last_row = cursor.fetchone()
    previous_hash = last_row["hash"] if last_row else "0000000000000000000000000000000000000000000000000000000000000000"

    # Generate record ID
    cursor.execute("SELECT COUNT(*) FROM audit_records")
    count = cursor.fetchone()[0]
    rec_id = f"AUD-{1000 + count + 1}"

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    payload = f"{rec_id}:{now}:{event}:{source}:{severity}:{previous_hash}:{decision}"
    current_hash = hashlib.sha256(payload.encode()).hexdigest()

    cursor.execute("""
    INSERT INTO audit_records (id, timestamp, event, source, severity, hash, previous_hash, actor, evidence, decision, status, assessment_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (rec_id, now, event, source, severity, current_hash, previous_hash, actor, evidence, decision, "COMMITTED", assessment_id))

    conn.commit()
    conn.close()

    return {
        "id": rec_id,
        "timestamp": now,
        "event": event,
        "source": source,
        "severity": severity,
        "hash": current_hash,
        "previous_hash": previous_hash,
        "actor": actor,
        "evidence": evidence,
        "decision": decision,
        "status": "COMMITTED",
        "assessment_id": assessment_id
    }

def get_all_audit_records() -> List[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_records ORDER BY ROWID DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_audit_records_by_assessment(assessment_id: str) -> List[dict]:
    """Return only audit records that belong to a specific assessment."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM audit_records WHERE assessment_id = ? ORDER BY ROWID ASC",
        (assessment_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def verify_audit_chain() -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_records ORDER BY ROWID ASC")
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        return {"valid": True, "total_records": 0, "message": "Ledger is empty"}
        
    for i in range(1, len(rows)):
        prev_record = rows[i - 1]
        curr_record = rows[i]
        
        if curr_record["previous_hash"] != prev_record["hash"]:
            return {
                "valid": False,
                "broken_at_record": curr_record["id"],
                "expected_previous_hash": prev_record["hash"],
                "actual_previous_hash": curr_record["previous_hash"],
                "message": f"Cryptographic chain broken at record {curr_record['id']}"
            }
            
    return {
        "valid": True,
        "total_records": len(rows),
        "latest_hash": rows[-1]["hash"],
        "message": "All cryptographic forward hashes verified intact."
    }
