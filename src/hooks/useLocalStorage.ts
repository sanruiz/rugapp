'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';

/**
 * Get value from localStorage (safe for SSR)
 */
function getStoredValue<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') return initialValue;
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch {
    return initialValue;
  }
}

/**
 * Subscribe to storage events
 */
function subscribeToStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

/**
 * Custom hook for persisting state to localStorage
 * Uses useSyncExternalStore for proper React 18+ compatibility
 * 
 * @param key - The localStorage key
 * @param initialValue - Default value if nothing stored
 * @returns [storedValue, setValue, clearValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Use a ref-like pattern with useSyncExternalStore for SSR compatibility
  const getSnapshot = useCallback(() => {
    return getStoredValue(key, initialValue);
  }, [key, initialValue]);

  const getServerSnapshot = useCallback(() => {
    return initialValue;
  }, [initialValue]);

  const storedValue = useSyncExternalStore(
    subscribeToStorage,
    getSnapshot,
    getServerSnapshot
  );

  // Track local state for immediate updates
  const [localValue, setLocalValue] = useState<T>(storedValue);

  // Sync local state with stored value on mount and key change
  useEffect(() => {
    setLocalValue(getStoredValue(key, initialValue));
  }, [key, initialValue]);

  // Persist to localStorage when value changes
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setLocalValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        
        return valueToStore;
      });
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  // Clear this specific key from localStorage
  const clearValue = useCallback(() => {
    try {
      setLocalValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [localValue, setValue, clearValue];
}

/**
 * Hook for managing session/work-in-progress data
 * Automatically saves and restores pipeline state
 */
export interface SavedSession {
  id: string;
  timestamp: number;
  rugsCount: number;
  processedCount: number;
  status: string;
  fileName?: string;
}

export function useSessionPersistence() {
  const SESSIONS_KEY = 'rugapp_sessions';
  const CURRENT_SESSION_KEY = 'rugapp_current_session';

  const [sessions, setSessions, clearSessions] = useLocalStorage<SavedSession[]>(SESSIONS_KEY, []);
  const [currentSession, setCurrentSession, clearCurrentSession] = useLocalStorage<SavedSession | null>(CURRENT_SESSION_KEY, null);

  // Save a new session
  const saveSession = useCallback((session: SavedSession) => {
    setSessions(prev => {
      // Keep only last 10 sessions
      const updated = [session, ...prev.filter(s => s.id !== session.id)].slice(0, 10);
      return updated;
    });
    setCurrentSession(session);
  }, [setSessions, setCurrentSession]);

  // Update current session progress
  const updateSessionProgress = useCallback((processedCount: number, status: string) => {
    if (currentSession) {
      const updated = { ...currentSession, processedCount, status, timestamp: Date.now() };
      setCurrentSession(updated);
      setSessions(prev => prev.map(s => s.id === currentSession.id ? updated : s));
    }
  }, [currentSession, setCurrentSession, setSessions]);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      clearCurrentSession();
    }
  }, [setSessions, currentSession, clearCurrentSession]);

  return {
    sessions,
    currentSession,
    saveSession,
    updateSessionProgress,
    deleteSession,
    clearSessions,
    clearCurrentSession,
  };
}

/**
 * Hook for caching processed rug data
 * Avoids re-processing the same CSV file
 */
interface CachedRugData {
  hash: string;
  rugs: unknown[];
  timestamp: number;
}

export function useRugDataCache() {
  const CACHE_KEY = 'rugapp_rug_cache';
  const [cache, setCache, clearCache] = useLocalStorage<CachedRugData | null>(CACHE_KEY, null);

  // Simple hash function for file content
  const hashString = useCallback((str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }, []);

  // Check if we have cached data for this content
  const getCachedData = useCallback((contentHash: string) => {
    if (cache && cache.hash === contentHash) {
      // Cache expires after 24 hours
      const isExpired = Date.now() - cache.timestamp > 24 * 60 * 60 * 1000;
      if (!isExpired) {
        return cache.rugs;
      }
    }
    return null;
  }, [cache]);

  // Save processed data to cache
  const setCachedData = useCallback((contentHash: string, rugs: unknown[]) => {
    setCache({
      hash: contentHash,
      rugs,
      timestamp: Date.now(),
    });
  }, [setCache]);

  return {
    hashString,
    getCachedData,
    setCachedData,
    clearCache,
  };
}
