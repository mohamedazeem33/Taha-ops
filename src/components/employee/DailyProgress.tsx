interface DailyProgressProps {
  done: number;
  total: number;
}

export function DailyProgress({ done, total }: DailyProgressProps) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <section className="rounded-2xl border border-white/60 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Daily progress</p>
        <p className="font-display text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
          {done} of {total} done
        </p>
      </div>
      <div
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Daily progress"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#ff4d79] via-[#ff6a5c] to-[#ff9040] transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}
