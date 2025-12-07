export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogData {
  [key: string]: unknown;
  rugSku?: string;
  chunkIndex?: number;
  batchId?: string;
  sessionId?: string;
  endpoint?: string;
  method?: string;
  responseTime?: number;
  step?: string;
  operation?: string;
  status?: string;
  duration?: number;
  processedRugs?: number;
  failedRugs?: number;
  chunkSize?: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: LogData;
  error?: Error;
  sessionId?: string;
  rugSku?: string;
  chunkIndex?: number;
  batchId?: string;
}

export interface ProcessingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  totalRugs: number;
  processedRugs: number;
  failedRugs: number;
  chunkSize?: number;
  mode: 'processing' | 'chunking';
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  logs: LogEntry[];
}

class Logger {
  private logs: LogEntry[] = [];
  private sessions: Map<string, ProcessingSession> = new Map();
  private currentSessionId: string | null = null;
  private logLevel: LogLevel = LogLevel.INFO;
  private isHydrated: boolean = false;
  private hydrationListeners: Set<() => void> = new Set();

  constructor() {
    // Don't load from storage in constructor - wait for client-side hydration
  }

  // Call this method from client-side useEffect to hydrate logs
  hydrate(): void {
    if (this.isHydrated) return;
    this.loadFromStorage();
    this.isHydrated = true;
    // Notify all listeners that hydration is complete
    this.hydrationListeners.forEach((listener) => listener());
  }

  onHydrate(listener: () => void): () => void {
    this.hydrationListeners.add(listener);
    // If already hydrated, call immediately
    if (this.isHydrated) {
      listener();
    }
    // Return unsubscribe function
    return () => this.hydrationListeners.delete(listener);
  }

  getIsHydrated(): boolean {
    return this.isHydrated;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveToStorage(): void {
    // Check if we're in the browser environment
    if (typeof window === "undefined") {
      return;
    }

    try {
      const logsData = {
        logs: this.logs.slice(-1000), // Keep last 1000 logs
        sessions: Array.from(this.sessions.entries()).slice(-50), // Keep last 50 sessions
      };
      localStorage.setItem(
        "rugapp-logs",
        JSON.stringify(logsData, (key, value) => {
          if (value instanceof Date) {
            return { __type: "Date", value: value.toISOString() };
          }
          if (value instanceof Error) {
            return {
              __type: "Error",
              message: value.message,
              stack: value.stack,
            };
          }
          return value;
        })
      );
    } catch (error) {
      console.error("Failed to save logs to storage:", error);
    }
  }

  private loadFromStorage(): void {
    // Check if we're in the browser environment
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = localStorage.getItem("rugapp-logs");
      if (stored) {
        const data = JSON.parse(stored, (key, value) => {
          if (value && typeof value === "object") {
            if (value.__type === "Date") {
              return new Date(value.value);
            }
            if (value.__type === "Error") {
              const error = new Error(value.message);
              error.stack = value.stack;
              return error;
            }
          }
          return value;
        });

        this.logs = data.logs || [];
        this.sessions = new Map(data.sessions || []);
      }
    } catch (error) {
      console.error("Failed to load logs from storage:", error);
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  startSession(
    mode: "processing" | "chunking",
    totalRugs: number,
    chunkSize?: number
  ): string {
    const sessionId = this.generateId();
    const session: ProcessingSession = {
      id: sessionId,
      startTime: new Date(),
      totalRugs,
      processedRugs: 0,
      failedRugs: 0,
      chunkSize,
      mode,
      status: "active",
      logs: [],
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    this.log(
      LogLevel.INFO,
      "SESSION",
      `Started ${mode} session for ${totalRugs} rugs`,
      {
        sessionId,
        chunkSize,
      }
    );

    return sessionId;
  }

  endSession(sessionId?: string): void {
    const id = sessionId || this.currentSessionId;
    if (!id) return;

    const session = this.sessions.get(id);
    if (session) {
      session.endTime = new Date();
      session.status = session.failedRugs > 0 ? "failed" : "completed";

      this.log(LogLevel.INFO, "SESSION", `Ended session ${id}`, {
        sessionId: id,
        duration: session.endTime.getTime() - session.startTime.getTime(),
        processedRugs: session.processedRugs,
        failedRugs: session.failedRugs,
      });
    }

    if (this.currentSessionId === id) {
      this.currentSessionId = null;
    }

    this.saveToStorage();
  }

  updateSessionProgress(
    processedRugs: number,
    failedRugs?: number,
    sessionId?: string
  ): void {
    const id = sessionId || this.currentSessionId;
    if (!id) return;

    const session = this.sessions.get(id);
    if (session) {
      session.processedRugs = processedRugs;
      if (failedRugs !== undefined) {
        session.failedRugs = failedRugs;
      }
    }
  }

  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: LogData,
    error?: Error
  ): void {
    if (level < this.logLevel) return;

    const logEntry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      error,
      sessionId: this.currentSessionId || undefined,
    };

    // Extract common context from data
    if (data) {
      if (data.rugSku) logEntry.rugSku = data.rugSku as string;
      if (data.chunkIndex !== undefined)
        logEntry.chunkIndex = data.chunkIndex as number;
      if (data.batchId) logEntry.batchId = data.batchId as string;
    }

    this.logs.push(logEntry);

    // Add to current session if active
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId);
      if (session) {
        session.logs.push(logEntry);
      }
    }

