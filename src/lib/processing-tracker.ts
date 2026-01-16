'use client';

/**
 * Processing Tracker
 * 
 * Tracks individual rug processing results to ensure no items are lost.
 * Provides detailed failure logs and recovery mechanisms.
 */

export interface ProcessingResult {
  sku: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'skipped';
  error?: string;
  errorCode?: string;
  timestamp?: number;
  retryCount: number;
  chunkIndex?: number;
  batchId?: string;
}

export interface ProcessingSession {
  id: string;
  startTime: number;
  endTime?: number;
  fileName: string;
  totalItems: number;
  results: Map<string, ProcessingResult>;
  status: 'active' | 'paused' | 'completed' | 'failed';
}

export interface ProcessingSummary {
  total: number;
  pending: number;
  processing: number;
  success: number;
  failed: number;
  skipped: number;
  failedItems: ProcessingResult[];
  successRate: number;
}

const STORAGE_KEY = 'rugapp_processing_sessions';
const MAX_SESSIONS = 10;

/**
 * Create a new processing session
 */
export function createSession(fileName: string, skus: string[]): ProcessingSession {
  const session: ProcessingSession = {
    id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    startTime: Date.now(),
    fileName,
    totalItems: skus.length,
    results: new Map(),
    status: 'active',
  };

  // Initialize all items as pending
  skus.forEach(sku => {
    session.results.set(sku, {
      sku,
      status: 'pending',
      retryCount: 0,
    });
  });

  return session;
}

/**
 * Update the status of a specific rug
 */
export function updateItemStatus(
  session: ProcessingSession,
  sku: string,
  status: ProcessingResult['status'],
  details?: Partial<ProcessingResult>
): ProcessingSession {
  const existing = session.results.get(sku) || { sku, retryCount: 0, status: 'pending' };
  
  session.results.set(sku, {
    ...existing,
    ...details,
    status,
    timestamp: Date.now(),
    retryCount: status === 'failed' ? existing.retryCount + 1 : existing.retryCount,
  });

  return session;
}

/**
 * Mark multiple items with the same status
 */
export function updateBatchStatus(
  session: ProcessingSession,
  skus: string[],
  status: ProcessingResult['status'],
  details?: Partial<ProcessingResult>
): ProcessingSession {
  skus.forEach(sku => {
    updateItemStatus(session, sku, status, details);
  });
  return session;
}

/**
 * Get processing summary
 */
export function getSessionSummary(session: ProcessingSession): ProcessingSummary {
  const results = Array.from(session.results.values());
  
  const summary: ProcessingSummary = {
    total: results.length,
    pending: 0,
    processing: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    failedItems: [],
    successRate: 0,
  };

  results.forEach(result => {
    summary[result.status]++;
    if (result.status === 'failed') {
      summary.failedItems.push(result);
    }
  });

  const processed = summary.success + summary.failed + summary.skipped;
  summary.successRate = processed > 0 ? (summary.success / processed) * 100 : 0;

  return summary;
}

/**
 * Get all failed items that can be retried
 */
export function getRetryableItems(session: ProcessingSession, maxRetries = 3): ProcessingResult[] {
  return Array.from(session.results.values())
    .filter(r => r.status === 'failed' && r.retryCount < maxRetries);
}

/**
 * Get all pending items
 */
export function getPendingItems(session: ProcessingSession): ProcessingResult[] {
  return Array.from(session.results.values())
    .filter(r => r.status === 'pending');
}

/**
 * Export session to JSON for backup/analysis
 */
