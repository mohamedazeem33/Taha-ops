import { Ban, KeyRound, RotateCcw, UserRound } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatDateIST } from '@/lib/formatDate';
import type { DayChip, DaySummary } from '@/lib/tasks';
import type { Profile } from '@/types/database';

interface EmployeeListProps {
  employees: Profile[];
  summaries: Record<string, DaySummary>;
  onRequestToggle: (employee: Profile) => void;
  onRequestResetPin?: (employee: Profile) => void;
}

export function EmployeeList({ employees, summaries, onRequestToggle, onRequestResetPin }: EmployeeListProps) {
  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <UserRound className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="font-medium text-slate-900 dark:text-slate-100">No employees yet</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add your first team member to get started.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {employees.map((employee) => {
        const summary = summaries[employee.id];
        return (
          <li
            key={employee.id}
            className="flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 md:flex-row md:items-center md:justify-between dark:hover:bg-slate-800/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800 dark:bg-brand-900/60 dark:text-brand-200">
                {initials(employee.full_name)}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-medium text-slate-900 dark:text-slate-100">
                  {employee.full_name}
                  {!employee.is_active && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Inactive
                    </span>
                  )}
                </p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">{employee.email}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Joined {formatDateIST(employee.created_at)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2.5 md:justify-end">
              {summary && <ProgressSummary summary={summary} />}
              {onRequestResetPin && (
                <Button
                  variant="ghost"
                  onClick={() => onRequestResetPin(employee)}
                  className="!px-2.5 !py-2 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  title="Reset Feedback PIN"
                >
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Reset PIN</span>
                </Button>
              )}
              <Button
                variant={employee.is_active ? 'danger' : 'secondary'}
                onClick={() => onRequestToggle(employee)}
                className="!px-3 !py-2 text-xs"
              >
                {employee.is_active ? (
                  <>
                    <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Reactivate
                  </>
                )}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ProgressSummary({ summary }: { summary: DaySummary }) {
  const percent = summary.total === 0 ? 0 : Math.round((summary.done / summary.total) * 100);
  return (
    <div className="flex min-w-[152px] flex-col items-start gap-1.5 md:items-end">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
          {summary.done}/{summary.total} done
        </span>
        <ChipBadge chip={summary.chip} />
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 md:w-36 dark:bg-slate-800">
        <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

const CHIP_STYLES: Record<DayChip, { label: string; className: string }> = {
  on_track: {
    label: 'On track',
    className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  },
  late: {
    label: 'Late',
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  },
  all_done: {
    label: 'All done',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  no_tasks: {
    label: 'No tasks',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
};

function ChipBadge({ chip }: { chip: DayChip }) {
  const style = CHIP_STYLES[chip];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}>{style.label}</span>
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
