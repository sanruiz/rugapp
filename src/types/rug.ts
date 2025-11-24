export interface RugData {
  sku: string;
  title: string;
  description: string;
  primaryCategory: string;
  secondaryCategory: string;
  pile: string;
  foundation: string;
  borderColor: string;
  fieldColor: string;
  exactFieldColor: string;
  otherColors: string[];
  weight: string;
  style: string;
  material: string;
  weavetype: string;
  rugtype: string;
  origin: string;
  imageLink: string;
  color: string;
  exactSize: string;
  size: string;
  totalSqFt: string;
  stockShape: string;
  shape: string;
  ambiente: string;
  decorStyle: string;
}

export interface ProcessedRug extends RugData {
  prompt: string;
  imageBase64?: string;
  batchRequestId?: string;
}

export interface BatchRequest {
  key: string;
  request: {
    contents: Array<{
      parts: Array<{
        text?: string;
        inline_data?: {
          mime_type: string;
          data: string;
        };
      }>;
    }>;
    generation_config?: {
      temperature?: number;
      max_output_tokens?: number;
      response_modalities?: string[];
      image_config?: {
        aspect_ratio?: string;
        image_size?: string;
      };
    };
  };
}

export interface ProcessingStatus {
  total: number;
  processed: number;
  errors: number;
  status: 'idle' | 'processing' | 'complete' | 'error';
  currentStep: string;
}

export interface BatchJob {
  batchId: string;
  displayName: string;
  state: 'JOB_STATE_PENDING' | 'JOB_STATE_RUNNING' | 'JOB_STATE_SUCCEEDED' | 'JOB_STATE_FAILED' | 'JOB_STATE_CANCELLED' | 'JOB_STATE_EXPIRED';
  createTime: string;
  updateTime?: string;
  requestCount: number;
  completedCount: number;
  failedCount: number;
  outputFile?: string;
  error?: string;
}

export interface BatchResult {
  key: string;
  response?: {
    candidates: Array<{
      content: {
        parts: Array<{
          text: string;
        }>;
      };
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
}
