'use client';

interface BatchGenerationSectionProps {
  processing: boolean;
  batchRequests: string;
  polling: boolean;
  onGenerateTextOnly: () => void;
  onGenerateWithImages: () => void;
  onDownload: () => void;
  onSubmitToGemini: () => void;
}

export default function BatchGenerationSection({
  processing,
  batchRequests,
  polling,
  onGenerateTextOnly,
  onGenerateWithImages,
  onDownload,
  onSubmitToGemini,
}: BatchGenerationSectionProps) {
  return (
    <>
      {/* Generate Batch Requests */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">3. Generate Batch Requests</h2>
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={onGenerateTextOnly}
              disabled={processing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generate Text-Only Batch
            </button>
            <button
              onClick={onGenerateWithImages}
              disabled={processing}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Generate with Images
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Text-only batches are faster to generate. Including images will download and encode
            each rug image.
          </p>
        </div>
      </div>

      {/* Batch Processing Options */}
      {batchRequests && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">4. Batch Processing Options</h2>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h4 className="text-blue-800 dark:text-blue-200 font-semibold mb-2">
                🚀 Batch Processing Ready!
              </h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Your rug data has been converted to JSONL format for batch processing. You can
                either download the file or try submitting to Gemini Batch API.
              </p>
            </div>

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={onDownload}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                📥 Download JSONL File
              </button>
              <button
                onClick={onSubmitToGemini}
                disabled={processing || polling}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {polling ? '⏳ Processing...' : '🤖 Try Gemini Batch API'}
              </button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>
                <strong>💡 Recommended:</strong> Download the JSONL file for guaranteed batch
                processing.
              </p>
              <p>
                <strong>⚡ Alternative:</strong> Submit to Gemini API (may not be available for all
                accounts).
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">File Preview:</p>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
                {batchRequests.split('\n').slice(0, 3).join('\n')}
                {batchRequests.split('\n').length > 3 && '\n...'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
