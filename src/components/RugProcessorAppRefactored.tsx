'use client';

import { useState, useCallback } from 'react';
import { useRugProcessor } from '@/hooks/useRugProcessor';
import { PIPELINE_CONFIG, isDevMode, CONFIG_PRESETS } from '@/lib/config';
import { PipelineState } from '@/lib/batch-pipeline';
import { logger } from '@/lib/logger';

// UI Components - Direct imports (avoid barrel files)
import FileDropzone from './ui/FileDropzone';
import StatusBar from './ui/StatusBar';
import ErrorAlert from './ui/ErrorAlert';
import RugPreviewList from './ui/RugPreviewList';
import ModeSelector from './ui/ModeSelector';
import BatchJobStatus from './ui/BatchJobStatus';
import ImageGallery from './ui/ImageGallery';
import LogViewer from './LogViewer';
import AutomatedPipeline from './AutomatedPipeline';

// Section Components - Direct imports
import ChunkingSection from './sections/ChunkingSection';
import BatchGenerationSection from './sections/BatchGenerationSection';
import BatchResultsSection from './sections/BatchResultsSection';

type ProcessingMode = 'manual' | 'chunking' | 'automated';

export default function RugProcessorApp() {
  // Core processing hook
  const processor = useRugProcessor();

  // Mode state
  const [mode, setMode] = useState<ProcessingMode>('manual');
  const [chunkSize, setChunkSize] = useState<number>(PIPELINE_CONFIG.chunkSize);

  // Handle file drop
  const handleFileDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      await processor.uploadFile(file);
    },
    [processor]
  );

  // Handle mode change
  const handleModeChange = useCallback((newMode: ProcessingMode) => {
    setMode(newMode);
  }, []);

  // Handle automated pipeline completion
  const handlePipelineComplete = useCallback(
    (result: PipelineState) => {
      logger.info('PIPELINE', 'Automated pipeline completed', {
        completed: result.completedCount,
        failed: result.failedCount,
      });
    },
    []
  );

  return (
    <div className="space-y-8">
      {/* Dev Mode Indicator */}
      {isDevMode && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 text-sm">
          <span className="font-medium text-yellow-800 dark:text-yellow-200">
            🛠️ Development Mode
          </span>
          <span className="text-yellow-700 dark:text-yellow-300 ml-2">
            Using smaller chunks ({CONFIG_PRESETS.development.chunkSize}) for faster testing
          </span>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">1. Upload CSV File</h2>
        <FileDropzone
          onDrop={handleFileDrop}
          processing={processor.processing}
          description="Supports rug inventory CSV files with product details"
        />
        <ModeSelector
          currentMode={mode}
          onModeChange={handleModeChange}
          disabled={processor.processing}
        />
      </div>

      {/* Automated Pipeline Section */}
      {mode === 'automated' && processor.processedRugs.length > 0 && (
        <AutomatedPipeline
          rugs={processor.processedRugs}
          chunkSize={chunkSize}
          concurrentLimit={PIPELINE_CONFIG.concurrentLimit}
          onComplete={handlePipelineComplete}
        />
      )}

      {/* Automated Mode - Waiting for Upload */}
      {mode === 'automated' && processor.processedRugs.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow-md p-6 border-2 border-green-300 dark:border-green-700">
          <h2 className="text-2xl font-semibold mb-4 text-green-800 dark:text-green-300">
            🚀 Automated Pipeline Ready
          </h2>
          <p className="text-green-700 dark:text-green-400 mb-4">
            Upload your CSV file above to start the automated pipeline. The system will:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-green-700 dark:text-green-400">
            <li>Split your {'>'}5000 rugs into chunks of {chunkSize} each</li>
            <li>Process {PIPELINE_CONFIG.concurrentLimit} chunks in parallel</li>
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

      {/* Chunking Section */}
      {mode === 'chunking' && (
        <ChunkingSection
          chunkSize={chunkSize}
          onChunkSizeChange={setChunkSize}
          processing={processor.processing}
        />
      )}

      {/* Manual Processing Sections */}
      {mode === 'manual' && (
        <>
          {/* Status Bar */}
          <StatusBar
            status={processor.status.status}
            currentStep={processor.status.currentStep}
            total={processor.status.total}
            processed={processor.status.processed}
          />

          {/* Error Alert */}
          <ErrorAlert error={processor.error} onDismiss={processor.clearError} />

          {/* Processed Rugs Preview */}
          <RugPreviewList
            rugs={processor.processedRugs}
            title={`2. Processed Rugs (${processor.processedRugs.length})`}
          />

          {/* Batch Generation */}
          {processor.processedRugs.length > 0 && (
            <BatchGenerationSection
              processing={processor.processing}
              batchRequests={processor.batchRequests}
              polling={processor.polling}
              onGenerateTextOnly={() => processor.generateBatchRequests(false)}
              onGenerateWithImages={() => processor.generateBatchRequests(true)}
              onDownload={processor.downloadBatchFile}
              onSubmitToGemini={processor.submitBatchToGemini}
            />
          )}

          {/* Batch Job Status */}
          {processor.batchJob && (
            <BatchJobStatus
              batchJob={processor.batchJob}
              processing={processor.processing}
              onDownloadResults={processor.downloadResults}
            />
          )}

          {/* Batch Results */}
          {processor.batchResults && (
            <BatchResultsSection batchResults={processor.batchResults} />
          )}

          {/* Generated Images */}
          <ImageGallery
            images={processor.generatedImages}
            processing={processor.processing}
            onDownloadAll={processor.downloadAllImages}
          />
        </>
      )}

      {/* Log Viewer */}
      <LogViewer
        sessionId={processor.currentSessionId || undefined}
        maxEntries={200}
        showDebug={isDevMode}
      />
    </div>
  );
}
