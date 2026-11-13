import { CheckCircle2 } from 'lucide-react';
import { StatCard } from '@/components/StatCard';

interface DailyProgressProps {
  done: number;
  total: number;
}

export function DailyProgress({ done, total }: DailyProgressProps) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <StatCard
      icon={CheckCircle2}
      iconTone="text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60"
      value={`${done} of ${total}`}
      label="Done today"
    >
      <div className="space-y-1">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label="Done today"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff4d79] via-[#ff6a5c] to-[#ff9040] transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {percent}% completed
        </p>
      </div>
    </StatCard>
  );
}
