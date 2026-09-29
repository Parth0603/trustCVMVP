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
  }
};
