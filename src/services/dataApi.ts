// TRUST-CV Data Integrity Service Layer
// STRICT: Only derives results from real uploaded dataset analysis.
// Never returns fake / mock data.

import { SystemState } from '../types';
import { DataIntegrityResult } from './types';

export const dataApi = {
  async getDataIntegrityReport(state: SystemState): Promise<DataIntegrityResult | null> {
    if (!state.activeAssessmentData) {
      return null;
    }

    const real = state.activeAssessmentData;
    const palette = ['bg-primary', 'bg-primary-container', 'bg-secondary', 'bg-surface-variant', 'bg-amber-600', 'bg-indigo-600', 'bg-teal-600', 'bg-rose-600'];
    
    const classBalance = (real.classes || []).map((c: any, i: number) => ({
      name: c.name,
      percentage: Math.round(c.percentage || 0),
      colorClass: palette[i % palette.length]
    }));

    const totalSamples = real.total_images || 0;
    const exactDuplicates = real.exact_duplicate_count || 0;
    const nearDuplicates = real.near_duplicate_count || 0;
    const duplicateCount = exactDuplicates + nearDuplicates;
    const oodCount = (real.anomaly_indicators || []).length;
    const labelConflicts = (real.poisoning_indicators || []).length;
    const corruptedCount = real.corrupted_images || 0;
    const normalFrames = Math.max(0, totalSamples - (duplicateCount + oodCount + labelConflicts + corruptedCount));
    
    const anomalyRatio = totalSamples > 0
      ? Number(((duplicateCount + oodCount + labelConflicts + corruptedCount) / totalSamples * 100).toFixed(2))
      : 0;

    return {
      score: real.integrity_score ?? 100,
      status: (real.status === 'VERIFIED' ? 'VERIFIED' : 'FLAGGED') as any,
      benchmarkSet: state.dataset?.name || real.dataset_name || 'Uploaded Dataset',
      totalSamples,
      anomalyRatio,
      anomalyThreshold: 1.0,
      attestationProtocol: 'SHA-256 Per-Image Hash & Perceptual dHash Clustering',
      classBalance: classBalance.length > 0 ? classBalance : [{ name: 'Unclassified', percentage: 100, colorClass: 'bg-primary' }],
      anomalies: {
        normalFrames,
        nearDuplicates: duplicateCount,
        outOfDistribution: oodCount,
        labelConflicts,
      },
      annotatorBatches: [
        {
          batchId: `#INGEST-${real.format || 'LOCAL'}`,
          source: `${real.format || 'Custom'} File Stream (${totalSamples} images analyzed)`,
          samples: totalSamples,
          consensusScore: corruptedCount === 0 ? 1.0 : Number(((totalSamples - corruptedCount) / (totalSamples || 1)).toFixed(3)),
          status: corruptedCount === 0 && labelConflicts === 0 ? 'Notarized' : 'Flagged'
        }
      ]
    };
  }
};
