'use client';

interface BatchResultsSectionProps {
  batchResults: string;
}

export default function BatchResultsSection({ batchResults }: BatchResultsSectionProps) {
  if (!batchResults) return null;

  const lines = batchResults.split('\n');
  const previewLines = lines.slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold mb-4">Generated Results</h2>
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          AI-generated rug descriptions from your batch job:
        </p>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium">Results Preview:</p>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {lines.length} total lines
            </span>
          </div>
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
            {previewLines.join('\n')}
            {lines.length > 5 && '\n...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
