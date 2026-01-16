'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ProcessingSession,
  ProcessingResult,
  ProcessingSummary,
  createSession,
  updateItemStatus,
  updateBatchStatus,
  getSessionSummary,
  getRetryableItems,
  getPendingItems,
  generateFailureReport,
  generateFailedItemsCSV,
  saveSession,
  loadSession,
  getSavedSessions,
  deleteSession,
  downloadFile,
  exportSessionToJSON,
} from '@/lib/processing-tracker';

export interface UseProcessingTrackerReturn {
  // Current session
  session: ProcessingSession | null;
  summary: ProcessingSummary | null;
  
  // Session management
  startNewSession: (fileName: string, skus: string[]) => ProcessingSession;
  loadExistingSession: (sessionId: string) => boolean;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: () => void;
  
  // Item tracking
  markItemProcessing: (sku: string, chunkIndex?: number) => void;
  markItemSuccess: (sku: string, batchId?: string) => void;
  markItemFailed: (sku: string, error: string, errorCode?: string) => void;
  markItemSkipped: (sku: string, reason: string) => void;
  markBatchSuccess: (skus: string[], batchId?: string) => void;
  markBatchFailed: (skus: string[], error: string) => void;
  
  // Recovery
  getFailedItems: () => ProcessingResult[];
  getRetryableItems: (maxRetries?: number) => ProcessingResult[];
  getPendingItems: () => ProcessingResult[];
  resetFailedItems: () => void;
  
  // Export/Download
  downloadFailureReport: () => void;
  downloadFailedItemsCSV: (originalData: Array<{ sku: string; [key: string]: unknown }>) => void;
  downloadSessionBackup: () => void;
  
  // Saved sessions
  savedSessions: Array<{ id: string; fileName: string; startTime: number; status: string; totalItems: number }>;
  deleteSavedSession: (sessionId: string) => void;
  refreshSavedSessions: () => void;
}

