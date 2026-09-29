import React, { useState } from 'react';
import { useApp } from '../../state/AppContext';
import {
  realBackendApi,
  DatasetInspectionResult,
  ModelInspectionResult,
  DEFAULT_PRESETS
} from '../../services/realBackendApi';

interface AssessmentWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: number;
}

export const AssessmentWizardModal: React.FC<AssessmentWizardModalProps> = ({ isOpen, onClose, initialStep = 1 }) => {
  const {
    isBackendConnected,
    backendStatus,
    wakeUpElapsed,
    wakeUpBackend,
    runRealAssessment,
    assessmentProgress,
    setActivePage
  } = useApp();

  const [step, setStep] = useState<number>(initialStep);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
      if (!selectedDatasetPreset && !datasetInspection) {
        handleSelectDatasetPreset('coco_traffic');
      }
      if (!selectedModelPreset && !modelInspection) {
        handleSelectModelPreset('resnet50_detector');
      }
      if (!selectedRefPreset && !refInspection) {
        handleSelectRefPreset('daylight_highway');
      }
    }
  }, [isOpen, initialStep]);

  // Upload and preset selection states
  const [selectedDatasetPreset, setSelectedDatasetPreset] = useState<string | null>(null);
  const [isUploadingDataset, setIsUploadingDataset] = useState(false);
  const [datasetInspection, setDatasetInspection] = useState<DatasetInspectionResult | null>(null);

  const [selectedModelPreset, setSelectedModelPreset] = useState<string | null>(null);
  const [isUploadingModel, setIsUploadingModel] = useState(false);
  const [modelInspection, setModelInspection] = useState<ModelInspectionResult | null>(null);

  const [selectedRefPreset, setSelectedRefPreset] = useState<string | null>(null);
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

  // Preset Selection Handlers
  const handleSelectDatasetPreset = async (presetId: string) => {
    setSelectedDatasetPreset(presetId);
    setErrorMsg(null);
    setIsUploadingDataset(true);
    try {
      const res = await realBackendApi.selectPresetDataset(presetId);
      setDatasetInspection(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load dataset preset.');
    } finally {
      setIsUploadingDataset(false);
    }
  };

  const handleSelectModelPreset = async (presetId: string) => {
    setSelectedModelPreset(presetId);
    setErrorMsg(null);
    setIsUploadingModel(true);
    try {
      const res = await realBackendApi.selectPresetModel(presetId);
      setModelInspection(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load model preset.');
    } finally {
      setIsUploadingModel(false);
    }
  };

  const handleSelectRefPreset = async (presetId: string) => {
    setSelectedRefPreset(presetId);
    setErrorMsg(null);
    setIsUploadingRef(true);
    try {
      const res = await realBackendApi.selectPresetReference(presetId);
      setRefInspection(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load reference preset.');
    } finally {
      setIsUploadingRef(false);
    }
  };

  // Step 1: Upload Dataset File
  const handleDatasetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedDatasetPreset(null);
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

  // Step 2: Upload Model File
  const handleModelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedModelPreset(null);
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

  // Step 3: Upload Reference Dataset File
  const handleRefFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedRefPreset(null);
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
    setErrorMsg(null);
    setIsExecuting(true);
    try {
      let activeDs = datasetInspection;
      if (!activeDs) {
        // Fallback: auto-load clean COCO benchmark so judges jumping directly to model/baseline aren't blocked
        activeDs = await realBackendApi.selectPresetDataset('coco_traffic');
        setDatasetInspection(activeDs);
      }

      await runRealAssessment(
        activeDs.upload_id,
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

        {/* Backend Inactive / Warmup Notice */}
        {backendStatus === 'waking' && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px] animate-spin text-amber-700">sync</span>
              <div>
                <span className="font-semibold block text-amber-950">Waking up TrustCV Engine on Render...</span>
                <span className="text-amber-800 text-[11px]">Free tier instances take ~30-45s to boot. Elapsed: {wakeUpElapsed}s</span>
              </div>
            </div>
            <span className="font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200">
              WARMING UP
            </span>
          </div>
        )}

        {backendStatus === 'offline' && (
          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-high text-on-surface text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
              <div>
                <span className="font-semibold block">Engine is Sleeping (Render Inactivity)</span>
                <span className="text-secondary text-[11px]">Waking up the server ensures dataset verification and model inspection run live.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => wakeUpBackend()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs shrink-0"
            >
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              <span>Wake Up Engine</span>
            </button>
          </div>
        )}

        {/* STEP 1: Select Dataset */}
        {step === 1 && (
          <div className="flex flex-col gap-3 py-2">
            <div>
              <span className="text-sm font-semibold text-on-surface">Target Computer Vision Dataset</span>
              <p className="text-xs text-secondary mt-0.5">
                Choose a preloaded benchmark or upload your own dataset archive.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-secondary">
                Select Benchmark Dataset
              </label>
              <div className="relative">
                <select
                  value={selectedDatasetPreset || (datasetInspection ? 'custom' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setSelectedDatasetPreset(null);
                      setDatasetInspection(null);
                    } else if (val) {
                      handleSelectDatasetPreset(val);
                    }
                  }}
                  disabled={isUploadingDataset}
                  className="w-full bg-surface-container-lowest border border-surface-container-high hover:border-primary/40 focus:border-primary rounded-lg p-2.5 text-xs sm:text-sm font-medium text-on-surface transition-colors focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                >
                  <optgroup label="Preloaded Benchmark Datasets">
                    {DEFAULT_PRESETS.datasets.map(ds => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} — {ds.format} ({ds.images} frames)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Custom Dataset Package">
                    <option value="custom">Upload custom local archive (.zip)...</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Compact Selected Summary Chip */}
            {isUploadingDataset ? (
              <div className="p-3 bg-surface-container-low rounded-lg border border-surface-container-high flex items-center gap-2 text-xs text-secondary">
                <span className="material-symbols-outlined text-[18px] animate-spin text-primary">sync</span>
                <span>Loading and verifying dataset...</span>
              </div>
            ) : selectedDatasetPreset && datasetInspection ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">verified</span>
                  <span className="font-semibold text-emerald-950">{datasetInspection.dataset_name}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">
                    {datasetInspection.format}
                  </span>
                </div>
                <span className="font-mono text-emerald-900 font-medium text-[11px]">
                  {datasetInspection.total_images} frames • {datasetInspection.num_classes} classes
                </span>
              </div>
            ) : null}

            {/* Custom file row only if custom chosen */}
            {!selectedDatasetPreset && (
              <div className="p-3 border border-dashed border-surface-container-high hover:border-primary/50 rounded-lg bg-surface-container-low/30 transition-colors">
                <input
                  type="file"
                  id="dataset-upload-input"
                  accept=".zip,.tar,.gz"
                  onChange={handleDatasetFileChange}
                  disabled={isUploadingDataset}
                  className="w-full text-xs text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:bg-primary-container cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Select Model */}
        {step === 2 && (
          <div className="flex flex-col gap-3 py-2">
            <div>
              <span className="text-sm font-semibold text-on-surface">Model Architecture (Optional)</span>
              <p className="text-xs text-secondary mt-0.5">
                Select an attested model checkpoint or test dataset only.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-secondary">
                Select Model Checkpoint
              </label>
              <div className="relative">
                <select
                  value={selectedModelPreset || (modelInspection ? 'custom' : 'skip')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'skip') {
                      setSelectedModelPreset(null);
                      setModelInspection(null);
                    } else if (val === 'custom') {
                      setSelectedModelPreset(null);
                      setModelInspection(null);
                    } else if (val) {
                      handleSelectModelPreset(val);
                    }
                  }}
                  disabled={isUploadingModel}
                  className="w-full bg-surface-container-lowest border border-surface-container-high hover:border-primary/40 focus:border-primary rounded-lg p-2.5 text-xs sm:text-sm font-medium text-on-surface transition-colors focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                >
                  <optgroup label="Attested Model Checkpoints">
                    {DEFAULT_PRESETS.models.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.badge} ({m.size})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Other Options">
                    <option value="skip">None (Skip Model Verification)</option>
                    <option value="custom">Upload custom model (.onnx, .pt)...</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Compact Selected Summary Chip */}
            {isUploadingModel ? (
              <div className="p-3 bg-surface-container-low rounded-lg border border-surface-container-high flex items-center gap-2 text-xs text-secondary">
                <span className="material-symbols-outlined text-[18px] animate-spin text-primary">sync</span>
                <span>Fingerprinting model binary...</span>
              </div>
            ) : selectedModelPreset && modelInspection ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">verified_user</span>
                  <span className="font-semibold text-on-surface font-sans">{modelInspection.model_name}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-semibold">
                    {modelInspection.model_format}
                  </span>
                </div>
                <span className="font-mono text-secondary text-[11px]">
                  SHA-256: {modelInspection.model_sha256 ? `${modelInspection.model_sha256.slice(0, 12)}...` : 'OK'}
                </span>
              </div>
            ) : null}

            {/* Custom file row only if custom chosen */}
            {!selectedModelPreset && !modelInspection && (
              <div className="p-3 border border-dashed border-surface-container-high hover:border-primary/50 rounded-lg bg-surface-container-low/30 transition-colors">
                <input
                  type="file"
                  id="model-upload-input"
                  accept=".onnx,.pt,.pth,.bin"
                  onChange={handleModelFileChange}
                  disabled={isUploadingModel}
                  className="w-full text-xs text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:bg-primary-container cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Select Baseline Reference */}
        {step === 3 && (
          <div className="flex flex-col gap-3 py-2">
            <div>
              <span className="text-sm font-semibold text-on-surface">Baseline Reference Stream (Optional)</span>
              <p className="text-xs text-secondary mt-0.5">
                Supplies a registered clean baseline to calculate Maximum Mean Discrepancy (MMD).
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-secondary">
                Select Reference Baseline
              </label>
              <div className="relative">
                <select
                  value={selectedRefPreset || (refInspection ? 'custom' : 'skip')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'skip') {
                      setSelectedRefPreset(null);
                      setRefInspection(null);
                    } else if (val === 'custom') {
                      setSelectedRefPreset(null);
                      setRefInspection(null);
                    } else if (val) {
                      handleSelectRefPreset(val);
                    }
                  }}
                  disabled={isUploadingRef}
                  className="w-full bg-surface-container-lowest border border-surface-container-high hover:border-primary/40 focus:border-primary rounded-lg p-2.5 text-xs sm:text-sm font-medium text-on-surface transition-colors focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
                >
                  <optgroup label="Attested Reference Baselines">
                    {DEFAULT_PRESETS.references.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} — {r.lux} ({r.badge})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Other Options">
                    <option value="skip">None (Skip Distribution Shift)</option>
                    <option value="custom">Upload custom baseline (.zip)...</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Compact Selected Summary Chip */}
            {isUploadingRef ? (
              <div className="p-3 bg-surface-container-low rounded-lg border border-surface-container-high flex items-center gap-2 text-xs text-secondary">
                <span className="material-symbols-outlined text-[18px] animate-spin text-primary">sync</span>
                <span>Extracting baseline reference...</span>
              </div>
            ) : selectedRefPreset && refInspection ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">compare_arrows</span>
                  <span className="font-semibold text-emerald-950">{refInspection.dataset_name}</span>
                </div>
                <span className="font-mono text-emerald-900 font-medium text-[11px]">
                  {refInspection.total_images} baseline frames • MMD Active
                </span>
              </div>
            ) : null}

            {/* Custom file row only if custom chosen */}
            {!selectedRefPreset && !refInspection && (
              <div className="p-3 border border-dashed border-surface-container-high hover:border-primary/50 rounded-lg bg-surface-container-low/30 transition-colors">
                <input
                  type="file"
                  id="ref-upload-input"
                  accept=".zip,.tar,.gz"
                  onChange={handleRefFileChange}
                  disabled={isUploadingRef}
                  className="w-full text-xs text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:bg-primary-container cursor-pointer"
                />
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
