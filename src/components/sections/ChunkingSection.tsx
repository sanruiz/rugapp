'use client';

import { useState, useCallback } from 'react';
import FileDropzone from '../ui/FileDropzone';
import { logger } from '@/lib/logger';

interface ChunkingSectionProps {
  chunkSize: number;
  onChunkSizeChange: (size: number) => void;
  processing: boolean;
}

interface ChunkInfo {
  filename: string;
  size: number;
}

export default function ChunkingSection({
  chunkSize,
  onChunkSizeChange,
  processing: externalProcessing,
}: ChunkingSectionProps) {
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [processing, setProcessing] = useState(false);
  const [chunkedFile, setChunkedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');

  const isProcessing = externalProcessing || processing;

  const handleChunkCSV = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setProcessing(true);
    setStatus('Splitting CSV file...');

    const sessionId = logger.startSession('chunking', 0, chunkSize);

    logger.info('CHUNKING', 'Starting CSV chunking', {
      fileName: file.name,
      fileSize: file.size,
      chunkSize,
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chunkSize', chunkSize.toString());

      const startTime = Date.now();
      const response = await fetch('/api/chunk-csv', {
        method: 'POST',
        body: formData,
      });

      const responseTime = Date.now() - startTime;
      logger.logAPICall('/api/chunk-csv', 'POST', response.ok, responseTime);

      const result = await response.json();

      if (result.success) {
        setChunks(result.files);
        setChunkedFile(file);
        logger.updateSessionProgress(result.totalRows, 0, sessionId);
        setStatus(`Split ${result.totalRows} rows into ${result.totalChunks} chunks of ${result.chunkSize} rows each`);

        logger.info('CHUNKING', 'CSV chunking completed successfully', {
          totalRows: result.totalRows,
          totalChunks: result.totalChunks,
          chunkSize: result.chunkSize,
          files: result.files.length,
        });

        logger.endSession(sessionId);
      } else {
        throw new Error(result.error || 'Failed to chunk CSV');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to process CSV file');
      logger.error('CHUNKING', 'CSV chunking failed', error);
      logger.endSession(sessionId);
      setStatus(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }, [chunkSize]);

  const downloadChunk = async (chunkIndex: number) => {
    if (!chunkedFile) return;

    try {
      const formData = new FormData();
      formData.append('file', chunkedFile);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('chunkSize', chunkSize.toString());

      const response = await fetch('/api/download-chunk', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = chunks[chunkIndex]?.filename || `chunk-${chunkIndex + 1}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('Failed to download chunk');
      }
    } catch (err) {
      console.error('Download chunk error:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold mb-4">📂 Split Large CSV File</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Split your large CSV file into smaller chunks of {chunkSize} rugs each.
        Optimized for batch processing with images (~75 recommended).
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
          onChange={(e) => onChunkSizeChange(parseInt(e.target.value) || 75)}
          className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          disabled={isProcessing}
        />
      </div>

      {/* Drop Zone */}
      <FileDropzone
        onDrop={handleChunkCSV}
        processing={isProcessing}
        title="Drag and drop your large CSV file here, or click to select"
        description={`Will be split into chunks of ${chunkSize} lines each`}
        activeText="Drop the CSV file here to split..."
      />

      {/* Status */}
      {status && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">{status}</p>
        </div>
      )}

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
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border dark:border-gray-600"
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
                  disabled={isProcessing}
                >
                  Download Chunk
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400">
              ✅ CSV successfully split into {chunks.length} chunks! Download each chunk
              individually to process them in smaller batches.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