export function useProcessingTracker(): UseProcessingTrackerReturn {
  const [session, setSession] = useState<ProcessingSession | null>(null);
  const [savedSessions, setSavedSessions] = useState<Array<{ id: string; fileName: string; startTime: number; status: string; totalItems: number }>>(() => {
    // Initialize from localStorage on first render
    if (typeof window !== 'undefined') {
      return getSavedSessions();
    }
    return [];
  });

  // Derive summary from session (no effect needed)
  const summary = useMemo(() => {
    if (!session) return null;
    return getSessionSummary(session);
  }, [session]);

  // Save session when it changes
  useEffect(() => {
    if (session) {
      saveSession(session);
    }
  }, [session]);

  // Auto-save session periodically
  useEffect(() => {
    if (!session || session.status !== 'active') return;

    const interval = setInterval(() => {
      saveSession(session);
    }, 30000); // Save every 30 seconds

    return () => clearInterval(interval);
  }, [session]);

  const startNewSession = useCallback((fileName: string, skus: string[]): ProcessingSession => {
    const newSession = createSession(fileName, skus);
    setSession(newSession);
    saveSession(newSession);
    setSavedSessions(getSavedSessions());
    return newSession;
  }, []);

  const loadExistingSession = useCallback((sessionId: string): boolean => {
    const loaded = loadSession(sessionId);
    if (loaded) {
      setSession(loaded);
      return true;
    }
    return false;
  }, []);

  const pauseSession = useCallback(() => {
    setSession(prev => {
      if (!prev) return null;
      const updated = { ...prev, status: 'paused' as const };
      saveSession(updated);
      return updated;
    });
  }, []);

  const resumeSession = useCallback(() => {
    setSession(prev => {
      if (!prev) return null;
      const updated = { ...prev, status: 'active' as const };
      saveSession(updated);
      return updated;
    });
  }, []);

  const completeSession = useCallback(() => {
    setSession(prev => {
      if (!prev) return null;
      const updated = { ...prev, status: 'completed' as const, endTime: Date.now() };
      saveSession(updated);
      setSavedSessions(getSavedSessions());
      return updated;
    });
  }, []);

  const markItemProcessing = useCallback((sku: string, chunkIndex?: number) => {
    setSession(prev => {
      if (!prev) return null;
      return updateItemStatus(prev, sku, 'processing', { chunkIndex });
    });
  }, []);

  const markItemSuccess = useCallback((sku: string, batchId?: string) => {
    setSession(prev => {
      if (!prev) return null;
      return updateItemStatus(prev, sku, 'success', { batchId });
    });
  }, []);

  const markItemFailed = useCallback((sku: string, error: string, errorCode?: string) => {
    setSession(prev => {
      if (!prev) return null;
      return updateItemStatus(prev, sku, 'failed', { error, errorCode });
    });
  }, []);

  const markItemSkipped = useCallback((sku: string, reason: string) => {
    setSession(prev => {
      if (!prev) return null;
      return updateItemStatus(prev, sku, 'skipped', { error: reason });
    });
  }, []);

  const markBatchSuccess = useCallback((skus: string[], batchId?: string) => {
    setSession(prev => {
      if (!prev) return null;
      return updateBatchStatus(prev, skus, 'success', { batchId });
    });
  }, []);

  const markBatchFailed = useCallback((skus: string[], error: string) => {
    setSession(prev => {
      if (!prev) return null;
      return updateBatchStatus(prev, skus, 'failed', { error });
    });
  }, []);

  const getFailedItemsCallback = useCallback((): ProcessingResult[] => {
    if (!session) return [];
    return Array.from(session.results.values()).filter(r => r.status === 'failed');
  }, [session]);

  const getRetryableItemsCallback = useCallback((maxRetries = 3): ProcessingResult[] => {
    if (!session) return [];
    return getRetryableItems(session, maxRetries);
  }, [session]);

  const getPendingItemsCallback = useCallback((): ProcessingResult[] => {
    if (!session) return [];
    return getPendingItems(session);
  }, [session]);

  const resetFailedItems = useCallback(() => {
    setSession(prev => {
      if (!prev) return null;
      const updated = { ...prev, results: new Map(prev.results) };
      updated.results.forEach((result, sku) => {
        if (result.status === 'failed') {
          updated.results.set(sku, { ...result, status: 'pending' });
        }
      });
      return updated;
    });
  }, []);

  const downloadFailureReport = useCallback(() => {
    if (!session) return;
    const report = generateFailureReport(session);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(report, `failure-report-${timestamp}.md`, 'text/markdown');
  }, [session]);

  const downloadFailedItemsCSVCallback = useCallback((originalData: Array<{ sku: string; [key: string]: unknown }>) => {
    if (!session) return;
    const csv = generateFailedItemsCSV(session, originalData);
    if (csv) {
      const timestamp = new Date().toISOString().split('T')[0];
      downloadFile(csv, `failed-items-${timestamp}.csv`, 'text/csv');
    }
  }, [session]);

  const downloadSessionBackup = useCallback(() => {
    if (!session) return;
    const json = exportSessionToJSON(session);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadFile(json, `session-backup-${timestamp}.json`, 'application/json');
  }, [session]);

  const deleteSavedSession = useCallback((sessionId: string) => {
    deleteSession(sessionId);
    setSavedSessions(getSavedSessions());
  }, []);

  const refreshSavedSessions = useCallback(() => {
    setSavedSessions(getSavedSessions());
  }, []);

  return {
    session,
    summary,
    startNewSession,
    loadExistingSession,
    pauseSession,
    resumeSession,
    completeSession,
    markItemProcessing,
    markItemSuccess,
    markItemFailed,
    markItemSkipped,
    markBatchSuccess,
    markBatchFailed,
    getFailedItems: getFailedItemsCallback,
    getRetryableItems: getRetryableItemsCallback,
    getPendingItems: getPendingItemsCallback,
    resetFailedItems,
    downloadFailureReport,
    downloadFailedItemsCSV: downloadFailedItemsCSVCallback,
    downloadSessionBackup,
    savedSessions,
    deleteSavedSession,
    refreshSavedSessions,
  };
}
