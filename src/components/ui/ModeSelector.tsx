'use client';

interface ModeSelectorProps {
  currentMode: 'manual' | 'chunking' | 'automated';
  onModeChange: (mode: 'manual' | 'chunking' | 'automated') => void;
  disabled?: boolean;
}

export default function ModeSelector({
  currentMode,
  onModeChange,
  disabled = false,
}: ModeSelectorProps) {
  const modes = [
    { id: 'manual' as const, label: 'Manual Processing', color: 'blue' },
    { id: 'chunking' as const, label: 'Split CSV Only', color: 'blue' },
    { id: 'automated' as const, label: '🚀 Automated Pipeline (5500+ rugs)', color: 'green' },
  ];

  return (
    <div className="mt-4 flex gap-2 flex-wrap">
      {modes.map((mode) => {
        const isActive = currentMode === mode.id;
        const baseClasses = 'px-4 py-2 rounded-md text-sm font-medium transition-colors';
        const activeClasses = mode.color === 'green'
          ? 'bg-green-600 text-white'
          : 'bg-blue-600 text-white';
        const inactiveClasses = 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600';

        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
            disabled={disabled}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
