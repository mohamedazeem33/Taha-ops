import { CheckCircle2, Clock3, Hourglass, MessageSquareWarning } from 'lucide-react';
import { DeadlineCountdown } from '@/components/employee/DeadlineCountdown';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { Button } from '@/components/ui';
import { formatDeadlineIST } from '@/lib/formatDate';
import { isOpenStatus, latestPendingRequest, latestRejectedRequest } from '@/lib/tasks';
import type { TaskWithRequests } from '@/types/database';

interface TaskCardProps {
  task: TaskWithRequests;
  now: number;
  busy: boolean;
  onDone: (task: TaskWithRequests) => void;
  onRequestTime: (task: TaskWithRequests) => void;
}

export function TaskCard({ task, now, busy, onDone, onRequestTime }: TaskCardProps) {
  const open = isOpenStatus(task.status);
  const pendingRequest = latestPendingRequest(task);
  const declinedRequest = latestRejectedRequest(task);
  const deadlineLabel = formatDeadlineIST(task.deadline, new Date(now));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
          {task.client_name}
        </span>
        <TaskStatusBadge status={task.status} />
      </div>

      <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{task.title}</h3>
      {task.description && (
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {task.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
          <Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
          Due {deadlineLabel} IST
        </span>
        {open && <DeadlineCountdown deadline={task.deadline} now={now} />}
      </div>

      {task.status === 'rejected' && task.rejection_reason && (
        <div className="mt-4 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">Admin&apos;s note:</span> {task.rejection_reason}
          </p>
        </div>
      )}

      {task.status === 'done_pending' && (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
          <Hourglass className="h-4 w-4" aria-hidden="true" />
          Waiting for admin confirmation
        </p>
      )}

      {task.status === 'completed' && (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Confirmed by admin
        </p>
      )}

      {pendingRequest && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Extension request sent. We&apos;ll let you know once the admin responds.
        </p>
      )}
      {!pendingRequest && declinedRequest && open && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">The admin declined your last extension request.</p>
      )}

      {open && (
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Button onClick={() => onDone(task)} loading={busy} className="w-full sm:w-auto">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Done
          </Button>
          {!pendingRequest && (
            <Button variant="secondary" onClick={() => onRequestTime(task)} disabled={busy} className="w-full sm:w-auto">
              Request more time
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
