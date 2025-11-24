'use client';

import { useState, useEffect, useCallback, useMemo } from "react";
import { logger, LogLevel } from "@/lib/logger";

interface LogViewerProps {
  sessionId?: string;
  maxEntries?: number;
  showDebug?: boolean;
}

export default function LogViewer({
  sessionId,
  maxEntries = 100,
  showDebug = false,
}: LogViewerProps) {
  const [selectedSession, setSelectedSession] = useState<string | undefined>(
    sessionId
  );
  const [filterLevel, setFilterLevel] = useState<LogLevel>(
    showDebug ? LogLevel.DEBUG : LogLevel.INFO
  );
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Compute logs based on current filters - this is derived state
  const logs = useMemo(() => {
    // refreshKey triggers re-computation for auto-refresh
    void refreshKey;
    const allLogs = logger.getLogs(
      selectedSession,
      filterCategory,
      filterLevel
    );
    return allLogs.slice(-maxEntries);
  }, [selectedSession, filterCategory, filterLevel, maxEntries, refreshKey]);

  // Compute sessions - this is derived state
  const sessions = useMemo(() => {
    // refreshKey triggers re-computation for auto-refresh
    void refreshKey;
    return logger.getAllSessions().slice(0, 10);
  }, [refreshKey]);

  // Auto-refresh timer - only updates the refresh key
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const refreshLogs = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const refreshSessions = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const exportLogs = () => {
    const data = logger.exportLogs(selectedSession);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${selectedSession || "all"}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    if (
      confirm(
        "Are you sure you want to clear the logs? This action cannot be undone."
      )
    ) {
      logger.clearLogs(selectedSession);
      refreshLogs();
      refreshSessions();
    }
  };

  const getLogLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return "text-gray-500 dark:text-gray-400";
      case LogLevel.INFO:
        return "text-blue-600 dark:text-blue-400";
      case LogLevel.WARN:
        return "text-yellow-600 dark:text-yellow-400";
      case LogLevel.ERROR:
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-300";
    }
  };

  const getLogLevelBadge = (level: LogLevel) => {
    const levelNames = ["DEBUG", "INFO", "WARN", "ERROR"];
    const colors = [
      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    ];

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${colors[level]}`}
      >
        {levelNames[level]}
      </span>
    );
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-blue-600 dark:text-blue-400";
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "failed":
        return "text-red-600 dark:text-red-400";
      case "cancelled":
        return "text-gray-600 dark:text-gray-400";
      default:
        return "text-gray-600 dark:text-gray-300";
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const getRetryableOperations = () => {
    return logger.getRetryableOperations(selectedSession);
  };

  if (!isExpanded) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">System Logs</h3>
          <div className="flex gap-2">
            <span className="text-sm text-gray-500">{logs.length} entries</span>
            <button
              onClick={() => setIsExpanded(true)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              View Logs
            </button>
          </div>
        </div>

        {/* Quick status */}
        <div className="mt-2 flex gap-4 text-sm">
          <span className="text-red-600 dark:text-red-400">
            {logs.filter((l) => l.level === LogLevel.ERROR).length} errors
          </span>
          <span className="text-yellow-600 dark:text-yellow-400">
            {logs.filter((l) => l.level === LogLevel.WARN).length} warnings
          </span>
          <span className="text-blue-600 dark:text-blue-400">
            {sessions.filter((s) => s.status === "active").length} active
            sessions
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">System Logs & Debugging</h3>
          <div className="flex gap-2">
            <button
              onClick={exportLogs}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Export
            </button>
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Minimize
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Session</label>
            <select
              value={selectedSession || ""}
              onChange={(e) => setSelectedSession(e.target.value || undefined)}
              className="w-full px-3 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All Sessions</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.mode} - {session.startTime.toLocaleString()} (
                  {session.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Level</label>
            <select
              value={filterLevel}
              onChange={(e) =>
                setFilterLevel(parseInt(e.target.value) as LogLevel)
              }
              className="w-full px-3 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value={LogLevel.DEBUG}>Debug+</option>
              <option value={LogLevel.INFO}>Info+</option>
              <option value={LogLevel.WARN}>Warn+</option>
              <option value={LogLevel.ERROR}>Error Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">All Categories</option>
              <option value="SESSION">Session</option>
              <option value="CSV_PARSING">CSV Parsing</option>
              <option value="RUG_PROCESSING">Rug Processing</option>
              <option value="CHUNKING">Chunking</option>
              <option value="BATCH_OPERATION">Batch Operations</option>
              <option value="API_CALL">API Calls</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Max Entries
            </label>
            <input
              type="number"
              min="10"
              max="1000"
              value={maxEntries}
              onChange={() => refreshLogs()}
              className="w-full px-3 py-1 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Sessions Overview */}
      {sessions.length > 0 && (
        <div className="p-4 border-b dark:border-gray-700">
          <h4 className="font-medium mb-2">Recent Sessions</h4>
          <div className="space-y-2">
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex justify-between items-center text-sm"
              >
                <div>
                  <span className="font-medium">{session.mode}</span>
                  <span className="text-gray-500 ml-2">
                    {session.startTime.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={getSessionStatusColor(session.status)}>
                    {session.status}
                  </span>
                  <span className="text-gray-500">
                    {session.processedRugs}/{session.totalRugs}
                  </span>
                  {session.endTime && (
                    <span className="text-gray-500">
                      {formatDuration(
                        session.endTime.getTime() - session.startTime.getTime()
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retry Options */}
      {getRetryableOperations().length > 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b dark:border-gray-700">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            🔄 Retryable Operations ({getRetryableOperations().length})
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Found failed operations that can be retried. Export logs to analyze
            and implement retry logic.
          </p>
        </div>
      )}

      {/* Logs List */}
      <div className="max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No logs found matching the current filters.
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    {getLogLevelBadge(log.level)}
                    <span className="text-sm font-medium">{log.category}</span>
                    {log.rugSku && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {log.rugSku}
                      </span>
                    )}
                    {log.chunkIndex !== undefined && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                        Chunk {log.chunkIndex}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                <p className={`text-sm mb-2 ${getLogLevelColor(log.level)}`}>
                  {log.message}
                </p>

                {log.data && Object.keys(log.data).length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-600 dark:text-gray-400">
                      View Data
                    </summary>
                    <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}

                {log.error && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-600 dark:text-red-400">
                      View Error
                    </summary>
                    <pre className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs overflow-x-auto">
                      {log.error.message}
                      {log.error.stack && `\n\n${log.error.stack}`}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
