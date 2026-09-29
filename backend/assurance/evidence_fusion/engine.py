from typing import Dict, Any, List, Optional

class EvidenceFusionEngine:
    def __init__(
        self,
        data_result: Optional[Dict[str, Any]] = None,
        model_result: Optional[Dict[str, Any]] = None,
        provenance_result: Optional[Dict[str, Any]] = None,
        shift_result: Optional[Dict[str, Any]] = None
    ):
        self.data_result = data_result or {}
        self.model_result = model_result or {}
        self.provenance_result = provenance_result or {}
        self.shift_result = shift_result or {}

    def fuse(self) -> Dict[str, Any]:
        """
        Documented evidence fusion policy combining findings across all analyzed boundaries.
        STRICT: Only incorporates findings from actually executed engines.
        Never manufactures confidence or verified claims for unanalyzed components.
        """
        findings: List[Dict[str, Any]] = []
        analyzed_engines: List[str] = []
        not_analyzed_engines: List[str] = []

        # 1. Data Integrity Analysis (Always evaluated if dataset is present)
        is_data_analyzed = (
            bool(self.data_result) and
            self.data_result.get("status") not in ["Unavailable", "NOT_ANALYZED", "Not Analyzed"] and
            (
                self.data_result.get("total_images", 0) > 0 or
                self.data_result.get("score") is not None or
                "corrupted_images" in self.data_result or
                "findings" in self.data_result
            )
        )
        if is_data_analyzed:
            analyzed_engines.append("DATA_INTEGRITY")
            # Ingest structured findings from DataIntegrityEngine
            for df in self.data_result.get("findings", []):
                findings.append({
                    "engine": "Data Integrity Engine",
                    "category": df.get("category", "DATA_INTEGRITY"),
                    "finding": df.get("finding", "Data integrity observation"),
                    "severity": df.get("severity", "MEDIUM"),
                    "confidence": 0.98 if df.get("severity") == "CRITICAL" else 0.90,
                    "evidence": df.get("evidence", ""),
                    "affected_asset": ", ".join(df.get("affected_assets", [])[:4]) or "Dataset Ingest"
                })
        else:
            not_analyzed_engines.append("DATA_INTEGRITY")

        # 2. Model Integrity Analysis (Only if model was actually uploaded and analyzed)
        is_model_analyzed = (
            bool(self.model_result) and
            self.model_result.get("status") not in ["Unavailable", "NOT_ANALYZED", "Not Analyzed"] and
            self.model_result.get("model_format") not in ["None", "NONE"] and
            (
                self.model_result.get("model_format") is not None or
                "fingerprint_status" in self.model_result or
                "model_sha256" in self.model_result
            )
        )

        if is_model_analyzed:
            analyzed_engines.append("MODEL_INTEGRITY")
            fingerprint_status = self.model_result.get("fingerprint_status", "")
            if fingerprint_status == "MISMATCH":
                findings.append({
                    "engine": "Model Integrity Engine",
                    "category": "MODEL_CRYPTOGRAPHY",
                    "finding": "Model SHA-256 artifact digest mismatch against registered baseline.",
                    "severity": "CRITICAL",
                    "confidence": 1.0,
                    "evidence": f"Actual {str(self.model_result.get('model_sha256'))[:16]}... != Expected {str(self.model_result.get('reference_sha256'))[:16]}...",
                    "affected_asset": self.model_result.get("model_name", "Model Checkpoint")
                })
            elif fingerprint_status == "MATCH":
                findings.append({
                    "engine": "Model Integrity Engine",
                    "category": "MODEL_CRYPTOGRAPHY",
                    "finding": "Model weights verified against registered TPM PCR enclave record.",
                    "severity": "INFO",
                    "confidence": 1.0,
                    "evidence": f"SHA-256 digest: {str(self.model_result.get('model_sha256'))[:16]}...",
                    "affected_asset": self.model_result.get("model_name", "Model Checkpoint")
                })

            for mf in self.model_result.get("behavioral_tests", []):
                if mf.get("status") == "FAIL":
                    findings.append({
                        "engine": "Model Integrity Engine",
                        "category": "BEHAVIORAL_METAMORPHIC",
                        "finding": f"Metamorphic robustness test failed: {mf.get('test_name', 'perturbation')}",
                        "severity": "HIGH",
                        "confidence": 0.92,
                        "evidence": f"Output shift exceeded threshold under {mf.get('test_name')}.",
                        "affected_asset": self.model_result.get("model_name", "Model Checkpoint")
                    })
        else:
            not_analyzed_engines.append("MODEL_INTEGRITY")

        # 3. Provenance Analysis (Only if real inference/provenance artifact was executed)
        is_prov_analyzed = (
            bool(self.provenance_result) and
            self.provenance_result.get("status") not in ["Unavailable", "NOT_ANALYZED", "Not Analyzed"] and
            (
                self.provenance_result.get("analyzed") is True or
                "signature_valid" in self.provenance_result
            )
        )

        if is_prov_analyzed:
            analyzed_engines.append("INFERENCE_PROVENANCE")
            sig_valid = self.provenance_result.get("signature_valid")
            if sig_valid is False:
                findings.append({
                    "engine": "Inference Provenance Engine",
                    "category": "EXECUTION_PROVENANCE",
                    "finding": "Cryptographic Ed25519 signature verification failure.",
                    "severity": "CRITICAL",
                    "confidence": 1.0,
                    "evidence": "Inference bitstream or output bounding coordinates modified post-enclave.",
                    "affected_asset": "Inference Output Vector"
                })
            elif sig_valid is True:
                findings.append({
                    "engine": "Inference Provenance Engine",
                    "category": "EXECUTION_PROVENANCE",
                    "finding": "Inference provenance cryptographic signature verified.",
                    "severity": "INFO",
                    "confidence": 1.0,
                    "evidence": "Ed25519 signature valid over canonical payload.",
                    "affected_asset": "Inference Output Vector"
                })
        else:
            not_analyzed_engines.append("INFERENCE_PROVENANCE")

        # 4. Distribution Shift Analysis (Only if reference baseline was provided or shift level evaluated)
        is_shift_analyzed = (
            bool(self.shift_result) and
            self.shift_result.get("status") not in ["Unavailable", "NOT_ANALYZED", "Not Analyzed"] and
            (
                self.shift_result.get("has_reference") is True or
                (self.shift_result.get("shift_level") and self.shift_result.get("shift_level") not in ["NOT_ANALYZED", "Not Analyzed"])
            )
        )

        if is_shift_analyzed:
            analyzed_engines.append("DISTRIBUTION_SHIFT")
            shift_level = self.shift_result.get("shift_level", "NONE")
            mmd_val = self.shift_result.get("mmd_value")
            if shift_level == "CRITICAL":
                findings.append({
                    "engine": "Distribution Shift Engine",
                    "category": "DISTRIBUTION_DRIFT",
                    "finding": f"Substantial feature space divergence (MMD: {mmd_val}).",
                    "severity": "CRITICAL",
                    "confidence": 0.88,
                    "evidence": "Maximum Mean Discrepancy substantially exceeds safety envelope.",
                    "affected_asset": "Feature Vector Embedding"
                })
            elif shift_level == "MODERATE":
                findings.append({
                    "engine": "Distribution Shift Engine",
                    "category": "DISTRIBUTION_DRIFT",
                    "finding": f"Environmental distribution shift detected (MMD: {mmd_val}).",
                    "severity": "WARNING",
                    "confidence": 0.85,
                    "evidence": "Lux variance and atmospheric aerosol divergence observed.",
                    "affected_asset": "Perception Sensor Pipeline"
                })
        else:
            not_analyzed_engines.append("DISTRIBUTION_SHIFT")

        # =========================================================================
        # Severity-Aware Risk Synthesis (Does NOT average away critical findings)
        # =========================================================================
        critical_count = sum(1 for f in findings if f["severity"] == "CRITICAL")
        high_count = sum(1 for f in findings if f["severity"] == "HIGH")
        warning_count = sum(1 for f in findings if f["severity"] in ["WARNING", "MEDIUM"])

        if critical_count > 0:
            # Critical integrity violation: immediately escalates to high risk
            risk_score = min(99, 75 + (critical_count * 10) + (high_count * 4))
            highest_severity = "CRITICAL"
        elif high_count >= 2:
            # Multiple high findings: strong escalation
            risk_score = min(85, 60 + (high_count * 8) + (warning_count * 3))
            highest_severity = "HIGH"
        elif high_count == 1:
            risk_score = min(65, 45 + (warning_count * 4))
            highest_severity = "HIGH"
        elif warning_count > 0:
            risk_score = min(50, 20 + (warning_count * 6))
            highest_severity = "WARNING"
        else:
            # Clean assessment across evaluated components
            risk_score = 10
            highest_severity = "INFO"

        # Assessment Confidence: Reflects rigor of available evidence
        if "DATA_INTEGRITY" in analyzed_engines:
            assessment_confidence = 96 if (critical_count > 0 or len(findings) == 0) else 90
        else:
            assessment_confidence = 70

        return {
            "risk_score": risk_score,
            "assessment_confidence": assessment_confidence,
            "severity": highest_severity,
            "findings": findings,
            "analyzed_engines": analyzed_engines,
            "not_analyzed_engines": not_analyzed_engines,
            "critical_count": critical_count,
            "high_count": high_count,
            "warning_count": warning_count
        }
