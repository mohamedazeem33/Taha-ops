import { CheckCircle2, Clock3, Hourglass, ListTodo } from 'lucide-react';
import type { DaySummary } from '@/lib/tasks';

interface TodaySummaryProps {
  summary: DaySummary;
}

export function TodaySummary({ summary }: TodaySummaryProps) {
  const tiles = [
    { label: 'Planned', value: summary.total, icon: ListTodo, tone: 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-900/50' },
    { label: 'Done', value: summary.done, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60' },
    { label: 'Awaiting review', value: summary.waiting, icon: Hourglass, tone: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60' },
    { label: 'Late', value: summary.late, icon: Clock3, tone: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/60' },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tile.tone}`}>
            <tile.icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{tile.value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tile.label}</p>
        </div>
      ))}
    </section>
  );
}
