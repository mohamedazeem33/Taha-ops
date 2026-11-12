import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Edit3, Hourglass, ListTodo, UserRound } from 'lucide-react';
import { TaskStatusBadge } from '@/components/TaskStatusBadge';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { EditTaskModal } from '@/components/admin/plan/EditTaskModal';
import { ReviewTaskModal } from '@/components/admin/ReviewTaskModal';
import { Alert, Spinner } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { useTasksForDay } from '@/hooks/useTasksForDay';
import { useTeamEmployees } from '@/hooks/useTeamEmployees';
import { formatDeadlineIST, todayIST, todayISTDate } from '@/lib/formatDate';
import { isOpenStatus, isOverdue } from '@/lib/tasks';
import type { Task, TaskWithRequests } from '@/types/database';

export function AdminOverviewTasksPage() {
  const today = todayISTDate();
  const now = useNow();
  const { employees, loading: employeesLoading, error: employeesError } = useTeamEmployees();
  const { tasks, loading: tasksLoading, error: tasksError, reload: reloadTasks } = useTasksForDay(today, true, true);

  // Parse metric from URL hash (e.g. #/admin/overview-tasks?metric=late)
  const getMetricFromHash = (): 'planned' | 'done' | 'waiting' | 'late' => {
    const match = window.location.hash.match(/[?&]metric=([^&]+)/);
    const val = match ? decodeURIComponent(match[1]).toLowerCase() : 'planned';
    if (val === 'done' || val === 'waiting' || val === 'late') return val;
    return 'planned';
  };

  const metric = getMetricFromHash();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<TaskWithRequests | null>(null);

  const metricConfig = {
    planned: {
      title: 'Planned tasks',
      subtitle: "All of today's tasks plus open tasks carried over from earlier days",
      icon: ListTodo,
      tone: 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-900/50',
    },
    done: {
      title: 'Completed tasks',
      subtitle: 'Tasks that have been confirmed and completed',
      icon: CheckCircle2,
      tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60',
    },
    waiting: {
      title: 'Awaiting review',
      subtitle: 'Tasks finished by team members awaiting your confirmation',
      icon: Hourglass,
      tone: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/60',
    },
    late: {
      title: 'Late tasks',
      subtitle: 'Open tasks whose deadline has already passed',
      icon: Clock3,
      tone: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/60',
    },
  }[metric];

  // Filter tasks based on metric
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (metric === 'planned') return true;
      if (metric === 'done') return t.status === 'completed';
      if (metric === 'waiting') return t.status === 'done_pending';
      if (metric === 'late') return isOverdue(t, now);
      return true;
    });
  }, [tasks, metric, now]);

  // Group filtered tasks by employee
  const groupedByEmployee = useMemo(() => {
    const map = new Map<string, TaskWithRequests[]>();
    for (const t of filteredTasks) {
      if (selectedEmployeeId !== 'all' && t.assigned_to !== selectedEmployeeId) continue;
      const list = map.get(t.assigned_to) ?? [];
      list.push(t);
      map.set(t.assigned_to, list);
    }
    return map;
  }, [filteredTasks, selectedEmployeeId]);

  const loading = employeesLoading || tasksLoading;
  const pageError = employeesError ?? tasksError;

  return (
    <AdminLayout active="home">
      <div className="space-y-8 animate-slide-up">
        {/* Back Link & Header */}
        <header className="space-y-3">
          <a
            href="#/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to overview
          </a>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
            <div>
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${metricConfig.tone}`}>
                  <metricConfig.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-4xl">
                  {metricConfig.title} ({filteredTasks.length})
                </h1>
              </div>
              <p className="mt-2 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
                {metricConfig.subtitle} · {todayIST()}
              </p>
            </div>

            {/* Filter by employee */}
            <div className="flex items-center gap-2">
              <label htmlFor="overview-employee-filter" className="text-xs font-semibold text-white/90 whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                Employee:
              </label>
              <select
                id="overview-employee-filter"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="rounded-xl border border-white/60 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-900 shadow-sm transition backdrop-blur-md focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-100 cursor-pointer"
              >
                <option value="all">All employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {loading && <Spinner label="Loading tasks" />}
        {!loading && pageError && <Alert tone="error">{pageError}</Alert>}

        {!loading && !pageError && (
          <div className="space-y-6">
            {groupedByEmployee.size === 0 ? (
              <section className="flex min-h-[240px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/40 bg-white/80 px-6 py-12 text-center backdrop-blur-md dark:border-white/10 dark:bg-slate-900/80">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">No {metricConfig.title.toLowerCase()}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Everything is clear for this filter.</p>
              </section>
            ) : (
              Array.from(groupedByEmployee.entries()).map(([employeeId, empTasks]) => {
                const emp = employees.find((e) => e.id === employeeId);
                const empName = emp?.full_name ?? 'Team Member';
                return (
                  <section
                    key={employeeId}
                    className="overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/85"
                  >
                    {/* Employee Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800 dark:bg-brand-900/60 dark:text-brand-200">
                          {empName.slice(0, 2).toUpperCase()}
                        </span>
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                          {empName}
                        </h2>
                      </div>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {empTasks.length} {empTasks.length === 1 ? 'task' : 'tasks'}
                      </span>
                    </div>

                    {/* Task Rows */}
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                      {empTasks
                        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                        .map((task) => {
                          const isWaiting = task.status === 'done_pending';
                          const canEdit = isOpenStatus(task.status) || task.status === 'missed';

                          return (
                            <li
                              key={task.id}
                              className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-800/30"
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
                                    {task.client_name}
                                  </span>
                                  <TaskStatusBadge status={task.status} />
                                </div>
                                <p className="truncate font-medium text-slate-900 dark:text-slate-100 text-sm">
                                  {task.title}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Due {formatDeadlineIST(task.deadline)} IST
                                </p>
                              </div>

                              {/* Row Action Buttons */}
                              <div className="flex shrink-0 items-center gap-2">
                                {isWaiting && (
                                  <button
                                    type="button"
                                    onClick={() => setReviewingTask(task)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-500 active:scale-95 cursor-pointer"
                                  >
                                    <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                                    Review
                                  </button>
                                )}

                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingTask(task)}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                    Edit
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  </section>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewingTask && (
        <ReviewTaskModal
          task={reviewingTask}
          decision="confirm"
          onClose={() => setReviewingTask(null)}
          onReviewed={() => {
            setReviewingTask(null);
            void reloadTasks();
          }}
        />
      )}

      {/* Edit Modal (including Transfer option) */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={() => {
            setEditingTask(null);
            void reloadTasks();
          }}
        />
      )}
    </AdminLayout>
  );
}

