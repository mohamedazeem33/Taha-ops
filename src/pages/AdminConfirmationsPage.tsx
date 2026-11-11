import { useEffect, useState } from 'react';
import { CheckCircle2, Inbox, Hourglass, XCircle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ReviewTaskModal } from '@/components/admin/ReviewTaskModal';
import { Alert, Button, Spinner } from '@/components/ui';
import { useTasksForDay } from '@/hooks/useTasksForDay';
import { todayIST, todayISTDate, formatTimeIST } from '@/lib/formatDate';
import { fetchTasksAwaitingConfirmation } from '@/lib/taskApi';
import type { Task } from '@/types/database';

type AwaitingTask = Task & { assignee: { full_name: string } | null };

export function AdminConfirmationsPage() {
  const today = todayISTDate();
  const { reload: reloadToday } = useTasksForDay(today);
  const [tasks, setTasks] = useState<AwaitingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{ task: Task; decision: 'confirm' | 'reject' } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    try {
      setTasks(await fetchTasksAwaitingConfirmation());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We couldn't load the queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleReviewed = async () => {
    setReviewing(null);
    setActionError(null);
    await Promise.all([load(), reloadToday()]);
  };

  return (
    <AdminLayout active="confirmations">
      <div className="space-y-8 animate-slide-up">
        <header>
          <p className="text-sm font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{todayIST()}</p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-4xl">
            Confirmation queue
          </h1>
          <p className="mt-2 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">Tasks the team has finished and sent for your review.</p>
        </header>

        {loading && <Spinner label="Loading the queue" />}
        {!loading && error && <Alert tone="error">{error}</Alert>}
        {actionError && <Alert tone="error">{actionError}</Alert>}

        {!loading && !error && tasks.length === 0 && (
          <section className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Inbox className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">All caught up</p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">No tasks are waiting for confirmation right now.</p>
          </section>
        )}

        {!loading && !error && tasks.length > 0 && (
          <ul className="space-y-4">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
                    {task.client_name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    <Hourglass className="h-3 w-3" aria-hidden="true" />
                    Waiting
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{task.title}</h3>
                {task.description && (
                  <p className="mt-1.5 whitespace-pre-line text-sm text-slate-600 dark:text-slate-400">
                    {task.description}
                  </p>
                )}
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  {task.assignee?.full_name ?? 'Employee'} · marked done{task.done_at ? ` at ${formatTimeIST(task.done_at)}` : ''}
                </p>
                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <Button onClick={() => setReviewing({ task, decision: 'confirm' })}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Confirm
                  </Button>
                  <Button variant="danger" onClick={() => setReviewing({ task, decision: 'reject' })}>
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {reviewing && (
        <ReviewTaskModal
          task={reviewing.task}
          decision={reviewing.decision}
          onClose={() => setReviewing(null)}
          onReviewed={() => void handleReviewed()}
        />
      )}
    </AdminLayout>
  );
}
