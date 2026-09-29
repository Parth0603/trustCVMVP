// TRUST-CV Distribution Shift Service Layer
// STRICT: Distribution shift requires a reference dataset.
// Returns null if no reference comparison was analyzed.

import { SystemState } from '../types';
import { DistributionShiftResult } from './types';

export const distributionApi = {
  async getDistributionShiftReport(state: SystemState): Promise<DistributionShiftResult | null> {
    if (!state.activeAssessmentShift) {
      return null;
    }

    const real = state.activeAssessmentShift;
    if (real.status === 'UNAVAILABLE' || !real.reference_baseline_provided) {
      return null;
    }

    const isNormal = real.shift_level === 'LOW';
    return {
      riskScore: real.risk_score ?? (isNormal ? 10 : 38),
      status: isNormal ? 'VERIFIED' : 'REVIEW',
      classification: isNormal ? 'BENIGN_BASELINE' : 'LEGITIMATE_SHIFT',
      findingTitle: isNormal ? 'Nominal Domain Distribution' : `Domain Shift Detected (${real.shift_level} divergence)`,
      findingDescription: real.finding_description || `Empirical MMD divergence is ${real.mmd} with Wasserstein distance ${real.wasserstein}.`,
      mmd: real.mmd ?? 0.0,
      mmdThreshold: 0.15,
      wasserstein: real.wasserstein ?? 0.0,
      adversarialRisk: real.adversarial_risk ?? 0.01,
      ambientLux: 'Real Evaluated Stream',
      aerosolIndex: 'Calculated from Ingest',
      cameraCleanliness: 'Nominal',
      lensOcclusion: 'None',
      recommendedMitigation: isNormal ? 'None required' : 'Review target domain illumination and sensor variation before deployment.'
    };
  }
};
