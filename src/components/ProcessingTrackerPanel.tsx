'use client';

import { ProcessingSummary, ProcessingResult } from '@/lib/processing-tracker';

interface ProcessingTrackerPanelProps {
  summary: ProcessingSummary | null;
  savedSessions: Array<{ id: string; fileName: string; startTime: number; status: string; totalItems: number }>;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onDownloadReport: () => void;
  onDownloadFailedCSV: () => void;
  onDownloadBackup: () => void;
  onResetFailed: () => void;
  onRetryFailed: () => void;
  failedItems: ProcessingResult[];
  showDetails?: boolean;
}

export default function ProcessingTrackerPanel({
  summary,
  savedSessions,
  onLoadSession,
  onDeleteSession,
  onDownloadReport,
  onDownloadFailedCSV,
  onDownloadBackup,
  onResetFailed,
  onRetryFailed,
  failedItems,
  showDetails = true,
}: ProcessingTrackerPanelProps) {
  if (!summary && savedSessions.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-semibold flex items-center gap-2">
        📊 Processing Tracker
        {summary && (
          <span className={`text-sm font-normal px-2 py-1 rounded ${
            summary.failed > 0 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          }`}>
            {summary.successRate.toFixed(1)}% success rate
          </span>
        )}
      </h2>

      {/* Current Session Summary */}
      {summary && (
        <div className="space-y-4">
          {/* Progress Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total" value={summary.total} color="gray" />
            <StatCard label="Success" value={summary.success} color="green" />
            <StatCard label="Failed" value={summary.failed} color="red" />
            <StatCard label="Pending" value={summary.pending} color="yellow" />
            <StatCard label="Skipped" value={summary.skipped} color="gray" />
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Progress</span>
              <span>{summary.success + summary.failed + summary.skipped} / {summary.total}</span>
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
              <div 
                className="bg-green-500 h-full transition-all duration-300"
                style={{ width: `${(summary.success / summary.total) * 100}%` }}
              />
              <div 
                className="bg-red-500 h-full transition-all duration-300"
                style={{ width: `${(summary.failed / summary.total) * 100}%` }}
              />
              <div 
                className="bg-gray-400 h-full transition-all duration-300"
                style={{ width: `${(summary.skipped / summary.total) * 100}%` }}
              />
            </div>
          </div>

          {/* Failed Items Alert */}
          {summary.failed > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-red-800 dark:text-red-200 font-semibold">
                    ⚠️ {summary.failed} items failed
                  </h3>
                  <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                    These items can be retried or exported for manual review.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={onRetryFailed}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Retry Failed
                  </button>
                  <button
                    onClick={onResetFailed}
                    className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Reset to Pending
                  </button>
                </div>
              </div>

              {/* Failed Items List */}
              {showDetails && failedItems.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                    Failed Items:
                  </h4>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-red-100 dark:bg-red-900/40">
                        <tr>
                          <th className="text-left px-2 py-1">SKU</th>
                          <th className="text-left px-2 py-1">Error</th>
                          <th className="text-center px-2 py-1">Retries</th>
                          <th className="text-left px-2 py-1">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedItems.slice(0, 20).map((item) => (
                          <tr key={item.sku} className="border-b border-red-200 dark:border-red-800">
                            <td className="px-2 py-1 font-mono text-xs">{item.sku}</td>
                            <td className="px-2 py-1 text-xs truncate max-w-xs" title={item.error}>
                              {item.error || 'Unknown error'}
                            </td>
                            <td className="px-2 py-1 text-center">{item.retryCount}</td>
                            <td className="px-2 py-1 text-xs">
                              {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {failedItems.length > 20 && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">
                        ... and {failedItems.length - 20} more failed items
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onDownloadReport}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📄 Download Report
            </button>
            {summary.failed > 0 && (
              <button
                onClick={onDownloadFailedCSV}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                📥 Export Failed as CSV
              </button>
            )}
            <button
              onClick={onDownloadBackup}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              💾 Backup Session
            </button>
          </div>
        </div>
      )}

      {/* Saved Sessions */}
      {savedSessions.length > 0 && (
        <div className="border-t dark:border-gray-700 pt-4">
          <h3 className="text-lg font-semibold mb-3">📚 Saved Sessions</h3>
          <div className="space-y-2">
            {savedSessions.map((session) => (
              <div 
                key={session.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{session.fileName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(session.startTime).toLocaleString()} • {session.totalItems} items • 
                    <span className={`ml-1 ${
                      session.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                      session.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                      session.status === 'paused' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>
                      {session.status}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onLoadSession(session.id)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => onDeleteSession(session.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  };

  return (
    <div className={`rounded-lg p-3 text-center ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wide">{label}</p>
    </div>
  );
}
