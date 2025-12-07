import { ProcessedRug, BatchJob } from '@/types/rug';
import { logger } from './logger';

export interface PipelineChunk {
  index: number;
  rugs: ProcessedRug[];
  status:
    | "pending"
    | "downloading_images"
    | "generating_jsonl"
    | "submitted"
    | "processing"
    | "downloading_results"
    | "completed"
    | "failed";
  batchId?: string;
  batchJob?: BatchJob;
  jsonlContent?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  // Results tracking
  resultsDownloaded?: boolean;
  imagesExtracted?: number;
  downloadError?: string;
}

export interface PipelineState {
  totalRugs: number;
  chunkSize: number;
  chunks: PipelineChunk[];
  concurrentLimit: number;
  currentlyProcessing: number[];
  completedCount: number;
  failedCount: number;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
}

export interface PipelineProgress {
  totalChunks: number;
  completedChunks: number;
  failedChunks: number;
  processingChunks: number[];
  pendingChunks: number;
  overallProgress: number; // 0-100
  estimatedTimeRemaining?: number; // milliseconds
  currentStatus: string;
}

/**
 * Split rugs into chunks
 */
export function createChunks(rugs: ProcessedRug[], chunkSize: number): PipelineChunk[] {
  const chunks: PipelineChunk[] = [];
  
  for (let i = 0; i < rugs.length; i += chunkSize) {
    chunks.push({
      index: chunks.length,
      rugs: rugs.slice(i, i + chunkSize),
      status: 'pending'
    });
  }
  
  logger.info('PIPELINE', `Created ${chunks.length} chunks from ${rugs.length} rugs`, {
    chunkSize,
    totalChunks: chunks.length
  });
  
  return chunks;
}

/**
 * Initialize pipeline state
 */
export function initializePipeline(
  rugs: ProcessedRug[], 
  chunkSize: number = 75,
  concurrentLimit: number = 5
): PipelineState {
  const chunks = createChunks(rugs, chunkSize);
  
  return {
    totalRugs: rugs.length,
    chunkSize,
    chunks,
    concurrentLimit,
    currentlyProcessing: [],
    completedCount: 0,
    failedCount: 0,
    status: 'idle'
  };
}

/**
 * Get next chunks to process
 */
export function getNextChunksToProcess(state: PipelineState): number[] {
  const available = state.concurrentLimit - state.currentlyProcessing.length;
  if (available <= 0) return [];
  
  const pendingChunks = state.chunks
    .filter(c => c.status === 'pending')
    .map(c => c.index)
    .slice(0, available);
  
  return pendingChunks;
}

/**
 * Calculate pipeline progress
 */
export function calculateProgress(state: PipelineState): PipelineProgress {
  const totalChunks = state.chunks.length;
  const completedChunks = state.chunks.filter(c => c.status === 'completed').length;
  const failedChunks = state.chunks.filter(c => c.status === 'failed').length;
  const processingChunks = state.currentlyProcessing;
  const pendingChunks = state.chunks.filter(c => c.status === 'pending').length;
  
  const overallProgress = totalChunks > 0 
    ? Math.round(((completedChunks + failedChunks) / totalChunks) * 100) 
    : 0;
  
  // Estimate time remaining based on completed chunks
  let estimatedTimeRemaining: number | undefined;
  if (state.startTime && completedChunks > 0) {
    const elapsed = Date.now() - state.startTime.getTime();
    const avgTimePerChunk = elapsed / completedChunks;
    const remainingChunks = pendingChunks + processingChunks.length;
    estimatedTimeRemaining = avgTimePerChunk * remainingChunks;
  }
  
  let currentStatus = 'Idle';
  if (state.status === 'running') {
    if (processingChunks.length > 0) {
      currentStatus = `Processing chunks: ${processingChunks.map(i => i + 1).join(', ')}`;
    } else {
      currentStatus = 'Waiting for next batch...';
    }
  } else if (state.status === 'completed') {
    currentStatus = `Completed! ${completedChunks}/${totalChunks} successful`;
  } else if (state.status === 'paused') {
    currentStatus = 'Paused';
  } else if (state.status === 'error') {
    currentStatus = 'Error occurred';
  }
  
  return {
    totalChunks,
    completedChunks,
    failedChunks,
    processingChunks,
    pendingChunks,
    overallProgress,
    estimatedTimeRemaining,
    currentStatus
  };
}

/**
 * Format time in human readable format
 */
export function formatTimeRemaining(ms: number): string {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  } else if (ms < 3600000) {
    return `${Math.round(ms / 60000)}m`;
  } else {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.round((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
}
