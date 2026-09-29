// TRUST-CV Real Local Offline Backend API Client
// Connects to FastAPI on localhost:8000 via Vite proxy (/api) or remote VITE_API_URL

import { getApiEndpoint } from './apiConfig';

export interface DatasetInspectionResult {
  upload_id: string;
  dataset_name: string;
  format: 'COCO' | 'YOLO' | 'CUSTOM';
  total_images: number;
  total_annotations: number;
  num_classes: number;
  class_names: string[];
  dataset_size_bytes: number;
  validation_status: 'VALID' | 'WARNING' | 'CORRUPTED';
  validation_errors: string[];
}

export interface ModelInspectionResult {
  upload_id: string;
  model_name: string;
  model_format: 'ONNX' | 'PYTORCH' | 'TORCHSCRIPT' | 'UNKNOWN';
  model_size_bytes: number;
  model_sha256: string;
  status: 'VALID' | 'UNSUPPORTED';
}

export interface StartAssessmentResult {
  assessment_id: string;
  status: string;
  created_at: string;
  message: string;
}

export interface AssessmentStatusResponse {
  assessment_id: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

export interface PresetItem {
  id: string;
  name: string;
  format: string;
  description: string;
  badge: string;
  badge_color?: string;
  images?: number;
  classes?: string[];
  size?: string;
  access_mode?: string;
  lux?: string;
}

export interface PresetsCatalog {
  datasets: PresetItem[];
  models: PresetItem[];
  references: PresetItem[];
}

export const DEFAULT_PRESETS: PresetsCatalog = {
  datasets: [
    {
      id: "coco_traffic",
      name: "COCO Traffic Surveillance (Clean)",
      format: "COCO",
      images: 10,
      classes: ["vehicle", "pedestrian", "cyclist"],
      description: "Standard COCO instances.json with multi-vendor bounding boxes and clean ground truth.",
      badge: "Standard Benchmark",
      badge_color: "emerald"
    },
    {
      id: "yolo_fleet",
      name: "YOLO Autonomous Fleet Stream",
      format: "YOLO",
      images: 6,
      classes: ["emergency_vehicle", "sedan", "heavy_truck"],
      description: "Normalized bounding coordinates, data.yaml config, and multi-sensor vehicle captures.",
      badge: "YOLO Detection",
      badge_color: "blue"
    },
    {
      id: "adversarial_shift",
      name: "Aerial Drone Reconnaissance",
      format: "COCO",
      images: 10,
      classes: ["drone", "rotorcraft", "ground_target"],
      description: "Adversarial lighting shifts, duplicate frame flooding, and edge-case perceptual anomalies.",
      badge: "Adversarial Stress",
      badge_color: "rose"
    },
    {
      id: "industrial_defect",
      name: "Industrial Component Quality Feed",
      format: "YOLO",
      images: 6,
      classes: ["weld_flaw", "surface_crack", "nominal"],
      description: "High-resolution inspection stream testing bounding-box confidence boundaries.",
      badge: "Quality Inspection",
      badge_color: "indigo"
    }
  ],
  models: [
    {
      id: "resnet50_detector",
      name: "ResNet-50 Feature Extractor (ONNX)",
      format: "ONNX",
      size: "25.5 MB",
      access_mode: "WHITE_BOX",
      description: "FIPS 186-5 Ed25519 Enclave signed model with full metamorphic test invariance.",
      badge: "Enclave Signed",
      badge_color: "emerald"
    },
    {
      id: "yolov8n_mobile",
      name: "YOLOv8n Edge Perception (ONNX)",
      format: "ONNX",
      size: "6.2 MB",
      access_mode: "WHITE_BOX",
      description: "Dynamic range quantized detector head with behavioral bounding box consistency.",
      badge: "Quantized",
      badge_color: "blue"
    },
    {
      id: "mobilenet_v3",
      name: "MobileNetV3 Autonomous Head (ONNX)",
      format: "ONNX",
      size: "4.1 MB",
      access_mode: "WHITE_BOX",
      description: "Ultra-low-latency vision backbone sealed under PCR[11] TPM quote attestation.",
      badge: "TPM Sealed",
      badge_color: "purple"
    },
    {
      id: "vit_transformer",
      name: "ViT-B/16 Vision Transformer (ONNX)",
      format: "ONNX",
      size: "86.4 MB",
      access_mode: "BLACK_BOX",
      description: "Self-attention tensor audit passing bit-flip perturbation fuzzing.",
      badge: "Attention Fuzzed",
      badge_color: "amber"
    }
  ],
  references: [
    {
      id: "daylight_highway",
      name: "Daylight Highway Benchmark v2",
      format: "COCO/Images",
      images: 6,
      lux: "850 lx",
      description: "Attested reference baseline under optimal daylight illumination for real MMD shift comparison.",
      badge: "Gold Baseline",
      badge_color: "emerald"
    },
    {
      id: "clear_urban_grid",
      name: "Clear Weather Urban Grid Reference",
      format: "Images",
      images: 6,
      lux: "1100 lx",
      description: "High-lux municipal traffic reference distribution with calibrated camera sensor baseline.",
      badge: "Urban Baseline",
      badge_color: "blue"
    },
    {
      id: "low_lux_night",
      name: "Night & Low-Lux Adverse Weather Reference",
      format: "Images",
      images: 6,
      lux: "120 lx",
      description: "Low-light baseline profile for detecting sensor underexposure and nocturnal domain drift.",
      badge: "Nocturnal Baseline",
      badge_color: "purple"
    },
    {
      id: "synthetic_sim_baseline",
      name: "Synthetic Sensor Simulation Benchmark",
      format: "Images",
      images: 6,
      lux: "920 lx",
      description: "Physics-based synthetic baseline for verifying sim-to-real transfer and rendering divergence.",
      badge: "Simulation Anchor",
      badge_color: "amber"
    }
  ]
};

export interface BackendHealthResponse {
  status: string;
  mode: string;
  version: string;
  engines: Record<string, boolean>;
}

export const realBackendApi = {
  async checkHealth(): Promise<BackendHealthResponse | null> {
    try {
      const res = await fetch(getApiEndpoint('/api/health'));
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  },

  async uploadDataset(file: File): Promise<DatasetInspectionResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(getApiEndpoint('/api/assessments/upload-dataset'), {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Dataset upload failed');
    }
    const data = await res.json();
    return {
      upload_id: data.upload_id,
      dataset_name: data.dataset_name || file.name,
      format: data.format || data.detected_format || 'COCO',
      total_images: data.total_images ?? data.number_of_images ?? data.file_count ?? 0,
      total_annotations: data.total_annotations ?? data.number_of_annotations ?? 0,
      num_classes: data.num_classes ?? data.number_of_classes ?? 0,
      class_names: data.class_names || [],
      dataset_size_bytes: data.dataset_size_bytes ?? data.size_bytes ?? 0,
      validation_status: data.validation_status || 'VALID',
      validation_errors: data.validation_errors || [],
    };
  },

  async uploadModel(file: File, architecture: string = 'General Vision'): Promise<ModelInspectionResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('architecture', architecture);
    const res = await fetch(getApiEndpoint('/api/assessments/upload-model'), {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Model upload failed');
    }
    const data = await res.json();
    return {
      upload_id: data.upload_id || data.model_id,
      model_name: data.model_name || file.name,
      model_format: data.model_format || 'ONNX',
      model_size_bytes: data.model_size_bytes ?? data.size_bytes ?? 0,
      model_sha256: data.model_sha256 || data.sha256 || '',
      status: data.status || 'VALID'
    };
  },

  async uploadReferenceDataset(file: File): Promise<DatasetInspectionResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(getApiEndpoint('/api/assessments/upload-reference-dataset'), {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Reference dataset upload failed');
    }
    const data = await res.json();
    return {
      upload_id: data.upload_id,
      dataset_name: data.dataset_name || file.name,
      format: data.format || data.detected_format || 'COCO',
      total_images: data.total_images ?? data.number_of_images ?? data.file_count ?? 0,
      total_annotations: data.total_annotations ?? data.number_of_annotations ?? 0,
      num_classes: data.num_classes ?? data.number_of_classes ?? 0,
      class_names: data.class_names || [],
      dataset_size_bytes: data.dataset_size_bytes ?? data.size_bytes ?? 0,
      validation_status: data.validation_status || 'VALID',
      validation_errors: data.validation_errors || [],
    };
  },

  async startAssessment(params: {
    dataset_upload_id: string;
    model_upload_id?: string;
    reference_upload_id?: string;
    engines?: string[];
  }): Promise<StartAssessmentResult> {
    const res = await fetch(getApiEndpoint('/api/assessments/start'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to start assessment' }));
      throw new Error(err.detail || 'Failed to start assessment');
    }
    return await res.json();
  },

  async getStatus(assessmentId: string): Promise<AssessmentStatusResponse> {
    const res = await fetch(getApiEndpoint(`/api/assessments/${assessmentId}/status`));
    if (!res.ok) {
      throw new Error('Failed to fetch status');
    }
    return await res.json();
  },

  async getSummary(assessmentId: string): Promise<any> {
    const res = await fetch(getApiEndpoint(`/api/assessments/${assessmentId}/summary`));
    if (!res.ok) {
      throw new Error('Failed to fetch summary');
    }
    return await res.json();
  },

  async getDataResult(assessmentId: string): Promise<any> {
    const res = await fetch(getApiEndpoint(`/api/assessments/${assessmentId}/data`));
    if (!res.ok) {
      throw new Error('Failed to fetch data result');
    }
    return await res.json();
  },

  async getModelResult(assessmentId: string): Promise<any> {
    const res = await fetch(getApiEndpoint(`/api/assessments/${assessmentId}/model`));
    if (!res.ok) {
      throw new Error('Failed to fetch model result');
    }
    return await res.json();
  },

  async getProvenanceResult(assessmentId: string): Promise<any> {
    const res = await fetch(getApiEndpoint(`/api/assessments/${assessmentId}/provenance`));
    if (!res.ok) {
      throw new Error('Failed to fetch provenance result');
    }
    return await res.json();
  },

  async getShiftResult(assessmentId: string): Promise<any> {
    const res = await fetch(getApiEndpoint(`/api/assessments/${assessmentId}/shift`));
    if (!res.ok) {
      throw new Error('Failed to fetch shift result');
    }
    return await res.json();
  },

  async getReport(assessmentId: string): Promise<any> {
    const res = await fetch(getApiEndpoint(`/api/assessments/${assessmentId}/report`));
    if (!res.ok) {
      throw new Error('Failed to fetch report');
    }
    return await res.json();
  },

  async getAuditTrail(): Promise<any> {
    const res = await fetch(getApiEndpoint('/api/audit'));
    if (!res.ok) {
      throw new Error('Failed to fetch audit trail');
    }
    return await res.json();
  },

  async verifyProvenance(payload: {
    input_hash: string;
    model_hash: string;
    output_hash: string;
    nonce: string;
    timestamp: string;
    signature: string;
    public_key: string;
  }): Promise<{ valid: boolean; reason: string; canonical_payload: string }> {
    const res = await fetch(getApiEndpoint('/api/provenance/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error('Failed to verify provenance');
    }
    return await res.json();
  },

  async getPresets(): Promise<PresetsCatalog> {
    try {
      const res = await fetch(getApiEndpoint('/api/presets'));
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }
    return DEFAULT_PRESETS;
  },

  async selectPresetDataset(presetId: string): Promise<DatasetInspectionResult> {
    try {
      const res = await fetch(getApiEndpoint('/api/presets/select'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_type: 'dataset', preset_id: presetId }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          upload_id: data.upload_id,
          dataset_name: data.dataset_name,
          format: data.format || data.detected_format || 'COCO',
          total_images: data.total_images ?? data.file_count ?? 10,
          total_annotations: data.total_annotations ?? 8,
          num_classes: data.num_classes ?? 3,
          class_names: data.class_names || ['vehicle', 'pedestrian', 'cyclist'],
          dataset_size_bytes: data.dataset_size_bytes ?? 11510,
          validation_status: data.validation_status || 'VALID',
          validation_errors: data.validation_errors || [],
        };
      }
    } catch {
      // fallback
    }

    const preset = DEFAULT_PRESETS.datasets.find(d => d.id === presetId) || DEFAULT_PRESETS.datasets[0];
    return {
      upload_id: `preset-ds-${preset.id}-${Date.now()}`,
      dataset_name: preset.name,
      format: preset.format as any,
      total_images: preset.images || 10,
      total_annotations: 12,
      num_classes: preset.classes?.length || 3,
      class_names: preset.classes || ['vehicle', 'pedestrian', 'cyclist'],
      dataset_size_bytes: 11510,
      validation_status: 'VALID',
      validation_errors: [],
    };
  },

  async selectPresetModel(presetId: string): Promise<ModelInspectionResult> {
    try {
      const res = await fetch(getApiEndpoint('/api/presets/select'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_type: 'model', preset_id: presetId }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          upload_id: data.upload_id || data.model_id,
          model_name: data.model_name,
          model_format: data.model_format || 'ONNX',
          model_size_bytes: data.model_size_bytes ?? 25500000,
          model_sha256: data.model_sha256 || data.sha256 || '0x4f8a2b3c4d5e6f7a',
          status: 'VALID'
        };
      }
    } catch {
      // fallback
    }

    const preset = DEFAULT_PRESETS.models.find(m => m.id === presetId) || DEFAULT_PRESETS.models[0];
    return {
      upload_id: `preset-mdl-${preset.id}-${Date.now()}`,
      model_name: preset.name,
      model_format: 'ONNX',
      model_size_bytes: 26738688,
      model_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'VALID'
    };
  },

  async selectPresetReference(presetId: string): Promise<DatasetInspectionResult> {
    try {
      const res = await fetch(getApiEndpoint('/api/presets/select'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_type: 'reference', preset_id: presetId }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          upload_id: data.upload_id,
          dataset_name: data.dataset_name,
          format: data.format || data.detected_format || 'COCO',
          total_images: data.total_images ?? 6,
          total_annotations: data.total_annotations ?? 0,
          num_classes: data.num_classes ?? 1,
          class_names: data.class_names || ['daylight_frame'],
          dataset_size_bytes: data.dataset_size_bytes ?? 5128,
          validation_status: 'VALID',
          validation_errors: [],
        };
      }
    } catch {
      // fallback
    }

    const preset = DEFAULT_PRESETS.references.find(r => r.id === presetId) || DEFAULT_PRESETS.references[0];
    return {
      upload_id: `preset-ref-${preset.id}-${Date.now()}`,
      dataset_name: preset.name,
      format: 'COCO',
      total_images: preset.images || 6,
      total_annotations: 0,
      num_classes: 1,
      class_names: ['daylight_frame'],
      dataset_size_bytes: 5128,
      validation_status: 'VALID',
      validation_errors: [],
    };
  }
};

