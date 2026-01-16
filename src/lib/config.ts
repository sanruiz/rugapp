/**
 * Centralized configuration for the Rug Processor Pipeline
 * 
 * Change these values here to affect the entire application.
 * Uses environment-based defaults for easier testing vs production use.
 */

const isDev = process.env.NODE_ENV === "development";

// Development preset - smaller chunks, fewer parallel jobs for easier debugging
const DEV_CONFIG = {
  chunkSize: 10,
  concurrentLimit: 2,
  pollingInterval: 10000, // 10 seconds - faster feedback during dev
  imageDownloadTimeout: 30000,
  maxImageSize: 10 * 1024 * 1024,
} as const;

// Production preset - optimized for large batches
const PROD_CONFIG = {
  chunkSize: 75,
  concurrentLimit: 5,
  pollingInterval: 30000, // 30 seconds
  imageDownloadTimeout: 30000,
  maxImageSize: 10 * 1024 * 1024,
} as const;

/**
 * Active pipeline configuration
 * Automatically selects dev or prod settings based on NODE_ENV
 * 
 * Override with FORCE_PROD_CONFIG=true to use production settings in dev
 */
export const PIPELINE_CONFIG = process.env.FORCE_PROD_CONFIG === 'true' 
  ? PROD_CONFIG 
  : (isDev ? DEV_CONFIG : PROD_CONFIG);

// Export presets for manual switching in UI
export const CONFIG_PRESETS = {
  development: DEV_CONFIG,
  production: PROD_CONFIG,
} as const;

export type PipelineConfig = typeof PIPELINE_CONFIG;

/**
 * Check if running in development mode
 */
export const isDevMode = isDev;
