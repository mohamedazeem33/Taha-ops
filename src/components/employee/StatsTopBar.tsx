import { Flame, Star, Zap } from 'lucide-react';
import { getLevel, getLevelProgress } from '@/lib/levels';
import { DailyProgress } from '@/components/employee/DailyProgress';

interface StatsTopBarProps {
  totalPoints: number;
  currentStreak: number;
  doneCount: number;
  totalTasks: number;
}

export function StatsTopBar({ totalPoints, currentStreak, doneCount, totalTasks }: StatsTopBarProps) {
  const level = getLevel(totalPoints);
  const { percent, remaining, nextLevel } = getLevelProgress(totalPoints);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            <Zap className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{totalPoints}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Points</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-950/50 dark:text-orange-400">
            <Flame className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {currentStreak}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Day streak</p>
          </div>
        </div>

        <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-1 dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <Star className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">{level.name}</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-amber-400 transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            {nextLevel && (
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                {remaining} pts to {nextLevel.name}
              </p>
            )}
          </div>
        </div>
      </div>

      <DailyProgress done={doneCount} total={totalTasks} />
    </div>
  );
}
