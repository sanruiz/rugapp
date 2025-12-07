'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ProcessedRug, ProcessingStatus, BatchJob } from '@/types/rug';
import { logger } from "@/lib/logger";
import LogViewer from "./LogViewer";
import AutomatedPipeline from "./AutomatedPipeline";

import { PipelineState } from '@/lib/batch-pipeline';

export default function RugProcessorApp() {
  const [processedRugs, setProcessedRugs] = useState<ProcessedRug[]>([]);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>({
    total: 0,
    processed: 0,
    errors: 0,
    status: "idle",
    currentStep: "Ready to upload CSV file",
  });
  const [batchRequests, setBatchRequests] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [batchJob, setBatchJob] = useState<BatchJob | null>(null);
  const [polling, setPolling] = useState(false);
  const [batchResults, setBatchResults] = useState<string>("");
  const [generatedImages, setGeneratedImages] = useState<
    Array<{ key: string; imageUrl: string }>
  >([]);

  // Chunking state
  const [chunkingMode, setChunkingMode] = useState(false);
  const [automatedMode, setAutomatedMode] = useState(false); // NEW: Automated pipeline mode
  const [chunks, setChunks] = useState<{ filename: string; size: number }[]>(
    []
  );
  const [chunkSize, setChunkSize] = useState(75); // Optimized for batches WITH images
  const [chunkedFile, setChunkedFile] = useState<File | null>(null);

  // Session management
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Start logging session
    const sessionId = logger.startSession("processing", 0); // We'll update count later
    setCurrentSessionId(sessionId);

    setProcessing(true);
    setError("");
    setStatus((prev) => ({
      ...prev,
      status: "processing",
      currentStep: "Uploading and parsing CSV file...",
    }));

    logger.info("FILE_UPLOAD", "Starting file upload", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const startTime = Date.now();
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const responseTime = Date.now() - startTime;
      logger.logAPICall("/api/upload", "POST", response.ok, responseTime);

      const result = await response.json();

      if (result.success) {
        setProcessedRugs(result.data.rugs);
        logger.updateSessionProgress(result.data.totalRugs, 0, sessionId);

        setStatus({
          total: result.data.totalRugs,
          processed: result.data.totalRugs,
          errors: 0,
          status: "complete",
          currentStep: `Successfully processed ${result.data.totalRugs} rugs`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStatus((prev) => ({
        ...prev,
        status: "error",
        currentStep: "Error processing file",
      }));
    } finally {
      setProcessing(false);
    }
  }, []);

  const generateBatchRequests = async (includeImages: boolean = false) => {
    if (processedRugs.length === 0) return;

    setProcessing(true);
    setError("");
    setStatus((prev) => ({
      ...prev,
      status: "processing",
      currentStep: "Generating batch requests...",
    }));

    try {
      const response = await fetch("/api/generate-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rugs: processedRugs,
          includeImages,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBatchRequests(result.data.jsonlContent);
        setStatus((prev) => ({
          ...prev,
          status: "complete",
          currentStep: `Generated ${result.data.totalRequests} batch requests`,
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStatus((prev) => ({
        ...prev,
        status: "error",
        currentStep: "Error generating batch requests",
      }));
    } finally {
      setProcessing(false);
    }
  };

  const downloadBatchFile = () => {
    if (!batchRequests) return;

    const blob = new Blob([batchRequests], { type: "application/jsonl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batch-requests.jsonl";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const submitBatchToGemini = async () => {
    if (!batchRequests) return;

    setProcessing(true);
    setError("");
    setStatus((prev) => ({
      ...prev,
      status: "processing",
      currentStep: "Submitting batch to Gemini API...",
    }));

    try {
      const response = await fetch("/api/submit-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonlContent: batchRequests,
          displayName: `Rug Batch ${new Date().toISOString().split("T")[0]}`,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBatchJob(result.data);
        setStatus((prev) => ({
          ...prev,
          status: "complete",
          currentStep: `Batch job created: ${result.data.batchId}`,
        }));

        // Start polling for status
        startPolling(result.data.batchId);
      } else {
        throw new Error(result.error || "Failed to submit batch");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStatus((prev) => ({
        ...prev,
        status: "error",
        currentStep: "Error submitting batch",
      }));
    } finally {
      setProcessing(false);
    }
  };

  const startPolling = (batchId: string) => {
    setPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/batch-status?batchId=${encodeURIComponent(batchId)}`
        );
        const result = await response.json();

        if (!response.ok) {
          console.error(
            "Batch status API error:",
            response.status,
            response.statusText
          );
          setStatus((prev) => ({
            ...prev,
            status: "error",
            currentStep: `API error: ${response.status} ${response.statusText}`,
            error: `Failed to check batch status`,
          }));
          return;
        }

        if (result.success && result.data) {
          setBatchJob(result.data);

          const state = result.data.state;

          // Ensure state is defined before processing
          if (!state || typeof state !== "string") {
            console.warn(
              "Batch state is undefined or invalid:",
              state,
              "Full result:",
              result
            );
            setStatus((prev) => ({
              ...prev,
              status: "error",
              currentStep: "Unable to check batch status. Please try again.",
              error: "Invalid batch response",
            }));
            return;
          }

          if (state === "JOB_STATE_SUCCEEDED") {
            setStatus((prev) => ({
              ...prev,
              status: "complete",
              currentStep:
                "Batch completed successfully! Ready to download results.",
            }));
            clearInterval(pollInterval);
            setPolling(false);
          } else if (
            state === "JOB_STATE_FAILED" ||
            state === "JOB_STATE_CANCELLED" ||
            state === "JOB_STATE_EXPIRED"
          ) {
            const stateText = state.toLowerCase().replace("job_state_", "");
            setStatus((prev) => ({
              ...prev,
              status: "error",
              currentStep: `Batch ${stateText}`,
            }));
            clearInterval(pollInterval);
            setPolling(false);
          } else {
            const stateText = state.toLowerCase().replace("job_state_", "");
            const completedCount = result.data.completedCount || 0;
            const requestCount = result.data.requestCount || 0;
            const progressText =
              requestCount > 0
                ? `${completedCount}/${requestCount} requests completed`
                : "in progress";

            setStatus((prev) => ({
              ...prev,
              status: "processing",
              currentStep: `Batch ${stateText}: ${progressText}`,
            }));
          }
        } else {
          console.error("Batch status check failed:", result);
          setStatus((prev) => ({
            ...prev,
            status: "error",
            currentStep: "Failed to check batch status",
            error: result.error || "Unknown error",
          }));
        }
      } catch (error) {
        console.error("Polling error:", error);
        setStatus((prev) => ({
          ...prev,
          status: "error",
          currentStep: "Connection error while checking batch status",
          error: error instanceof Error ? error.message : "Network error",
        }));
      }
    }, 10000); // Poll every 10 seconds

    // Clean up after 1 hour
    setTimeout(() => {
      clearInterval(pollInterval);
      setPolling(false);
    }, 3600000);
  };

  const downloadResults = async () => {
    if (!batchJob?.outputFile) return;

    setProcessing(true);
    try {
      const response = await fetch(
        `/api/download-results?fileName=${encodeURIComponent(
          batchJob.outputFile
        )}`
      );
      const result = await response.json();

      if (result.success) {
        setBatchResults(result.data.content);

        // Download the results file
        const blob = new Blob([result.data.content], {
          type: "application/jsonl",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "batch-results.jsonl";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Automatically extract images from the batch results
        const extractResponse = await fetch("/api/extract-images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ batchResults: result.data.content }),
        });

        const extractResult = await extractResponse.json();
        if (extractResult.success && extractResult.data.length > 0) {
          setGeneratedImages(extractResult.data);
          setStatus((prev) => ({
            ...prev,
            currentStep: `Downloaded ${result.data.resultCount} responses with ${extractResult.data.length} generated images! 🎨`,
          }));
        } else {
          setStatus((prev) => ({
            ...prev,
            currentStep: `Results downloaded (${result.data.resultCount} responses)`,
          }));
        }
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to download results"
      );
    } finally {
      setProcessing(false);
    }
  };

  // Chunking functions
  const chunkCSV = useCallback(
    async (file: File) => {
      setProcessing(true);
      setError("");

      // Start chunking session
      const sessionId = logger.startSession("chunking", 0, chunkSize);
      setCurrentSessionId(sessionId);

      logger.info("CHUNKING", "Starting CSV chunking", {
        fileName: file.name,
        fileSize: file.size,
        chunkSize,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("chunkSize", chunkSize.toString());

        const startTime = Date.now();
        const response = await fetch("/api/chunk-csv", {
          method: "POST",
          body: formData,
        });

        const responseTime = Date.now() - startTime;
        logger.logAPICall("/api/chunk-csv", "POST", response.ok, responseTime);

        const result = await response.json();

        if (result.success) {
          setChunks(result.files);
          setChunkedFile(file);
          logger.updateSessionProgress(result.totalRows, 0, sessionId);

          setStatus({
            total: result.totalRows,
            processed: result.totalRows,
            errors: 0,
            status: "complete",
            currentStep: `Split ${result.totalRows} rows into ${result.totalChunks} chunks of ${result.chunkSize} rows each`,
          });

          logger.info("CHUNKING", "CSV chunking completed successfully", {
            totalRows: result.totalRows,
            totalChunks: result.totalChunks,
            chunkSize: result.chunkSize,
            files: result.files.length,
          });

          logger.endSession(sessionId);
        } else {
          throw new Error(result.error || "Failed to chunk CSV");
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to process CSV file");
        logger.error("CHUNKING", "CSV chunking failed", error);
        logger.endSession(sessionId);
        setError(error.message);
        setStatus((prev) => ({ ...prev, status: "error" }));
      } finally {
        setProcessing(false);
      }
    },
    [chunkSize]
  );

  const downloadChunk = async (chunkIndex: number) => {
    if (!chunkedFile) return;

    try {
      const formData = new FormData();
      formData.append("file", chunkedFile);
      formData.append("chunkIndex", chunkIndex.toString());
      formData.append("chunkSize", chunkSize.toString());

      const response = await fetch("/api/download-chunk", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download =
          chunks[chunkIndex]?.filename || `chunk-${chunkIndex + 1}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error("Failed to download chunk");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download chunk");
    }
  };

  const onChunkDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      await chunkCSV(file);
    },
    [chunkCSV]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    disabled: processing,
  });

  const {
    getRootProps: getChunkRootProps,
    getInputProps: getChunkInputProps,
    isDragActive: isChunkDragActive,
  } = useDropzone({
    onDrop: onChunkDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
    disabled: processing,
  });

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">1. Upload CSV File</h2>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          } ${processing ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <input {...getInputProps()} />
          {processing ? (
            <p className="text-gray-600 dark:text-gray-400">Processing...</p>
          ) : isDragActive ? (
            <p className="text-blue-600 dark:text-blue-400">
              Drop the CSV file here...
            </p>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Drag and drop a CSV file here, or click to select
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Supports rug inventory CSV files with product details
              </p>
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            onClick={() => { setChunkingMode(false); setAutomatedMode(false); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              !chunkingMode && !automatedMode
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            disabled={processing}
          >
            Manual Processing
          </button>
          <button
            onClick={() => { setChunkingMode(true); setAutomatedMode(false); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              chunkingMode && !automatedMode
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            disabled={processing}
          >
            Split CSV Only
          </button>
          <button
            onClick={() => { setChunkingMode(false); setAutomatedMode(true); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              automatedMode
                ? "bg-green-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
            disabled={processing}
          >
            🚀 Automated Pipeline (5500+ rugs)
          </button>
        </div>
      </div>

      {/* Automated Pipeline Section */}
      {automatedMode && processedRugs.length > 0 && (
        <AutomatedPipeline
          rugs={processedRugs}
          chunkSize={chunkSize}
          concurrentLimit={5}
          onComplete={(result: PipelineState) => {
            logger.info('PIPELINE', 'Automated pipeline completed', {
              completed: result.completedCount,
              failed: result.failedCount
            });
            setStatus({
              total: result.totalRugs,
              processed: result.completedCount * chunkSize,
              errors: result.failedCount * chunkSize,
              status: 'complete',
              currentStep: `Pipeline completed: ${result.completedCount} chunks successful, ${result.failedCount} failed`
            });
          }}
        />
      )}

      {/* Automated Mode Upload Prompt */}
      {automatedMode && processedRugs.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-md p-6 border-2 border-green-300 dark:border-green-700">
          <h2 className="text-2xl font-semibold mb-4 text-green-800 dark:text-green-300">
            🚀 Automated Pipeline Ready
          </h2>
          <p className="text-green-700 dark:text-green-400 mb-4">
            Upload your CSV file above to start the automated pipeline. The system will:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-green-700 dark:text-green-400">
            <li>Split your {">"}5000 rugs into chunks of {chunkSize} each</li>
            <li>Process 5 chunks in parallel</li>
            <li>Download images and generate JSONL for each chunk</li>
            <li>Submit to Gemini Batch API</li>
            <li>Wait for results, then continue with next chunks</li>
            <li>Repeat until all chunks are processed</li>
          </ol>
          <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              ⚠️ <strong>Note:</strong> This process may take several hours for large datasets. 
              You can pause/resume at any time.
            </p>
          </div>
        </div>
      )}

      {/* CSV Chunking Section */}
      {chunkingMode && !automatedMode && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">
            📂 Split Large CSV File
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Split your large CSV file into smaller chunks of {chunkSize} rugs
            each. Optimized for batch processing with images (~75 recommended).
          </p>

          {/* Chunk Size Input */}
          <div className="mb-4">
            <label
              htmlFor="chunkSize"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Lines per chunk:
            </label>
            <input
              id="chunkSize"
              type="number"
              min="10"
              max="1000"
              value={chunkSize}
              onChange={(e) => setChunkSize(parseInt(e.target.value) || 150)}
              className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={processing}
            />
          </div>

          {/* Chunk Upload Area */}
          <div
            {...getChunkRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isChunkDragActive
                ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            } ${processing ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <input {...getChunkInputProps()} />
            {processing ? (
              <p className="text-gray-600 dark:text-gray-400">Processing...</p>
            ) : isChunkDragActive ? (
              <p className="text-blue-600 dark:text-blue-400">
                Drop the CSV file here to split...
              </p>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Drag and drop your large CSV file here, or click to select
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Will be split into chunks of {chunkSize} lines each
                </p>
              </div>
            )}
          </div>

          {/* Chunks List */}
          {chunks.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">
                📋 Generated Chunks ({chunks.length} files)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {chunks.map((chunk, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {chunk.filename}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        {(chunk.size / 1024).toFixed(1)}KB
                      </span>
                    </div>
                    <button
                      onClick={() => downloadChunk(index)}
                      className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      disabled={processing}
                    >
                      Download Chunk
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400">
                  ✅ CSV successfully split into {chunks.length} chunks!
                  Download each chunk individually to process them in smaller
                  batches.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Processing Sections - Only show when not in chunking mode and not in automated mode */}
      {!chunkingMode && !automatedMode && (
        <>
          {/* Status Section */}
          {status.status !== "idle" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Processing Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Status:</span>
                  <span
                    className={`font-medium ${
                      status.status === "complete"
                        ? "text-green-600"
                        : status.status === "error"
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  >
                    {status.currentStep}
                  </span>
                </div>
                {status.total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span>
                      {status.processed} / {status.total} rugs
                    </span>
                  </div>
                )}
                {status.status === "processing" && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width:
                          status.total > 0
                            ? `${(status.processed / status.total) * 100}%`
                            : "50%",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="text-red-800 dark:text-red-200 font-semibold">
                Error
              </h3>
              <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                {error}
              </p>
            </div>
          )}

          {/* Results Section */}
          {processedRugs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                2. Processed Rugs ({processedRugs.length})
              </h2>
              <div className="space-y-4">
                <div className="grid gap-4">
                  {processedRugs.slice(0, 3).map((rug) => (
                    <div
                      key={rug.sku}
                      className="border dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-lg">{rug.title}</h4>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          SKU: {rug.sku}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {rug.size} • {rug.material} • {rug.style}
                      </p>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                        <p className="text-sm font-medium mb-1">
                          Generated Prompt:
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                          {rug.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {processedRugs.length > 3 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    ... and {processedRugs.length - 3} more rugs
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Batch Generation Section */}
          {processedRugs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                3. Generate Batch Requests
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => generateBatchRequests(false)}
                    disabled={processing}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Generate Text-Only Batch
                  </button>
                  <button
                    onClick={() => generateBatchRequests(true)}
                    disabled={processing}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Generate with Images
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Text-only batches are faster to generate. Including images
                  will download and encode each rug image.
                </p>
              </div>
            </div>
          )}

          {/* Download Section */}
          {batchRequests && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                4. Batch Processing Options
              </h2>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                  <h4 className="text-blue-800 dark:text-blue-200 font-semibold mb-2">
                    🚀 Batch Processing Ready!
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Your rug data has been converted to JSONL format for batch
                    processing. You can either download the file or try
                    submitting to Gemini Batch API.
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={downloadBatchFile}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    📥 Download JSONL File
                  </button>
                  <button
                    onClick={submitBatchToGemini}
                    disabled={processing || polling}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {polling ? "⏳ Processing..." : "🤖 Try Gemini Batch API"}
                  </button>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>
                    <strong>💡 Recommended:</strong> Download the JSONL file for
                    guaranteed batch processing.
                  </p>
                  <p>
                    <strong>⚡ Alternative:</strong> Submit to Gemini API (may
                    not be available for all accounts).
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">File Preview:</p>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                    {batchRequests.split("\n").slice(0, 3).join("\n")}
                    {batchRequests.split("\n").length > 3 && "\n..."}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Batch Job Status */}
          {batchJob && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                5. Batch Job Status
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Batch ID:
                    </p>
                    <p className="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      {batchJob.batchId || "Not available"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status:
                    </p>
                    <p
                      className={`text-sm font-medium ${
                        batchJob.state === "JOB_STATE_SUCCEEDED"
                          ? "text-green-600"
                          : batchJob.state === "JOB_STATE_FAILED"
                          ? "text-red-600"
                          : batchJob.state === "JOB_STATE_RUNNING"
                          ? "text-blue-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {batchJob.state
                        ? batchJob.state.replace("JOB_STATE_", "").toLowerCase()
                        : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progress:
                    </p>
                    <p className="text-sm">
                      {batchJob.completedCount} / {batchJob.requestCount}{" "}
                      completed
                      {batchJob.failedCount > 0 &&
                        ` (${batchJob.failedCount} failed)`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Created:
                    </p>
                    <p className="text-sm">
                      {new Date(batchJob.createTime).toLocaleString()}
                    </p>
                  </div>
                </div>

                {batchJob.state === "JOB_STATE_RUNNING" && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width:
                          batchJob.requestCount && batchJob.requestCount > 0
                            ? `${
                                ((batchJob.completedCount || 0) /
                                  batchJob.requestCount) *
                                100
                              }%`
                            : "0%",
                      }}
                    />
                  </div>
                )}

                {batchJob.state === "JOB_STATE_SUCCEEDED" &&
                  batchJob.outputFile && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h4 className="text-green-800 dark:text-green-200 font-semibold mb-2">
                        Batch Completed Successfully! 🎉
                      </h4>
                      <p className="text-green-700 dark:text-green-300 text-sm mb-3">
                        Your rug descriptions have been generated and are ready
                        for download.
                      </p>
                      <button
                        onClick={downloadResults}
                        disabled={processing}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {processing
                          ? "⏳ Extracting Images..."
                          : "📥 Download & Extract Images"}
                      </button>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                        Download the batch results and extract the generated
                        room scene images
                      </p>
                    </div>
                  )}

                {batchJob.error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="text-red-800 dark:text-red-200 font-semibold">
                      Batch Error
                    </h4>
                    <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                      {batchJob.error}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results Section */}
          {batchResults && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                6. Generated Results
              </h2>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  AI-generated rug descriptions from your batch job:
                </p>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Results Preview:</p>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto max-h-64">
                    {batchResults
                      ? batchResults.split("\n").slice(0, 5).join("\n")
                      : "No results available"}
                    {batchResults &&
                      batchResults.split("\n").length > 5 &&
                      "\n..."}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Generated Images Section */}
          {generatedImages.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold mb-4">
                6. AI-Generated Room Scenes 🎨
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Photorealistic room scenes showing your rugs in styled settings,
                generated by <strong>Gemini 2.5 Flash Image</strong>. Each image
                is created at 2K resolution (1792x1024px) with professional
                interior photography quality.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {generatedImages.map((image) => (
                  <div key={image.key} className="space-y-2">
                    <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                      {image.key}
                    </h3>
                    <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.imageUrl}
                        alt={`Rug scene ${image.key}`}
                        className="w-full h-auto"
                      />
                    </div>
                    <a
                      href={image.imageUrl}
                      download={`${image.key}-scene.png`}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Download Image
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Logging & Debug Section */}
      <LogViewer
        sessionId={currentSessionId || undefined}
        maxEntries={200}
        showDebug={false}
      />
    </div>
  );
}
