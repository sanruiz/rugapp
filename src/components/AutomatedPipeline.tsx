'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ProcessedRug } from '@/types/rug';
import { 
  PipelineState, 
  PipelineChunk,
  PipelineProgress,
  initializePipeline, 
  getNextChunksToProcess,
  calculateProgress,
  formatTimeRemaining
} from '@/lib/batch-pipeline';
import { logger } from '@/lib/logger';

interface AutomatedPipelineProps {
  rugs: ProcessedRug[];
  chunkSize?: number;
  concurrentLimit?: number;
  onComplete?: (results: PipelineState) => void;
}

export default function AutomatedPipeline({
  rugs,
  chunkSize = 75,
  concurrentLimit = 5,
  onComplete
}: AutomatedPipelineProps) {
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [downloadedResults, setDownloadedResults] = useState<
    Map<number, { content: string; images: unknown[] }>
  >(new Map());
  const pollingIntervalsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize pipeline when rugs change
  useEffect(() => {
    if (rugs.length > 0) {
      const newPipeline = initializePipeline(rugs, chunkSize, concurrentLimit);
      setPipeline(newPipeline);
      setProgress(calculateProgress(newPipeline));
    }
  }, [rugs, chunkSize, concurrentLimit]);

  // Update progress when pipeline changes
  useEffect(() => {
    if (pipeline) {
      setProgress(calculateProgress(pipeline));
    }
  }, [pipeline]);

  // Download results for a completed chunk
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const downloadChunkResults = useCallback(
    async (chunkIndex: number, outputFile: string, _batchId: string) => {
      try {
        logger.info(
          "PIPELINE",
          `Downloading results for chunk ${chunkIndex + 1}...`,
          { chunkIndex, outputFile }
        );

        // Download the batch results
        const downloadResponse = await fetch(
          `/api/download-results?fileName=${encodeURIComponent(outputFile)}`
        );
        const downloadResult = await downloadResponse.json();

        if (!downloadResult.success) {
          throw new Error(downloadResult.error || "Failed to download results");
        }

        // Extract images from results
        const extractResponse = await fetch("/api/extract-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchResults: downloadResult.data.content }),
        });

        const extractResult = await extractResponse.json();
        const images = extractResult.success ? extractResult.data : [];

        // Save to downloaded results
        setDownloadedResults((prev) => {
          const newMap = new Map(prev);
          newMap.set(chunkIndex, {
            content: downloadResult.data.content,
            images,
          });
          return newMap;
        });

        // Auto-save results file
        const blob = new Blob([downloadResult.data.content], {
          type: "application/jsonl",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `batch-results-chunk-${chunkIndex + 1}.jsonl`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        logger.info("PIPELINE", `Chunk ${chunkIndex + 1} results downloaded!`, {
          chunkIndex,
          resultCount: downloadResult.data.resultCount,
          imagesExtracted: images.length,
        });

        // Update chunk status to completed
        setPipeline((prev) => {
          if (!prev) return prev;
          const newChunks = [...prev.chunks];
          newChunks[chunkIndex] = {
            ...newChunks[chunkIndex],
            status: "completed",
            endTime: new Date(),
            resultsDownloaded: true,
            imagesExtracted: images.length,
          };
          return { ...prev, chunks: newChunks };
        });
      } catch (error) {
        logger.error(
          "PIPELINE",
          `Failed to download results for chunk ${chunkIndex + 1}`,
          error as Error,
          { chunkIndex }
        );

        // Mark as completed but with download error
        setPipeline((prev) => {
          if (!prev) return prev;
          const newChunks = [...prev.chunks];
          newChunks[chunkIndex] = {
            ...newChunks[chunkIndex],
            status: "completed",
            endTime: new Date(),
            resultsDownloaded: false,
            downloadError: (error as Error).message,
          };
          return { ...prev, chunks: newChunks };
        });
      }
    },
    []
  );

  // Poll for batch status
  const startPollingForChunk = useCallback(
    (chunkIndex: number, batchId: string) => {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/batch-status?batchId=${encodeURIComponent(batchId)}`
          );
          const result = await response.json();

          if (result.success && result.data) {
            const state = result.data.state;

            setPipeline((prev) => {
              if (!prev) return prev;
              const newChunks = [...prev.chunks];
              newChunks[chunkIndex] = {
                ...newChunks[chunkIndex],
                batchJob: result.data,
              };

              if (state === "JOB_STATE_SUCCEEDED") {
                clearInterval(pollInterval);
                pollingIntervalsRef.current.delete(chunkIndex);

                // Mark as downloading results
                newChunks[chunkIndex] = {
                  ...newChunks[chunkIndex],
                  status: "downloading_results" as PipelineChunk["status"],
                };

                logger.info(
                  "PIPELINE",
                  `Chunk ${
                    chunkIndex + 1
                  } batch completed, downloading results...`,
                  { chunkIndex, batchId }
                );

                // Download results in background
                const outputFile = result.data.outputFile;
                if (outputFile) {
                  downloadChunkResults(chunkIndex, outputFile, batchId);
                } else {
                  // No output file, mark as completed anyway
                  newChunks[chunkIndex] = {
                    ...newChunks[chunkIndex],
                    status: "completed",
                    endTime: new Date(),
                  };
                }

                return {
                  ...prev,
                  chunks: newChunks,
                  currentlyProcessing: prev.currentlyProcessing.filter(
                    (i) => i !== chunkIndex
                  ),
                  completedCount: prev.completedCount + 1,
                };
              } else if (
                state === "JOB_STATE_FAILED" ||
                state === "JOB_STATE_CANCELLED"
              ) {
                clearInterval(pollInterval);
                pollingIntervalsRef.current.delete(chunkIndex);

                newChunks[chunkIndex] = {
                  ...newChunks[chunkIndex],
                  status: "failed",
                  error: `Batch ${state
                    .replace("JOB_STATE_", "")
                    .toLowerCase()}`,
                  endTime: new Date(),
                };

                logger.error(
                  "PIPELINE",
                  `Chunk ${chunkIndex + 1} batch failed`,
                  undefined,
                  { chunkIndex, batchId, state }
                );

                return {
                  ...prev,
                  chunks: newChunks,
                  currentlyProcessing: prev.currentlyProcessing.filter(
                    (i) => i !== chunkIndex
                  ),
                  failedCount: prev.failedCount + 1,
                };
              }

              return { ...prev, chunks: newChunks };
            });
          }
        } catch (error) {
          console.error(`Error polling batch ${batchId}:`, error);
        }
      }, 15000);

      pollingIntervalsRef.current.set(chunkIndex, pollInterval);
    },
    [downloadChunkResults]
  );

  // Process a single chunk
  const processChunk = useCallback(async (chunkIndex: number, chunkRugs: ProcessedRug[]) => {
    setPipeline(prev => {
      if (!prev) return prev;
      const newChunks = [...prev.chunks];
      newChunks[chunkIndex] = {
        ...newChunks[chunkIndex],
        status: 'downloading_images',
        startTime: new Date()
      };
      return {
        ...prev,
        chunks: newChunks,
        currentlyProcessing: [...prev.currentlyProcessing, chunkIndex]
      };
    });

    try {
      logger.info('PIPELINE', `Starting chunk ${chunkIndex + 1}`, { chunkIndex });

      const response = await fetch('/api/process-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rugs: chunkRugs,
          chunkIndex,
          includeImages: true
        }),
        signal: abortControllerRef.current?.signal
      });

      const result = await response.json();

      if (result.success) {
        setPipeline(prev => {
          if (!prev) return prev;
          const newChunks = [...prev.chunks];
          newChunks[chunkIndex] = {
            ...newChunks[chunkIndex],
            status: 'processing',
            batchId: result.data.batchId,
            batchJob: result.data.batchJob
          };
          return { ...prev, chunks: newChunks };
        });

        startPollingForChunk(chunkIndex, result.data.batchId);
      } else {
        throw new Error(result.error || 'Failed to process chunk');
      }

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        logger.info('PIPELINE', `Chunk ${chunkIndex + 1} aborted`, { chunkIndex });
        return;
      }

      logger.error('PIPELINE', `Chunk ${chunkIndex + 1} failed`, error as Error, { chunkIndex });
      
      setPipeline(prev => {
        if (!prev) return prev;
        const newChunks = [...prev.chunks];
        newChunks[chunkIndex] = {
          ...newChunks[chunkIndex],
          status: 'failed',
          error: (error as Error).message,
          endTime: new Date()
        };
        return {
          ...prev,
          chunks: newChunks,
          currentlyProcessing: prev.currentlyProcessing.filter(i => i !== chunkIndex),
          failedCount: prev.failedCount + 1
        };
      });
    }
  }, [startPollingForChunk]);

  // Main pipeline loop
  useEffect(() => {
    if (!pipeline || !isRunning || isPaused) return;

    const runNextBatch = async () => {
      const nextChunks = getNextChunksToProcess(pipeline);
      
      if (nextChunks.length === 0) {
        const allDone = pipeline.chunks.every(c => 
          c.status === 'completed' || c.status === 'failed'
        );
        
        if (allDone) {
          setIsRunning(false);
          setPipeline(prev => prev ? { ...prev, status: 'completed', endTime: new Date() } : prev);
          logger.info('PIPELINE', 'Pipeline completed!', {
            completed: pipeline.completedCount,
            failed: pipeline.failedCount
          });
          onComplete?.(pipeline);
        }
        return;
      }

      await Promise.all(
        nextChunks.map(idx => {
          const chunk = pipeline.chunks[idx];
          return processChunk(idx, chunk.rugs);
        })
      );
    };

    runNextBatch();
  }, [pipeline, isRunning, isPaused, processChunk, onComplete]);

  const startPipeline = () => {
    if (!pipeline) return;
    
    abortControllerRef.current = new AbortController();
    setIsRunning(true);
    setIsPaused(false);
    
    setPipeline(prev => prev ? { 
      ...prev, 
      status: 'running', 
      startTime: new Date() 
    } : prev);
    
    logger.info('PIPELINE', 'Pipeline started', {
      totalChunks: pipeline.chunks.length,
      concurrentLimit
    });
  };

  const pausePipeline = () => {
    setIsPaused(true);
    setPipeline(prev => prev ? { ...prev, status: 'paused' } : prev);
    logger.info('PIPELINE', 'Pipeline paused');
  };

  const resumePipeline = () => {
    setIsPaused(false);
    setPipeline(prev => prev ? { ...prev, status: 'running' } : prev);
    logger.info('PIPELINE', 'Pipeline resumed');
  };

  const stopPipeline = () => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
    setIsPaused(false);
    
    pollingIntervalsRef.current.forEach(interval => clearInterval(interval));
    pollingIntervalsRef.current.clear();
    
    setPipeline(prev => prev ? { ...prev, status: 'idle' } : prev);
    logger.info('PIPELINE', 'Pipeline stopped');
  };

  useEffect(() => {
    const intervals = pollingIntervalsRef.current;
    return () => {
      intervals.forEach(interval => clearInterval(interval));
      abortControllerRef.current?.abort();
    };
  }, []);

  if (!pipeline || !progress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <p className="text-gray-500">No rugs loaded for pipeline processing.</p>
      </div>
    );
  }

  const getStatusColor = (status: PipelineChunk["status"]) => {
    switch (status) {
      case "pending":
        return "bg-gray-200 dark:bg-gray-700";
      case "downloading_images":
        return "bg-yellow-200 dark:bg-yellow-800 animate-pulse";
      case "generating_jsonl":
        return "bg-blue-200 dark:bg-blue-800 animate-pulse";
      case "submitted":
        return "bg-indigo-200 dark:bg-indigo-800";
      case "processing":
        return "bg-purple-200 dark:bg-purple-800 animate-pulse";
      case "downloading_results":
        return "bg-cyan-200 dark:bg-cyan-800 animate-pulse";
      case "completed":
        return "bg-green-200 dark:bg-green-800";
      case "failed":
        return "bg-red-200 dark:bg-red-800";
      default:
        return "bg-gray-200";
    }
  };

  const getStatusIcon = (status: PipelineChunk["status"]) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "downloading_images":
        return "📥";
      case "generating_jsonl":
        return "📝";
      case "submitted":
        return "📤";
      case "processing":
        return "⚙️";
      case "downloading_results":
        return "💾";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "❓";
    }
  };

  // Calculate totals for downloaded results
  const totalImagesExtracted =
    pipeline?.chunks.reduce(
      (sum, chunk) => sum + (chunk.imagesExtracted || 0),
      0
    ) || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">🚀 Automated Pipeline</h2>
        <div className="flex gap-2">
          {!isRunning && (
            <button
              onClick={startPipeline}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              ▶️ Start Pipeline
            </button>
          )}
          {isRunning && !isPaused && (
            <button
              onClick={pausePipeline}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              ⏸️ Pause
            </button>
          )}
          {isRunning && isPaused && (
            <button
              onClick={resumePipeline}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ▶️ Resume
            </button>
          )}
          {isRunning && (
            <button
              onClick={stopPipeline}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              ⏹️ Stop
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{progress.currentStatus}</span>
          <span>
            {progress.completedChunks}/{progress.totalChunks} chunks (
            {progress.overallProgress}%)
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progress.overallProgress}%` }}
          />
        </div>

        <div className="grid grid-cols-5 gap-4 text-center">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-800 dark:text-white">
              {progress.pendingChunks}
            </div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {progress.processingChunks.length}
            </div>
            <div className="text-xs text-gray-500">Processing</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {progress.completedChunks}
            </div>
            <div className="text-xs text-gray-500">Completed</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {progress.failedChunks}
            </div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalImagesExtracted}
            </div>
            <div className="text-xs text-gray-500">🖼️ Images</div>
          </div>
        </div>

        {progress.estimatedTimeRemaining && isRunning && (
          <div className="text-center text-sm text-gray-500">
            Estimated time remaining:{" "}
            {formatTimeRemaining(progress.estimatedTimeRemaining)}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Chunks Status</h3>
        <div className="grid grid-cols-10 gap-1">
          {pipeline.chunks.map((chunk, index) => (
            <div
              key={index}
              className={`w-6 h-6 rounded flex items-center justify-center text-xs cursor-default ${getStatusColor(
                chunk.status
              )}`}
              title={`Chunk ${index + 1}: ${chunk.status}${
                chunk.batchId ? ` (${chunk.batchId.slice(-8)})` : ""
              }${
                chunk.imagesExtracted
                  ? ` - ${chunk.imagesExtracted} images`
                  : ""
              }${chunk.error ? ` - ${chunk.error}` : ""}${
                chunk.downloadError
                  ? ` (download failed: ${chunk.downloadError})`
                  : ""
              }`}
            >
              {getStatusIcon(chunk.status)}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span>⏳ Pending</span>
          <span>📥 Downloading Images</span>
          <span>⚙️ Processing</span>
          <span>💾 Downloading Results</span>
          <span>✅ Completed</span>
          <span>❌ Failed</span>
        </div>
      </div>

      <div className="text-sm text-gray-500 border-t pt-4">
        <p>
          📊 Total: {pipeline.totalRugs} rugs | 📦 Chunk size:{" "}
          {pipeline.chunkSize} | 🔄 Concurrent: {pipeline.concurrentLimit}
        </p>
      </div>
    </div>
  );
}
