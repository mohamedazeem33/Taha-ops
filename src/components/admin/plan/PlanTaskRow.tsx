import { CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskSubmissionLinkIcon } from '@/components/TaskSubmissionInfo';
import { formatDateIST, formatDeadlineIST, todayISTDate } from '@/lib/formatDate';
import { isOpenStatus } from '@/lib/tasks';
import type { TaskWithRequests } from '@/types/database';

interface PlanTaskRowProps {
  task: TaskWithRequests;
  onEdit: (task: TaskWithRequests) => void;
  onDelete: (task: TaskWithRequests) => void;
}

export function PlanTaskRow({ task, onEdit, onDelete }: PlanTaskRowProps) {
  const canChange = task.status !== 'completed';
  const isCarriedOver = task.task_date < todayISTDate();

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-white/60 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-slate-900">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
            {task.client_name}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatDateIST(task.task_date)}
          </span>
          {isCarriedOver && (
            <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/80 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/50 dark:text-amber-300">
              Carried over
            </span>
          )}
          <TaskStatusBadge status={task.status} />
          {task.submission_link && <TaskSubmissionLinkIcon link={task.submission_link} />}
        </div>
        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{task.title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Due {formatDeadlineIST(task.deadline)} IST</p>
      </div>

      {canChange ? (
        <div className="flex shrink-0 items-center gap-2">
          {isOpenStatus(task.status) || task.status === 'missed' ? (
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(task)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </button>
        </div>
      ) : (
        <p className="flex shrink-0 items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Kept for the record
        </p>
      )}
    </li>
  );
}
