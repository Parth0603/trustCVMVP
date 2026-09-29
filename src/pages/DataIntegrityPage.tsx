import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { dataApi } from '../services/dataApi';
import { DataIntegrityResult } from '../services/types';
import { AssessmentWizardModal } from '../components/common/AssessmentWizardModal';

export const DataIntegrityPage: React.FC = () => {
  const { state, setActivePage } = useApp();
  const [dataReport, setDataReport] = useState<DataIntegrityResult | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);

  useEffect(() => {
    dataApi.getDataIntegrityReport(state).then(setDataReport);
  }, [state]);

  // EMPTY STATE: No dataset uploaded / analyzed
  if (!dataReport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-xl mx-auto text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high/60 border border-surface-container-high flex items-center justify-center mb-6 text-secondary">
          <span className="material-symbols-outlined text-[36px]">database</span>
        </div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight mb-2">
          Data Integrity
        </h2>
        <p className="text-sm text-secondary mb-8 max-w-md">
          Upload a dataset to begin an integrity assessment. TRUST-CV validates images, computes perceptual hashes, detects duplicates, and inspects label distributions.
        </p>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-medium text-sm shadow-xs flex items-center gap-2"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>UPLOAD DATASET</span>
        </button>
        <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      </div>
    );
  }

  const rawData = state.activeAssessmentData || {};
  const duplicateClusters = rawData.duplicate_clusters || [];
  const anomalyIndicators = rawData.anomaly_indicators || [];
  const poisoningIndicators = rawData.poisoning_indicators || [];

  return (
    <div className="flex flex-col gap-space-lg w-full max-w-[1200px] mx-auto pb-space-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => setActivePage('overview')}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
            title="Back to Overview"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-on-surface">Data Integrity</h2>
            <p className="text-xs sm:text-sm text-secondary">
              Real file validation, perceptual hash deduplication, and label distribution analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold border border-outline-variant/30">
            Score {dataReport.score} / 100
          </span>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="px-3 py-1 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-medium transition-colors shadow-xs flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">upload_file</span>
            <span>Upload New Dataset</span>
          </button>
        </div>
      </div>

      {/* Top 3 Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high">
          <span className="text-xs text-secondary font-medium">Evaluated Dataset</span>
          <div className="text-base font-semibold text-on-surface mt-1 truncate">{dataReport.benchmarkSet}</div>
          <span className="text-xs text-secondary mt-1 block font-mono">
            {dataReport.totalSamples.toLocaleString()} Uploaded Images
          </span>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high">
          <span className="text-xs text-secondary font-medium">Anomaly Ratio</span>
          <div className="text-base font-semibold text-on-surface mt-1">
            {dataReport.anomalyRatio}% <span className={`text-xs font-normal ${dataReport.anomalyRatio > 1.0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              ({dataReport.anomalyRatio > 1.0 ? 'Exceeds 1.0% threshold' : 'Within safe bounds'})
            </span>
          </div>
          <span className="text-xs text-secondary mt-1 block">
            {dataReport.anomalies.nearDuplicates + dataReport.anomalies.outOfDistribution + dataReport.anomalies.labelConflicts} detected issues
          </span>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high">
          <span className="text-xs text-secondary font-medium">Attestation Protocol</span>
          <div className="text-base font-semibold text-on-surface mt-1">{dataReport.attestationProtocol}</div>
          <span className="text-xs text-secondary mt-1 block font-mono">
            SHA-256 Per-Image Hash Verified
          </span>
        </div>
      </div>

      {/* Class Balance & Distribution */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface">Class Balance &amp; Distribution</span>
          <span className="text-xs text-secondary font-mono">
            {dataReport.classBalance.length} Classes Detected
          </span>
        </div>
        <div className="w-full bg-surface-container-low h-4 rounded-full overflow-hidden flex">
          {dataReport.classBalance.map((item, idx) => (
            <div
              key={idx}
              className={`${item.colorClass} h-full transition-all`}
              style={{ width: `${item.percentage}%` }}
              title={`${item.name}: ${item.percentage}%`}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-space-lg pt-space-xs text-xs">
          {dataReport.classBalance.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${item.colorClass}`}></span>
              <span>{item.name} ({item.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly Classification Matrix */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface">Anomaly Classification Matrix</span>
          <span className="text-[11px] text-secondary">
            Derived directly from uploaded image bytes &amp; annotations
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md mt-space-md text-center">
          <div className="p-space-md bg-surface-container-low rounded-xl border border-surface-container-high/40">
            <span className="text-xl font-semibold text-on-surface">
              {dataReport.anomalies.normalFrames.toLocaleString()}
            </span>
            <span className="text-xs text-secondary block mt-1">Normal Frames</span>
          </div>
          <div className="p-space-md bg-surface-container-low rounded-xl border border-surface-container-high/40">
            <span className={`text-xl font-semibold ${dataReport.anomalies.nearDuplicates > 0 ? 'text-amber-600' : 'text-on-surface'}`}>
              {dataReport.anomalies.nearDuplicates}
            </span>
            <span className="text-xs text-secondary block mt-1">Duplicate Images</span>
          </div>
          <div className="p-space-md bg-surface-container-low rounded-xl border border-surface-container-high/40">
            <span className={`text-xl font-semibold ${dataReport.anomalies.outOfDistribution > 0 ? 'text-amber-600' : 'text-on-surface'}`}>
              {dataReport.anomalies.outOfDistribution}
            </span>
            <span className="text-xs text-secondary block mt-1">Out-of-Distribution</span>
          </div>
          <div className="p-space-md bg-surface-container-low rounded-xl border border-surface-container-high/40">
            <span className={`text-xl font-semibold ${dataReport.anomalies.labelConflicts > 0 ? 'text-primary' : 'text-on-surface'}`}>
              {dataReport.anomalies.labelConflicts}
            </span>
            <span className="text-xs text-secondary block mt-1">Label Conflicts</span>
          </div>
        </div>
      </div>

      {/* Traceable Findings & Evidence Details */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high">
        <div className="flex items-center justify-between pb-2">
          <div>
            <span className="text-sm font-semibold text-on-surface">Traceable Findings &amp; Evidence Log</span>
            <p className="text-xs text-secondary mt-0.5">
              Click any finding to inspect affected files, hashes, and evidence
            </p>
          </div>
          <span className="text-xs font-mono text-secondary">
            {duplicateClusters.length + anomalyIndicators.length + poisoningIndicators.length} Findings
          </span>
        </div>

        {duplicateClusters.length === 0 && anomalyIndicators.length === 0 && poisoningIndicators.length === 0 ? (
          <div className="py-8 text-center text-xs text-secondary">
            No exact duplicates or anomalies detected in the uploaded dataset. All samples conform to safety bounds.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {/* Duplicates */}
            {duplicateClusters.map((cluster: any, idx: number) => (
              <div
                key={`dup-${idx}`}
                onClick={() => setSelectedFinding({
                  type: 'Duplicate Cluster',
                  id: cluster.cluster_id || `DUP-${idx + 1}`,
                  affectedFiles: cluster.images || [],
                  details: `Hamming distance cutoff <= 3 bits. Perceptual dHash collision detected between ${cluster.images?.length || 0} images.`,
                  reason: 'Redundant samples can skew training gradients or lead to memorization vulnerability.'
                })}
                className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer border border-surface-container-high transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">content_copy</span>
                  <div>
                    <span className="font-semibold text-on-surface">{cluster.cluster_id || `Cluster #${idx + 1}`}: </span>
                    <span className="text-secondary">{cluster.images?.length || 0} duplicate images detected</span>
                  </div>
                </div>
                <span className="text-primary font-medium flex items-center gap-1">
                  Inspect Evidence <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            ))}

            {/* OOD indicators */}
            {anomalyIndicators.map((ano: any, idx: number) => (
              <div
                key={`ano-${idx}`}
                onClick={() => setSelectedFinding({
                  type: 'Statistical Anomaly',
                  id: `ANO-${idx + 1}`,
                  affectedFiles: [ano.image_path || ano.file || 'Sample frame'],
                  details: ano.description || 'Covariance or luminance distribution deviated from dataset centroid.',
                  reason: 'Sample exhibits non-standard aspect ratio, spectrum, or metadata inconsistency.'
                })}
                className="p-3 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer border border-surface-container-high transition-colors flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
                  <div>
                    <span className="font-semibold text-on-surface">Statistical Outlier: </span>
                    <span className="text-secondary">{ano.image_path || ano.description || `Anomaly #${idx + 1}`}</span>
                  </div>
                </div>
                <span className="text-primary font-medium flex items-center gap-1">
                  Inspect Evidence <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Traceable Finding Modal / Inspector */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 border border-surface-container-high shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">analytics</span>
                <h3 className="text-sm font-semibold text-on-surface">Finding Evidence: {selectedFinding.id}</h3>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="p-1 rounded text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3 text-xs">
              <div>
                <span className="text-secondary font-medium block">Category:</span>
                <span className="text-on-surface font-semibold">{selectedFinding.type}</span>
              </div>
              <div>
                <span className="text-secondary font-medium block">Details:</span>
                <p className="text-on-surface mt-0.5">{selectedFinding.details}</p>
              </div>
              <div>
                <span className="text-secondary font-medium block">Assurance Reason:</span>
                <p className="text-on-surface mt-0.5">{selectedFinding.reason}</p>
              </div>
              <div>
                <span className="text-secondary font-medium block">Affected Files:</span>
                <div className="mt-1 bg-surface-container-low p-2 rounded border border-surface-container-high font-mono text-[11px] max-h-32 overflow-y-auto">
                  {selectedFinding.affectedFiles.map((f: string, i: number) => (
                    <div key={i} className="py-0.5 text-on-surface truncate">{f}</div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedFinding(null)}
                className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annotator & Provenance Ingest Stream */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high">
        <div className="flex items-center justify-between pb-2">
          <span className="text-sm font-semibold text-on-surface">Annotator &amp; Provenance Ingest Log</span>
          <span className="text-xs text-secondary font-mono">Real Ingest Batch</span>
        </div>
        <div className="mt-space-md overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-secondary font-medium border-b border-surface-container-high/60">
                <th className="pb-2.5">BATCH ID</th>
                <th className="pb-2.5">SOURCE</th>
                <th className="pb-2.5">SAMPLES</th>
                <th className="pb-2.5">CONSENSUS SCORE</th>
                <th className="pb-2.5">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {dataReport.annotatorBatches.map((b, idx) => (
                <tr key={idx} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="py-2.5 font-mono text-secondary">{b.batchId}</td>
                  <td className="py-2.5 font-medium text-on-surface">{b.source}</td>
                  <td className="py-2.5 font-mono">{b.samples.toLocaleString()}</td>
                  <td className="py-2.5 font-mono">{b.consensusScore}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-medium">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
};
