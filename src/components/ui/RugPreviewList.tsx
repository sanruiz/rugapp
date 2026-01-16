'use client';

import { ProcessedRug } from '@/types/rug';

interface RugPreviewListProps {
  rugs: ProcessedRug[];
  maxVisible?: number;
  title?: string;
}

export default function RugPreviewList({
  rugs,
  maxVisible = 3,
  title,
}: RugPreviewListProps) {
  if (rugs.length === 0) return null;

  const visibleRugs = rugs.slice(0, maxVisible);
  const remainingCount = rugs.length - maxVisible;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold mb-4">
        {title || `Processed Rugs (${rugs.length})`}
      </h2>
      <div className="space-y-4">
        <div className="grid gap-4">
          {visibleRugs.map((rug) => (
            <div
              key={rug.sku}
              className="border dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-lg">{rug.title}</h4>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  SKU: {rug.sku}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {rug.size} • {rug.material} • {rug.style}
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                <p className="text-sm font-medium mb-1">Generated Prompt:</p>
                <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3">
                  {rug.prompt}
                </p>
              </div>
            </div>
          ))}
        </div>
        {remainingCount > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            ... and {remainingCount} more rugs
          </p>
        )}
      </div>
    </div>
  );
}
