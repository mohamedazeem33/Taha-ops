import { CheckCircle2, Clock3, Hourglass, ListTodo } from 'lucide-react';
import type { DaySummary } from '@/lib/tasks';
import { StatCard } from '@/components/StatCard';

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
        <StatCard
          key={tile.label}
          href={`#/admin/overview-tasks?metric=${tile.metric}`}
          icon={tile.icon}
          iconTone={tile.tone}
          value={tile.value}
          label={tile.label}
          actionText="View →"
        />
      ))}
    </section>
  );
}
