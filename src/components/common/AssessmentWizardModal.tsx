import React, { useState } from 'react';
import { useApp } from '../../state/AppContext';
import { realBackendApi, DatasetInspectionResult, ModelInspectionResult } from '../../services/realBackendApi';

interface AssessmentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssessmentWizardModal: React.FC<AssessmentWizardModalProps> = ({ isOpen, onClose }) => {
  const { isBackendConnected, runRealAssessment, assessmentProgress, setActivePage } = useApp();

  const [step, setStep] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Upload states
  const [isUploadingDataset, setIsUploadingDataset] = useState(false);
  const [datasetInspection, setDatasetInspection] = useState<DatasetInspectionResult | null>(null);

  const [isUploadingModel, setIsUploadingModel] = useState(false);
  const [modelInspection, setModelInspection] = useState<ModelInspectionResult | null>(null);

  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const [refInspection, setRefInspection] = useState<DatasetInspectionResult | null>(null);

  // Engine toggles
  const [engines, setEngines] = useState({
    dataIntegrity: true,
    modelIntegrity: true,
    provenance: true,
    distributionShift: true
  });

  const [isExecuting, setIsExecuting] = useState(false);

  if (!isOpen) return null;

  // Step 1: Upload Dataset
  const handleDatasetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setIsUploadingDataset(true);
    try {
      const res = await realBackendApi.uploadDataset(file);
      setDatasetInspection(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Dataset upload and parsing failed.');
    } finally {
      setIsUploadingDataset(false);
    }
  };

  // Step 2: Upload Model
  const handleModelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setIsUploadingModel(true);
    try {
      const res = await realBackendApi.uploadModel(file);
      setModelInspection(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Model upload and parsing failed.');
    } finally {
      setIsUploadingModel(false);
    }
  };

  // Step 3: Upload Reference Dataset
  const handleRefFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setIsUploadingRef(true);
    try {
      const res = await realBackendApi.uploadReferenceDataset(file);
      setRefInspection(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Reference dataset upload failed.');
    } finally {
      setIsUploadingRef(false);
    }
  };

