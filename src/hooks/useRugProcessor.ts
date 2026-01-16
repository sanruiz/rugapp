'use client';

import { useState, useCallback, useRef } from 'react';
import { ProcessedRug, ProcessingStatus, BatchJob } from '@/types/rug';
import { logger } from '@/lib/logger';

export interface UseRugProcessorReturn {
  // State
  processedRugs: ProcessedRug[];
  processing: boolean;
  status: ProcessingStatus;
  error: string;
  batchRequests: string;
  batchJob: BatchJob | null;
  polling: boolean;
  batchResults: string;
  generatedImages: Array<{ key: string; imageUrl: string }>;
  currentSessionId: string | null;

  // Actions
  uploadFile: (file: File) => Promise<void>;
  generateBatchRequests: (includeImages: boolean) => Promise<void>;
  downloadBatchFile: () => void;
  submitBatchToGemini: () => Promise<void>;
  downloadResults: () => Promise<void>;
  downloadAllImages: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const initialStatus: ProcessingStatus = {
  total: 0,
  processed: 0,
  errors: 0,
  status: 'idle',
  currentStep: 'Ready to upload CSV file',
};

export function useRugProcessor(): UseRugProcessorReturn {
  const [processedRugs, setProcessedRugs] = useState<ProcessedRug[]>([]);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>(initialStatus);
  const [error, setError] = useState('');
  const [batchRequests, setBatchRequests] = useState('');
  const [batchJob, setBatchJob] = useState<BatchJob | null>(null);
  const [polling, setPolling] = useState(false);
  const [batchResults, setBatchResults] = useState('');
  const [generatedImages, setGeneratedImages] = useState<Array<{ key: string; imageUrl: string }>>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear polling on cleanup
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPolling(false);
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    const sessionId = logger.startSession('processing', 0);
    setCurrentSessionId(sessionId);
    setProcessing(true);
    setError('');
    setStatus(prev => ({
      ...prev,
      status: 'processing',
      currentStep: 'Uploading and parsing CSV file...',
    }));

    logger.info('FILE_UPLOAD', 'Starting file upload', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const startTime = Date.now();
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const responseTime = Date.now() - startTime;
      logger.logAPICall('/api/upload', 'POST', response.ok, responseTime);

      const result = await response.json();

      if (result.success) {
        setProcessedRugs(result.data.rugs);
        logger.updateSessionProgress(result.data.totalRugs, 0, sessionId);

        setStatus({
          total: result.data.totalRugs,
          processed: result.data.totalRugs,
          errors: 0,
          status: 'complete',
          currentStep: `Successfully processed ${result.data.totalRugs} rugs`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      setStatus(prev => ({
        ...prev,
        status: 'error',
        currentStep: 'Error processing file',
      }));
      logger.error('FILE_UPLOAD', 'File upload failed', err instanceof Error ? err : new Error(errorMsg));
    } finally {
      setProcessing(false);
    }
  }, []);

  const generateBatchRequests = useCallback(async (includeImages: boolean = false) => {
    if (processedRugs.length === 0) return;

    setProcessing(true);
    setError('');
    setStatus(prev => ({
      ...prev,
      status: 'processing',
      currentStep: 'Generating batch requests...',
    }));

    try {
      const response = await fetch('/api/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rugs: processedRugs, includeImages }),
      });

      const result = await response.json();

      if (result.success) {
        setBatchRequests(result.data.jsonlContent);
        setStatus(prev => ({
          ...prev,
          status: 'complete',
          currentStep: `Generated ${result.data.totalRequests} batch requests`,
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus(prev => ({
        ...prev,
        status: 'error',
        currentStep: 'Error generating batch requests',
      }));
    } finally {
      setProcessing(false);
    }
  }, [processedRugs]);

  const downloadBatchFile = useCallback(() => {
    if (!batchRequests) return;

    const blob = new Blob([batchRequests], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch-requests.jsonl';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [batchRequests]);

  const startPolling = useCallback((batchId: string) => {
    setPolling(true);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/batch-status?batchId=${encodeURIComponent(batchId)}`);
        const result = await response.json();

        if (!response.ok) {
          console.error('Batch status API error:', response.status, response.statusText);
          setStatus(prev => ({
            ...prev,
            status: 'error',
            currentStep: `API error: ${response.status} ${response.statusText}`,
          }));
          return;
        }

        if (result.success && result.data) {
          setBatchJob(result.data);
          const state = result.data.state;

          if (!state || typeof state !== 'string') {
            console.warn('Batch state is undefined or invalid:', state);
            return;
          }

          if (state === 'JOB_STATE_SUCCEEDED') {
            setStatus(prev => ({
              ...prev,
              status: 'complete',
              currentStep: 'Batch completed successfully! Ready to download results.',
            }));
            stopPolling();
          } else if (['JOB_STATE_FAILED', 'JOB_STATE_CANCELLED', 'JOB_STATE_EXPIRED'].includes(state)) {
            const stateText = state.toLowerCase().replace('job_state_', '');
            setStatus(prev => ({
              ...prev,
              status: 'error',
              currentStep: `Batch ${stateText}`,
            }));
            stopPolling();
          } else {
            const stateText = state.toLowerCase().replace('job_state_', '');
            const completedCount = result.data.completedCount || 0;
            const requestCount = result.data.requestCount || 0;
            const progressText = requestCount > 0
              ? `${completedCount}/${requestCount} requests completed`
              : 'in progress';

            setStatus(prev => ({
              ...prev,
              status: 'processing',
              currentStep: `Batch ${stateText}: ${progressText}`,
            }));
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 10000);

    // Clean up after 1 hour
    setTimeout(() => stopPolling(), 3600000);
  }, [stopPolling]);

  const submitBatchToGemini = useCallback(async () => {
    if (!batchRequests) return;

    setProcessing(true);
    setError('');
    setStatus(prev => ({
      ...prev,
      status: 'processing',
      currentStep: 'Submitting batch to Gemini API...',
    }));

    try {
      const response = await fetch('/api/submit-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonlContent: batchRequests,
          displayName: `Rug Batch ${new Date().toISOString().split('T')[0]}`,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBatchJob(result.data);
        setStatus(prev => ({
          ...prev,
          status: 'complete',
          currentStep: `Batch job created: ${result.data.batchId}`,
        }));
        startPolling(result.data.batchId);
      } else {
        throw new Error(result.error || 'Failed to submit batch');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus(prev => ({
        ...prev,
        status: 'error',
        currentStep: 'Error submitting batch',
      }));
    } finally {
      setProcessing(false);
    }
  }, [batchRequests, startPolling]);

  const downloadResults = useCallback(async () => {
    if (!batchJob?.outputFile) return;

    setProcessing(true);
    try {
      const response = await fetch(
        `/api/download-results?fileName=${encodeURIComponent(batchJob.outputFile)}`
      );
      const result = await response.json();

      if (result.success) {
        setBatchResults(result.data.content);

        // Download the results file
        const blob = new Blob([result.data.content], { type: 'application/jsonl' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'batch-results.jsonl';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Extract images
        const extractResponse = await fetch('/api/extract-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchResults: result.data.content }),
        });

        const extractResult = await extractResponse.json();
        if (extractResult.success && extractResult.data.length > 0) {
          setGeneratedImages(extractResult.data);
          setStatus(prev => ({
            ...prev,
            currentStep: `Downloaded ${result.data.resultCount} responses with ${extractResult.data.length} generated images! 🎨`,
          }));
        } else {
          setStatus(prev => ({
            ...prev,
            currentStep: `Results downloaded (${result.data.resultCount} responses)`,
          }));
        }
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download results');
    } finally {
      setProcessing(false);
    }
  }, [batchJob]);

  const downloadAllImages = useCallback(async () => {
    if (generatedImages.length === 0) return;

    try {
      setProcessing(true);
      const response = await fetch('/api/zip-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: generatedImages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ZIP');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rug-images-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download');
    } finally {
      setProcessing(false);
    }
  }, [generatedImages]);

  const clearError = useCallback(() => setError(''), []);

  const reset = useCallback(() => {
    stopPolling();
    setProcessedRugs([]);
    setProcessing(false);
    setStatus(initialStatus);
    setError('');
    setBatchRequests('');
    setBatchJob(null);
    setBatchResults('');
    setGeneratedImages([]);
    setCurrentSessionId(null);
  }, [stopPolling]);

  return {
    // State
    processedRugs,
    processing,
    status,
    error,
    batchRequests,
    batchJob,
    polling,
    batchResults,
    generatedImages,
    currentSessionId,

    // Actions
    uploadFile,
    generateBatchRequests,
    downloadBatchFile,
    submitBatchToGemini,
    downloadResults,
    downloadAllImages,
    clearError,
    reset,
  };
}
