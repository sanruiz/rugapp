/**
 * Artwork data structure representing a painting or artwork piece
 */
export interface ArtworkData {
  sku: string;
  title: string;
  artist?: string;
  medium?: string;
  dimensions?: string;
  aspectRatio: AspectRatio;
  imageLink: string;
  /** Local file path (alternative to imageLink) */
  localImagePath?: string;
  style?: string;
  category?: string;
  description?: string;
  year?: string;
}

/**
 * Supported aspect ratios for artwork image generation
 */
export type AspectRatio = "1:1" | "1:2" | "2:1";

/**
 * Processed artwork with generated prompt
 */
export interface ProcessedArtwork extends ArtworkData {
  prompt: string;
  imageBase64?: string;
  batchRequestId?: string;
}

/**
 * Batch request structure for artwork
 */
export interface ArtworkBatchRequest {
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

/**
 * Processing status for artwork batch jobs
 */
export interface ArtworkProcessingStatus {
  total: number;
  processed: number;
  errors: number;
  status: "idle" | "processing" | "complete" | "error";
  currentStep: string;
}
