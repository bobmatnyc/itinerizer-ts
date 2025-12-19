import { AlertTriangle } from 'lucide-react';

interface GapIndicatorProps {
  message: string;
}

export function GapIndicator({ message }: GapIndicatorProps) {
  return (
    <div className="my-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          Possible Gap
        </p>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">{message}</p>
      </div>
    </div>
  );
}