  // Step 5: Start Assessment
  const handleExecuteAssessment = async () => {
    if (!datasetInspection) {
      setErrorMsg('Please upload and validate a dataset first.');
      return;
    }
    setErrorMsg(null);
    setIsExecuting(true);
    try {
      await runRealAssessment(
        datasetInspection.upload_id,
        modelInspection?.upload_id,
        refInspection?.upload_id
      );
      setIsExecuting(false);
      onClose();
      setActivePage('overview');
    } catch (err: any) {
      setIsExecuting(false);
      setErrorMsg(err.message || 'Assessment pipeline failed during execution.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={() => !isExecuting && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative z-[101] w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-2xl p-6 flex flex-col gap-4 border border-surface-container-high animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-container-high/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold">
                ASSURANCE ENGINE
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                isBackendConnected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isBackendConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                {isBackendConnected ? 'Air-Gapped Backend Connected' : 'Offline / Standalone'}
              </span>
            </div>
            <h3 className="font-title-md text-lg font-semibold text-on-surface mt-0.5">
              New Computer Vision Integrity Assessment
            </h3>
          </div>
          {!isExecuting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Wizard Step Navigation */}
        <div className="flex items-center justify-between text-xs py-1.5 border-b border-surface-container-high/40 overflow-x-auto">
          {[
            { num: 1, label: 'Dataset' },
            { num: 2, label: 'Model (Opt)' },
            { num: 3, label: 'Baseline (Opt)' },
            { num: 4, label: 'Engines' },
            { num: 5, label: 'Run' }
          ].map((s, idx, arr) => (
            <React.Fragment key={s.num}>
              <button
                onClick={() => !isExecuting && setStep(s.num)}
                disabled={isExecuting}
                className={`flex items-center gap-1.5 py-1 px-2 rounded font-medium transition-colors ${
                  step === s.num
                    ? 'text-primary bg-primary/10'
                    : step > s.num
                    ? 'text-emerald-700 font-semibold'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] ${
                  step === s.num
                    ? 'bg-primary text-on-primary font-bold'
                    : step > s.num
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-surface-container-high text-secondary'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </span>
                <span>{s.label}</span>
              </button>
              {idx < arr.length - 1 && (
                <span className="material-symbols-outlined text-secondary text-[14px]">chevron_right</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-red-600">error</span>
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Upload Dataset */}
        {step === 1 && (
          <div className="flex flex-col gap-3 py-1">
            <div>
              <span className="text-sm font-semibold text-on-surface">Target Computer Vision Dataset</span>
              <p className="text-xs text-secondary mt-0.5">
                Upload a ZIP archive containing COCO (<code className="text-primary font-mono">instances.json</code>), YOLO (<code className="text-primary font-mono">data.yaml</code> / label txts), or class folders.
              </p>
            </div>

            <div className="border-2 border-dashed border-surface-container-high hover:border-primary/50 rounded-xl p-5 text-center transition-colors bg-surface-container-low/40">
              <input
                type="file"
                id="dataset-upload-input"
                accept=".zip,.tar,.gz,.json"
                onChange={handleDatasetFileChange}
                disabled={isUploadingDataset}
                className="hidden"
              />
              <label
                htmlFor="dataset-upload-input"
                className="flex flex-col items-center justify-center cursor-pointer gap-2"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">
                    {isUploadingDataset ? 'hourglass_top' : 'cloud_upload'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-primary">
                    {isUploadingDataset ? 'Uploading & Inspecting Archive...' : 'Click to select dataset package'}
                  </span>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Supports .ZIP (COCO, YOLO, Custom directories)
                  </p>
                </div>
              </label>
            </div>

            {/* Inspection details card */}
            {datasetInspection && (
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                    Detected Format: <span className="font-mono uppercase">{datasetInspection.format}</span>
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                    {datasetInspection.validation_status}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div>
                    <span className="text-secondary block">Images:</span>
                    <span className="font-semibold text-on-surface">{(datasetInspection.total_images ?? 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-secondary block">Annotations:</span>
                    <span className="font-semibold text-on-surface">{(datasetInspection.total_annotations ?? 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-secondary block">Classes:</span>
                    <span className="font-semibold text-on-surface">{datasetInspection.num_classes ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-secondary block">Size:</span>
                    <span className="font-semibold text-on-surface">{((datasetInspection.dataset_size_bytes ?? 0) / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
                {datasetInspection.class_names && datasetInspection.class_names.length > 0 && (
                  <div className="text-[11px] text-secondary">
                    <span className="font-medium text-emerald-900">Class vocabulary:</span>{' '}
                    {datasetInspection.class_names.slice(0, 8).join(', ')}
                    {datasetInspection.class_names.length > 8 ? ` +${datasetInspection.class_names.length - 8} more` : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Upload Model (Optional) */}
        {step === 2 && (
          <div className="flex flex-col gap-3 py-1">
            <div>
              <span className="text-sm font-semibold text-on-surface">Model Binary (Optional)</span>
              <p className="text-xs text-secondary mt-0.5">
                Upload ONNX Runtime or PyTorch model weights to evaluate cryptographic fingerprints and metamorphic invariance. Skip if auditing dataset only.
              </p>
            </div>

            <div className="border-2 border-dashed border-surface-container-high hover:border-primary/50 rounded-xl p-5 text-center transition-colors bg-surface-container-low/40">
              <input
                type="file"
                id="model-upload-input"
                accept=".onnx,.pt,.pth,.bin"
                onChange={handleModelFileChange}
                disabled={isUploadingModel}
                className="hidden"
              />
              <label
                htmlFor="model-upload-input"
                className="flex flex-col items-center justify-center cursor-pointer gap-2"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">
                    {isUploadingModel ? 'hourglass_top' : 'psychology'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-primary">
                    {isUploadingModel ? 'Hashing Model File...' : 'Click to select model binary (.onnx, .pt)'}
                  </span>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Safe local loading; supports ONNX Runtime &amp; TorchScript
                  </p>
                </div>
              </label>
            </div>

            {modelInspection && (
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high text-xs flex flex-col gap-1.5 font-mono">
                <div className="flex items-center justify-between font-sans">
                  <span className="font-semibold text-on-surface">{modelInspection.model_name}</span>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-semibold text-[10px]">
                    {modelInspection.model_format}
                  </span>
                </div>
                <div className="text-secondary text-[11px] truncate">
                  SHA-256: <span className="text-on-surface">{modelInspection.model_sha256}</span>
                </div>
                <div className="text-secondary text-[11px]">
                  Size: {(modelInspection.model_size_bytes / 1024).toFixed(1)} KB
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Reference Dataset (Optional) */}
        {step === 3 && (
          <div className="flex flex-col gap-3 py-1">
            <div>
              <span className="text-sm font-semibold text-on-surface">Baseline Reference Dataset (Optional)</span>
              <p className="text-xs text-secondary mt-0.5">
                To perform mathematical distribution shift analysis (RBF-kernel MMD and Wasserstein divergence), supply a registered clean baseline.
              </p>
            </div>

            <div className="border-2 border-dashed border-surface-container-high hover:border-primary/50 rounded-xl p-5 text-center transition-colors bg-surface-container-low/40">
              <input
                type="file"
                id="ref-upload-input"
                accept=".zip,.tar,.gz"
                onChange={handleRefFileChange}
                disabled={isUploadingRef}
                className="hidden"
              />
              <label
                htmlFor="ref-upload-input"
                className="flex flex-col items-center justify-center cursor-pointer gap-2"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">
                    {isUploadingRef ? 'hourglass_top' : 'tune'}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-primary">
                    {isUploadingRef ? 'Extracting Reference...' : 'Click to select reference dataset archive (.zip)'}
                  </span>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Optional: enables MMD &amp; Wasserstein distance calculation
                  </p>
                </div>
              </label>
            </div>

            {refInspection && (
              <div className="p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high text-xs flex flex-col gap-1 font-mono">
                <span className="font-sans font-semibold text-on-surface">
                  Baseline: {refInspection.dataset_name} ({refInspection.total_images ?? 0} images)
                </span>
                <span className="text-secondary text-[11px]">
                  Format: {refInspection.format} | Ready for empirical kernel distribution test
                </span>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Engine Selection */}
        {step === 4 && (
          <div className="flex flex-col gap-3 py-1">
            <span className="text-sm font-semibold text-on-surface">Assurance Engine Configuration</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="p-3 rounded-lg border border-surface-container-high bg-surface-container-low/40 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={engines.dataIntegrity}
                  onChange={(e) => setEngines({ ...engines, dataIntegrity: e.target.checked })}
                  className="mt-0.5 rounded text-primary"
                />
                <div>
                  <span className="font-semibold text-on-surface block">Data Integrity Engine</span>
                  <span className="text-secondary text-[11px]">
                    SHA-256 duplicates, dHash clustering, label consistency, IsolationForest outliers.
                  </span>
                </div>
              </label>

              <label className="p-3 rounded-lg border border-surface-container-high bg-surface-container-low/40 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={engines.modelIntegrity}
                  onChange={(e) => setEngines({ ...engines, modelIntegrity: e.target.checked })}
                  className="mt-0.5 rounded text-primary"
                />
                <div>
                  <span className="font-semibold text-on-surface block">Model Integrity Engine</span>
                  <span className="text-secondary text-[11px]">
                    Artifact fingerprinting, metamorphic luminance &amp; flip invariance testing.
                  </span>
                </div>
              </label>

              <label className="p-3 rounded-lg border border-surface-container-high bg-surface-container-low/40 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={engines.provenance}
                  onChange={(e) => setEngines({ ...engines, provenance: e.target.checked })}
                  className="mt-0.5 rounded text-primary"
                />
                <div>
                  <span className="font-semibold text-on-surface block">Cryptographic Provenance</span>
                  <span className="text-secondary text-[11px]">
                    FIPS 186-5 Ed25519 canonical signing &amp; enclave chain notarization.
                  </span>
                </div>
              </label>

              <label className="p-3 rounded-lg border border-surface-container-high bg-surface-container-low/40 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={engines.distributionShift}
                  onChange={(e) => setEngines({ ...engines, distributionShift: e.target.checked })}
                  className="mt-0.5 rounded text-primary"
                />
                <div>
                  <span className="font-semibold text-on-surface block">Distribution Shift Engine</span>
                  <span className="text-secondary text-[11px]">
                    28-dim statistical visual features, RBF Maximum Mean Discrepancy, Wasserstein metric.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* STEP 5: Execution & Progress */}
        {step === 5 && (
          <div className="flex flex-col gap-4 py-2">
            <div>
              <span className="text-sm font-semibold text-on-surface">Ready to Execute Local Assurance Assessment</span>
              <p className="text-xs text-secondary mt-0.5">
                All algorithms run air-gapped on your local hardware. No cloud or external API calls are made.
              </p>
            </div>

            {/* Assessment manifest summary */}
            <div className="p-3.5 bg-surface-container-low rounded-xl border border-surface-container-high text-xs flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-secondary">Target Dataset:</span>
                <span className="font-semibold text-on-surface">{datasetInspection?.dataset_name || 'None selected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Images to Audit:</span>
                <span className="font-mono text-on-surface">{datasetInspection?.total_images || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Model Binary:</span>
                <span className="font-semibold text-on-surface">{modelInspection ? modelInspection.model_name : 'None (Data assessment)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Reference Baseline:</span>
                <span className="font-semibold text-on-surface">{refInspection ? refInspection.dataset_name : 'None (Baseline required for shift)'}</span>
              </div>
            </div>

            {/* Live execution progress bar */}
            {isExecuting && assessmentProgress && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 flex flex-col gap-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    {assessmentProgress.stage}
                  </span>
                  <span className="font-mono text-primary font-bold">{assessmentProgress.percent}%</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${assessmentProgress.percent}%` }}
                  />
                </div>
                <span className="text-[11px] text-secondary">{assessmentProgress.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer Navigation */}
        <div className="pt-3 border-t border-surface-container-high/60 flex items-center justify-between">
          <div>
            {step > 1 && !isExecuting && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-secondary text-xs font-medium transition-colors"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isExecuting && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-secondary text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            )}

            {step < 5 ? (
              <button
                onClick={() => {
                  if (step === 1 && !datasetInspection) {
                    setErrorMsg('Please select and upload a valid dataset package first.');
                    return;
                  }
                  setErrorMsg(null);
                  setStep(step + 1);
                }}
                disabled={step === 1 && !datasetInspection}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-semibold transition-colors shadow-xs flex items-center gap-1"
              >
                <span>Continue</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            ) : (
              <button
                onClick={handleExecuteAssessment}
                disabled={isExecuting || !datasetInspection}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5"
              >
                {isExecuting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Running Real Assessment...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    <span>Start Integrity Assessment</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
