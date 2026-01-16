'use client';

interface BatchJobStatusProps {
  batchJob: {
    batchId?: string;
    state?: string;
    completedCount?: number;
    requestCount?: number;
    failedCount?: number;
    createTime?: string;
    outputFile?: string;
    error?: string;
  };
  processing: boolean;
  onDownloadResults: () => void;
}

export default function BatchJobStatus({
  batchJob,
  processing,
  onDownloadResults,
}: BatchJobStatusProps) {
  const stateColors: Record<string, string> = {
    JOB_STATE_SUCCEEDED: 'text-green-600',
    JOB_STATE_FAILED: 'text-red-600',
    JOB_STATE_RUNNING: 'text-blue-600',
    JOB_STATE_PENDING: 'text-yellow-600',
  };

  const stateText = batchJob.state
    ? batchJob.state.replace('JOB_STATE_', '').toLowerCase()
    : 'Unknown';

  const progressPercent =
    batchJob.requestCount && batchJob.requestCount > 0
      ? ((batchJob.completedCount || 0) / batchJob.requestCount) * 100
      : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold mb-4">Batch Job Status</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Batch ID:
            </p>
            <p className="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded">
              {batchJob.batchId || 'Not available'}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Status:
            </p>
            <p className={`text-sm font-medium ${stateColors[batchJob.state || ''] || 'text-gray-600'}`}>
              {stateText}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress:
            </p>
            <p className="text-sm">
              {batchJob.completedCount || 0} / {batchJob.requestCount || 0} completed
              {(batchJob.failedCount || 0) > 0 && ` (${batchJob.failedCount} failed)`}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Created:
            </p>
            <p className="text-sm">
              {batchJob.createTime ? new Date(batchJob.createTime).toLocaleString() : 'Unknown'}
            </p>
          </div>
        </div>

        {batchJob.state === 'JOB_STATE_RUNNING' && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {batchJob.state === 'JOB_STATE_SUCCEEDED' && batchJob.outputFile && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="text-green-800 dark:text-green-200 font-semibold mb-2">
              Batch Completed Successfully! 🎉
            </h4>
            <p className="text-green-700 dark:text-green-300 text-sm mb-3">
              Your rug descriptions have been generated and are ready for download.
            </p>
            <button
              onClick={onDownloadResults}
              disabled={processing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {processing ? '⏳ Extracting Images...' : '📥 Download & Extract Images'}
            </button>
            <p className="text-xs text-green-700 dark:text-green-300 mt-2">
              Download the batch results and extract the generated room scene images
            </p>
          </div>
        )}

        {batchJob.error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="text-red-800 dark:text-red-200 font-semibold">Batch Error</h4>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">{batchJob.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
