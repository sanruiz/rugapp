'use client';

import { useState, useEffect } from 'react';
import { getSavedSessions, loadSession, ProcessingSession, getSessionSummary } from '@/lib/processing-tracker';

interface GeminiBatch {
  chunkNumber: number | null;
  state: string;
  successCount: number;
  needsDownload: boolean;
}

interface RecoveryStatus {
  outputDate: string;
  summary: {
    totalBatches: number;
    succeeded: number;
    needsDownload: number;
    localChunks: number[];
    missingChunks?: number[]; // Chunks that never made it to Gemini
    maxChunk?: number;
  };
  needsDownload: GeminiBatch[];
}

// Key para guardar el estado de continuación
const CONTINUE_KEY = 'rugapp_continue_from';

export interface ContinueState {
  startFromChunk: number;
  totalChunksCompleted: number;
  timestamp: number;
  outputDate: string;
}

// Función para guardar estado de continuación
export function saveContinueState(state: ContinueState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONTINUE_KEY, JSON.stringify(state));
  }
}

// Función para leer estado de continuación
export function getContinueState(): ContinueState | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CONTINUE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Función para limpiar estado de continuación
export function clearContinueState() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CONTINUE_KEY);
  }
}

export default function BatchRecovery() {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [status, setStatus] = useState<RecoveryStatus | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Retry failed chunks state
  const [retryChunks, setRetryChunks] = useState<string>('');
  
  const [savedSessions, setSavedSessions] = useState<Array<{
    id: string;
    fileName: string;
    startTime: number;
    status: string;
    totalItems: number;
  }>>([]);
  
  const [selectedSession, setSelectedSession] = useState<ProcessingSession | null>(null);

  useEffect(() => {
    const sessions = getSavedSessions();
    setSavedSessions(sessions);
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/recover-batch?action=status');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      setStatus(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const downloadAll = async () => {
    setDownloading(true);
    setError(null);
    setDownloadProgress([]);
    
    try {
      const res = await fetch('/api/recover-batch?action=download-all');
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      const messages = data.results?.map((r: { chunk: number; success?: boolean; imagesExtracted?: number; error?: string }) => 
        r.success 
          ? `✓ Chunk ${r.chunk}: ${r.imagesExtracted} images`
          : `✗ Chunk ${r.chunk}: ${r.error}`
      ) || [];
      
      messages.push(`📊 Total: ${data.totalImagesExtracted} images from ${data.chunksDownloaded} chunks`);
      setDownloadProgress(messages);
      await checkStatus();
    } catch (err) {
      setError(String(err));
    } finally {
      setDownloading(false);
    }
  };

  const loadSessionDetails = (sessionId: string) => {
    const session = loadSession(sessionId);
    setSelectedSession(session);
  };

  // Función para continuar el procesamiento
  const handleContinue = async () => {
    setContinuing(true);
    setError(null);
    setDownloadProgress([]);
    
    try {
      // 1. Primero descargar todos los batches pendientes
      if (status && status.summary.needsDownload > 0) {
        setDownloadProgress(['⏳ Downloading pending batches...']);
        const res = await fetch('/api/recover-batch?action=download-all');
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }
        
        const messages = data.results?.map((r: { chunk: number; success?: boolean; imagesExtracted?: number; error?: string }) => 
          r.success 
            ? `✓ Chunk ${r.chunk}: ${r.imagesExtracted} images`
            : `✗ Chunk ${r.chunk}: ${r.error}`
        ) || [];
        
        setDownloadProgress(prev => [...prev, ...messages]);
      }
      
      // 2. Obtener el status actualizado
      const statusRes = await fetch('/api/recover-batch?action=status');
      const statusData = await statusRes.json();
      
      if (statusData.error) {
        setError(statusData.error);
        return;
      }
      
      // 3. Calcular desde qué chunk continuar
      const localChunks = statusData.summary.localChunks as number[];
      const maxDownloaded = localChunks.length > 0 ? Math.max(...localChunks) : 0;
      const startFromChunk = maxDownloaded + 1;
      
      // 4. Guardar estado para continuar
      const continueState: ContinueState = {
        startFromChunk,
        totalChunksCompleted: localChunks.length,
        timestamp: Date.now(),
        outputDate: statusData.outputDate,
      };
      
      saveContinueState(continueState);
      
      setDownloadProgress(prev => [
        ...prev, 
        `✅ Ready to continue from chunk ${startFromChunk}`,
        `📋 ${localChunks.length} chunks already completed`,
        '🔄 Reloading page to continue pipeline...'
      ]);
      
      // 5. Recargar la página para que rug-processor-app detecte el estado
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err) {
      setError(String(err));
    } finally {
      setContinuing(false);
    }
  };

  const totalPendingImages = status?.needsDownload.reduce((sum, b) => sum + b.successCount, 0) || 0;

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">🔄 Recovery</h2>
        <button
          onClick={checkStatus}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Check'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded p-2 text-red-200 text-xs">
          {error}
        </div>
      )}

      {savedSessions.length > 0 && (
        <div className="bg-purple-900/30 rounded p-2">
          <div className="text-purple-300 text-xs mb-1">📦 Saved Sessions:</div>
          <div className="space-y-1">
            {savedSessions.slice(0, 3).map(s => (
              <div 
                key={s.id} 
                className="flex justify-between text-xs cursor-pointer hover:bg-purple-900/50 p-1 rounded"
                onClick={() => loadSessionDetails(s.id)}
              >
                <span className="text-gray-300 truncate">{s.fileName}</span>
                <span className="text-gray-400">{s.totalItems} rugs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSession && (
        <div className="bg-gray-700 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Session: {selectedSession.fileName}</div>
          {(() => {
            const summary = getSessionSummary(selectedSession);
            return (
              <div className="grid grid-cols-4 gap-1 text-xs">
                <div className="text-center">
                  <div className="text-green-400 font-bold">{summary.success}</div>
                  <div className="text-gray-500">OK</div>
                </div>
                <div className="text-center">
                  <div className="text-red-400 font-bold">{summary.failed}</div>
                  <div className="text-gray-500">Fail</div>
                </div>
                <div className="text-center">
                  <div className="text-yellow-400 font-bold">{summary.pending + summary.processing}</div>
                  <div className="text-gray-500">Pend</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-400 font-bold">{Math.round(summary.successRate)}%</div>
                  <div className="text-gray-500">Rate</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {status && (
        <div className="space-y-2">
          <div className="text-xs text-gray-400">
            📁 {status.outputDate} | Local: {status.summary.localChunks.length} chunks
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-900/50 rounded p-2 text-center">
              <div className="font-bold text-green-400">{status.summary.succeeded}</div>
              <div className="text-gray-400 text-xs">In Gemini</div>
            </div>
            <div className="bg-yellow-900/50 rounded p-2 text-center">
              <div className="font-bold text-yellow-400">{status.summary.needsDownload}</div>
              <div className="text-gray-400 text-xs">To Download</div>
            </div>
            <div className="bg-blue-900/50 rounded p-2 text-center">
              <div className="font-bold text-blue-400">{status.summary.localChunks.length}</div>
              <div className="text-gray-400 text-xs">Downloaded</div>
            </div>
          </div>

          {status.summary.needsDownload > 0 && (
            <button
              onClick={downloadAll}
              disabled={downloading || continuing}
              className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {downloading ? 'Downloading...' : `Download ${totalPendingImages} images`}
            </button>
          )}

          {/* Botón Continuar - siempre visible cuando hay chunks locales */}
          {status.summary.localChunks.length > 0 && (
            <button
              onClick={handleContinue}
              disabled={downloading || continuing}
              className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {continuing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Preparing...
                </>
              ) : (
                <>
                  🚀 Continuar desde chunk {Math.max(...status.summary.localChunks) + 1}
                </>
              )}
            </button>
          )}

          {/* Missing Chunks Section - chunks that failed before reaching Gemini */}
          {status.summary.missingChunks && status.summary.missingChunks.length > 0 && (
            <div className="bg-red-900/30 border border-red-500 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-red-400 font-semibold text-sm">
                  ⚠️ {status.summary.missingChunks.length} chunks fallidos
                </span>
              </div>
              <div className="text-xs text-red-300">
                Chunks: {status.summary.missingChunks.join(', ')}
              </div>
              <div className="text-xs text-gray-400">
                Estos chunks fallaron antes de enviarse a Gemini. Para reprocesarlos:
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={retryChunks || status.summary.missingChunks.join(',')}
                  onChange={(e) => setRetryChunks(e.target.value)}
                  placeholder="31,32,33"
                  className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-white"
                />
                <button
                  onClick={() => {
                    const chunks = (retryChunks || status.summary.missingChunks?.join(',') || '')
                      .split(',')
                      .map(s => s.trim())
                      .filter(s => s)
                      .join(',');
                    // Save to localStorage for the processor to pick up
                    localStorage.setItem('rugapp_retry_chunks', chunks);
                    setDownloadProgress([
                      `🔄 Retry chunks: ${chunks}`,
                      '📋 Guarda estos números de chunk.',
                      '1. Sube el mismo CSV',
                      '2. El sistema reprocesará solo estos chunks',
                    ]);
                  }}
                  className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
                >
                  Guardar
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                💡 Rugs afectados: {status.summary.missingChunks.length * 75} (aprox)
              </div>
            </div>
          )}
        </div>
      )}

      {downloadProgress.length > 0 && (
        <div className="bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
          {downloadProgress.map((msg, i) => (
            <div key={i} className="text-xs text-gray-300">{msg}</div>
          ))}
        </div>
      )}

      {status && status.summary.needsDownload === 0 && status.summary.localChunks.length > 0 && (
        <div className="bg-green-900/30 border border-green-500 rounded p-2 text-center text-green-400 text-xs">
          ✅ All done!
        </div>
      )}
    </div>
  );
}
