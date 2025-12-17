/**
 * Centralized configuration for the Rug Processor Pipeline
 * 
 * Change these values here to affect the entire application.
 */

export const PIPELINE_CONFIG = {
  // Number of rugs per batch chunk
  // - Testing: 10 (smaller chunks for faster iteration)
  // - Production: 75 (optimal for Gemini Batch API)
  chunkSize: 75,

  // Maximum number of parallel batch jobs
  // - Testing: 3 (easier to monitor)
  // - Production: 5 (maximize throughput)
  concurrentLimit: 5,

  // Polling interval for batch status (in milliseconds)
  // - Production: 30 seconds (balance between responsiveness and API limits)
  pollingInterval: 30000, // 30 seconds

  // Image download timeout (in milliseconds)
  imageDownloadTimeout: 30000, // 30 seconds

  // Maximum image file size (in bytes)
  maxImageSize: 10 * 1024 * 1024, // 10MB
} as const;

// Production preset - uncomment to use
// export const PIPELINE_CONFIG = {
//   chunkSize: 75,
//   concurrentLimit: 5,
//   pollingInterval: 15000,
//   imageDownloadTimeout: 30000,
//   maxImageSize: 10 * 1024 * 1024,
// } as const;

export type PipelineConfig = typeof PIPELINE_CONFIG;