export function exportSessionToJSON(session: ProcessingSession): string {
  const exportData = {
    ...session,
    results: Array.from(session.results.entries()),
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import session from JSON
 */
export function importSessionFromJSON(json: string): ProcessingSession {
  const data = JSON.parse(json);
  return {
    ...data,
    results: new Map(data.results),
  };
}

/**
 * Generate a detailed failure report
 */
export function generateFailureReport(session: ProcessingSession): string {
  const summary = getSessionSummary(session);
  const timestamp = new Date().toISOString();
  
  let report = `# Processing Failure Report\n`;
  report += `Generated: ${timestamp}\n`;
  report += `Session ID: ${session.id}\n`;
  report += `File: ${session.fileName}\n\n`;
  
  report += `## Summary\n`;
  report += `- Total Items: ${summary.total}\n`;
  report += `- Successful: ${summary.success} (${summary.successRate.toFixed(1)}%)\n`;
  report += `- Failed: ${summary.failed}\n`;
  report += `- Pending: ${summary.pending}\n`;
  report += `- Skipped: ${summary.skipped}\n\n`;

  if (summary.failedItems.length > 0) {
    report += `## Failed Items (${summary.failedItems.length})\n\n`;
    report += `| SKU | Error | Retry Count | Chunk | Timestamp |\n`;
    report += `|-----|-------|-------------|-------|----------|\n`;
    
    summary.failedItems.forEach(item => {
      const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A';
      report += `| ${item.sku} | ${item.error || 'Unknown'} | ${item.retryCount} | ${item.chunkIndex ?? 'N/A'} | ${time} |\n`;
    });

    report += `\n## Failed SKUs (copy for retry)\n\n`;
    report += '```\n';
    report += summary.failedItems.map(i => i.sku).join('\n');
    report += '\n```\n';
  }

  return report;
}

/**
 * Generate CSV of failed items for easy reimport
 */
export function generateFailedItemsCSV(
  session: ProcessingSession,
  originalData: Array<{ sku: string; [key: string]: unknown }>
): string {
  const failedSkus = new Set(
    Array.from(session.results.values())
      .filter(r => r.status === 'failed')
      .map(r => r.sku)
  );

  const failedRows = originalData.filter(row => failedSkus.has(row.sku));
  
  if (failedRows.length === 0) return '';

  // Get headers from first row
  const headers = Object.keys(failedRows[0]);
  
  // Build CSV
  let csv = headers.join(',') + '\n';
  failedRows.forEach(row => {
    const values = headers.map(h => {
      const val = row[h];
      // Escape quotes and wrap in quotes if contains comma
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csv += values.join(',') + '\n';
  });

  return csv;
}

/**
 * Save session to localStorage
 */
export function saveSession(session: ProcessingSession): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const sessions: Array<{ id: string; data: string }> = stored ? JSON.parse(stored) : [];
    
    // Update or add session
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    const sessionData = {
      id: session.id,
      data: exportSessionToJSON(session),
    };

    if (existingIndex >= 0) {
      sessions[existingIndex] = sessionData;
    } else {
      sessions.unshift(sessionData);
    }

    // Keep only last N sessions
    const trimmed = sessions.slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

/**
 * Load session from localStorage
 */
export function loadSession(sessionId: string): ProcessingSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const sessions: Array<{ id: string; data: string }> = JSON.parse(stored);
    const found = sessions.find(s => s.id === sessionId);
    
    if (found) {
      return importSessionFromJSON(found.data);
    }
  } catch (err) {
    console.error('Failed to load session:', err);
  }

  return null;
}

/**
 * Get all saved sessions (metadata only)
 */
export function getSavedSessions(): Array<{ id: string; fileName: string; startTime: number; status: string; totalItems: number }> {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const sessions: Array<{ id: string; data: string }> = JSON.parse(stored);
    
    return sessions.map(s => {
      const session = importSessionFromJSON(s.data);
      return {
        id: session.id,
        fileName: session.fileName,
        startTime: session.startTime,
        status: session.status,
        totalItems: session.totalItems,
      };
    });
  } catch (err) {
    console.error('Failed to get sessions:', err);
    return [];
  }
}

/**
 * Delete a saved session
 */
export function deleteSession(sessionId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    const sessions: Array<{ id: string; data: string }> = JSON.parse(stored);
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Failed to delete session:', err);
  }
}

/**
 * Download file helper
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
