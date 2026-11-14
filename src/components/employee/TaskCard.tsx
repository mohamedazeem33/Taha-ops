import { AlertCircle, CheckCircle2, Clock3, Hourglass, MessageSquareWarning } from 'lucide-react';
import { DeadlineCountdown } from '@/components/employee/DeadlineCountdown';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { TaskSubmissionInfo } from '@/components/TaskSubmissionInfo';
import { Button } from '@/components/ui';
import { formatDateIST, formatDeadlineIST, todayISTDate } from '@/lib/formatDate';
import { isOpenStatus, isOverdue, latestPendingRequest, latestRejectedRequest } from '@/lib/tasks';
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
  const overdue = isOverdue(task, now);
  const isCarriedOver = task.task_date < todayISTDate();
  const pendingRequest = latestPendingRequest(task);
  const declinedRequest = latestRejectedRequest(task);
  const deadlineLabel = formatDeadlineIST(task.deadline, new Date(now));

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:shadow-md sm:p-6 ${
        overdue
          ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400/40 dark:border-rose-700/80 dark:bg-rose-950/20'
          : 'border-white/60 bg-white dark:border-white/10 dark:bg-slate-900'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
            {task.client_name}
          </span>
          {isCarriedOver && (
            <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50/80 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/50 dark:text-amber-300">
              Carried over from {formatDateIST(task.task_date)}
            </span>
          )}
          {overdue && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100/80 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              Overdue
            </span>
          )}
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{task.title}</h3>
      {task.description && (
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {task.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span
          className={`inline-flex items-center gap-1.5 text-sm ${
            overdue ? 'font-medium text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <Clock3 className={`h-4 w-4 ${overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} aria-hidden="true" />
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
        <div className="mt-4 space-y-2.5">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
            <Hourglass className="h-4 w-4" aria-hidden="true" />
            Waiting for admin confirmation
          </p>
          <TaskSubmissionInfo link={task.submission_link} note={task.submission_note} />
        </div>
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
          <Button
            onClick={() => onDone(task)}
            loading={busy}
            className="w-full sm:w-auto"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Mark done
          </Button>
          {!pendingRequest && (
            <Button
              variant="secondary"
              onClick={() => onRequestTime(task)}
              disabled={busy}
              className="w-full sm:w-auto"
            >
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              Ask for more time
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
