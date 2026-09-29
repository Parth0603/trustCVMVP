from typing import Dict, Any, List

class GovernanceEngine:
    def __init__(self, fusion_result: Dict[str, Any]):
        self.fusion_result = fusion_result

    def decide(self) -> Dict[str, Any]:
        risk_score = self.fusion_result["risk_score"]
        confidence = self.fusion_result["assessment_confidence"]
        findings = self.fusion_result.get("findings", [])
        severity = self.fusion_result.get("severity", "INFO")
        analyzed_engines = self.fusion_result.get("analyzed_engines", [])
        not_analyzed_engines = self.fusion_result.get("not_analyzed_engines", [])
        critical_count = self.fusion_result.get("critical_count", 0)
        high_count = self.fusion_result.get("high_count", 0)

        critical_findings = [f for f in findings if f.get("severity") == "CRITICAL"]
        high_findings = [f for f in findings if f.get("severity") == "HIGH"]
        blocking_findings = [f.get("finding") for f in (critical_findings + high_findings)]

        # Decision rules based on real evidence
        if critical_count > 0 or high_count >= 2 or risk_score >= 65:
            status = "QUARANTINE"
            reasons = [f.get("finding") for f in critical_findings] + [f.get("finding") for f in high_findings]
            if not reasons:
                reasons = [f"Overall integrity risk score ({risk_score}/100) exceeds safety threshold (65)."]
            top_reason = f"Quarantine triggered: {reasons[0]}"
            action = "Immediate feed isolation. Do not ingest into training or operational inference."
            affected_asset = critical_findings[0].get("affected_asset") if critical_findings else "Ingest Pipeline"
        elif high_count == 1 or risk_score >= 35 or any(f.get("severity") in ["WARNING", "MEDIUM"] for f in findings):
            status = "REVIEW"
            warn_findings = [f for f in findings if f.get("severity") in ["HIGH", "WARNING", "MEDIUM"]]
            reasons = [f.get("finding") for f in warn_findings]
            top_reason = f"Operator review required: {reasons[0]}"
            action = "Operator evaluation required prior to pipeline promotion or autonomous deployment."
            affected_asset = warn_findings[0].get("affected_asset") if warn_findings else "Perception Pipeline"
        else:
            status = "ACCEPT"
            engine_str = ", ".join(e.replace("_", " ").title() for e in analyzed_engines) or "Evaluated boundaries"
            top_reason = f"{engine_str} verified nominal; no blocking integrity findings detected."
            reasons = ["All analyzed boundary checks passed nominal integrity thresholds."]
            action = "Autonomous execution approved for analyzed boundaries."
            affected_asset = "Verified Pipeline Feed"

        return {
            "status": status,
            "overall_verdict": status,
            "risk_score": risk_score,
            "confidence": confidence,
            "assessment_confidence": confidence,
            "severity": severity,
            "reason": top_reason,
            "reasons": reasons,
            "blocking_findings": blocking_findings,
            "analyzed_engines": analyzed_engines,
            "not_analyzed_engines": not_analyzed_engines,
            "recommended_action": action,
            "affected_asset": affected_asset,
            "findings": findings
        }
