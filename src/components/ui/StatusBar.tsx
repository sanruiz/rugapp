'use client';

interface StatusBarProps {
  status: 'idle' | 'processing' | 'complete' | 'error';
  currentStep: string;
  total?: number;
  processed?: number;
  showProgress?: boolean;
}

export default function StatusBar({
  status,
  currentStep,
  total = 0,
  processed = 0,
  showProgress = true,
}: StatusBarProps) {
  if (status === 'idle') return null;

  const statusColors = {
    idle: 'text-gray-600',
    processing: 'text-blue-600',
    complete: 'text-green-600',
    error: 'text-red-600',
  };

  const progressPercent = total > 0 ? (processed / total) * 100 : 50;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Processing Status</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Status:</span>
          <span className={`font-medium ${statusColors[status]}`}>
            {currentStep}
          </span>
        </div>
        {total > 0 && (
          <div className="flex justify-between text-sm">
            <span>Progress:</span>
            <span>{processed} / {total} rugs</span>
          </div>
        )}
        {status === 'processing' && showProgress && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
