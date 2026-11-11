import { Timer } from 'lucide-react';
import { formatRemaining } from '@/lib/tasks';

interface DeadlineCountdownProps {
  deadline: string;
  now: number;
}

export function DeadlineCountdown({ deadline, now }: DeadlineCountdownProps) {
  const { label, urgent } = formatRemaining(deadline, now);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
        urgent
          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300'
          : 'bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300'
      }`}
    >
      <Timer className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}
