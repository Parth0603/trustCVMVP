import { SystemState } from '../types';

export const getInitialState = (): SystemState => {
  return {
    dataset: null,
    model: null,
    inference: null,
    distribution: null,
    governance: null,
    auditEvents: [],
    sneakernet: {
      usbConnected: false,
      yubikeyAuthenticated: false,
      packageVerified: false,
      packageVersion: 'None',
      signatureValid: false,
      installed: false,
      lastUpdateTimestamp: 'None'
    },
    demoMode: false,
    judgeMode: false,
    demoStep: 0,
    lastUpdated: null,
    systemTrustScore: null,
    activeAssessmentId: undefined,
    activeAssessmentStatus: undefined,
    activeAssessmentSummary: null,
    activeAssessmentData: null,
    activeAssessmentModel: null,
    activeAssessmentProvenance: null,
    activeAssessmentShift: null,
    activeAssessmentReport: null,
  };
};
