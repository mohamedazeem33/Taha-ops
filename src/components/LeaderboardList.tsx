import { Trophy } from 'lucide-react';

interface LeaderboardListProps {
  rows: { employee_id: string; full_name: string; total_points: number; current_streak: number }[];
  highlightId?: string;
}

const MEDALS = ['bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200', 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'];

export function LeaderboardList({ rows, highlightId }: LeaderboardListProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No points earned yet this period.
      </p>
    );
  }

  return (
    <ol className="space-y-2.5">
      {rows.map((row, index) => {
        const isMe = row.employee_id === highlightId;
        const medalClass = MEDALS[index] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
        return (
          <li
            key={row.employee_id}
            className={`flex items-center gap-4 rounded-2xl border px-5 py-4 transition ${
              isMe
                ? 'border-brand-300 bg-brand-50/50 dark:border-brand-700 dark:bg-brand-950/20'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${medalClass}`}>
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                {row.full_name}
                {isMe && <span className="ml-2 text-xs font-normal text-brand-600 dark:text-brand-400">(you)</span>}
              </p>
              {row.current_streak > 0 && (
                <p className="text-xs text-orange-500">{row.current_streak}-day streak</p>
              )}
            </div>
            <span className="flex items-center gap-1.5 shrink-0 text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
              <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
              {row.total_points}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
