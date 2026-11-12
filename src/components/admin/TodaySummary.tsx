import { CheckCircle2, Clock3, Hourglass, ListTodo } from 'lucide-react';
import type { DaySummary } from '@/lib/tasks';

interface TodaySummaryProps {
  summary: DaySummary;
}

export function TodaySummary({ summary }: TodaySummaryProps) {
  const tiles = [
    {
      metric: 'planned',
      label: 'Planned',
      value: summary.total,
      icon: ListTodo,
      tone: 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-900/50',
    },
    {
      metric: 'done',
      label: 'Done',
      value: summary.done,
      icon: CheckCircle2,
      tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60',
    },
    {
      metric: 'waiting',
      label: 'Awaiting review',
      value: summary.waiting,
      icon: Hourglass,
      tone: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60',
    },
    {
      metric: 'late',
      label: 'Late',
      value: summary.late,
      icon: Clock3,
      tone: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/60',
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {tiles.map((tile) => (
        <a
          key={tile.label}
          href={`#/admin/overview-tasks?metric=${tile.metric}`}
          className="group block rounded-2xl border border-white/60 bg-white p-4 shadow-sm sm:p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-400/60 hover:shadow-md active:scale-[0.98] dark:border-white/10 dark:bg-slate-900 dark:hover:border-brand-500/40 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition group-hover:scale-105 ${tile.tone}`}>
              <tile.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-400">
              View →
            </span>
          </div>
          <p className="font-display mt-3 text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">{tile.value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tile.label}</p>
        </a>
      ))}
    </section>
  );
}