    // Console output for development
    const levelNames = ["DEBUG", "INFO", "WARN", "ERROR"];
    const prefix = `[${levelNames[level]}][${category}]`;

    if (error) {
      console.error(prefix, message, data, error);
    } else if (level >= LogLevel.WARN) {
      console.warn(prefix, message, data);
    } else {
      console.log(prefix, message, data);
    }

    // Auto-save periodically
    if (this.logs.length % 10 === 0) {
      this.saveToStorage();
    }
  }

  debug(category: string, message: string, data?: LogData): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: LogData): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: LogData): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(
    category: string,
    message: string,
    error?: Error,
    data?: LogData
  ): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  // Specialized logging methods for common operations
  logRugProcessing(
    rugSku: string,
    step: string,
    success: boolean,
    data?: LogData,
    error?: Error
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Rug ${rugSku}: ${step} ${
      success ? "completed" : "failed"
    }`;
    this.log(
      level,
      "RUG_PROCESSING",
      message,
      { rugSku, step, ...data },
      error
    );
  }

  logChunkOperation(
    chunkIndex: number,
    operation: string,
    success: boolean,
    data?: LogData,
    error?: Error
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `Chunk ${chunkIndex}: ${operation} ${
      success ? "completed" : "failed"
    }`;
    this.log(
      level,
      "CHUNK_OPERATION",
      message,
      { chunkIndex, operation, ...data },
      error
    );
  }

  logBatchOperation(
    batchId: string,
    operation: string,
    status: string,
    data?: LogData,
    error?: Error
  ): void {
    const level = status === "failed" ? LogLevel.ERROR : LogLevel.INFO;
    const message = `Batch ${batchId}: ${operation} - ${status}`;
    this.log(
      level,
      "BATCH_OPERATION",
      message,
      { batchId, operation, status, ...data },
      error
    );
  }

  logAPICall(
    endpoint: string,
    method: string,
    success: boolean,
    responseTime?: number,
    error?: Error
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const message = `API ${method} ${endpoint} ${
      success ? "succeeded" : "failed"
    }`;
    this.log(
      level,
      "API_CALL",
      message,
      { endpoint, method, responseTime },
      error
    );
  }

  // Query methods
  getLogs(sessionId?: string, category?: string, level?: LogLevel): LogEntry[] {
    return this.logs.filter((log) => {
      if (sessionId && log.sessionId !== sessionId) return false;
      if (category && log.category !== category) return false;
      if (level !== undefined && log.level < level) return false;
      return true;
    });
  }

  getSession(sessionId: string): ProcessingSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): ProcessingSession[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
  }

  getFailedOperations(sessionId?: string): LogEntry[] {
    return this.getLogs(sessionId, undefined, LogLevel.ERROR);
  }

  exportLogs(sessionId?: string): string {
    const logs = sessionId ? this.getLogs(sessionId) : this.logs;
    const session = sessionId ? this.getSession(sessionId) : null;

    const exportData = {
      exportTime: new Date().toISOString(),
      session,
      logs: logs.map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  clearLogs(sessionId?: string): void {
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.logs = [];
      }
      this.logs = this.logs.filter((log) => log.sessionId !== sessionId);
    } else {
      this.logs = [];
      this.sessions.clear();
    }
    this.saveToStorage();
  }

  // Retry helpers
  getRetryableOperations(sessionId?: string): LogEntry[] {
    return this.getFailedOperations(sessionId).filter(
      (log) =>
        log.category === "RUG_PROCESSING" ||
        log.category === "CHUNK_OPERATION" ||
        log.category === "BATCH_OPERATION"
    );
  }
}

// Singleton instance
export const logger = new Logger();

// Export for testing and advanced usage
export { Logger };
