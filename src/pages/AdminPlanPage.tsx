import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock3, Filter, Hourglass, ListChecks, XCircle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DeleteTaskModal } from '@/components/admin/plan/DeleteTaskModal';
import { EditTaskModal } from '@/components/admin/plan/EditTaskModal';
import { PlanTaskRow } from '@/components/admin/plan/PlanTaskRow';
import { TaskDraftForm } from '@/components/admin/plan/TaskDraftForm';
import { Alert, Spinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useNow } from '@/hooks/useNow';
import { useTasksForDay } from '@/hooks/useTasksForDay';
import { useTeamEmployees } from '@/hooks/useTeamEmployees';
import { todayIST, todayISTDate, yesterdayISTDate } from '@/lib/formatDate';
import {
  createTasks,
  fetchEmployeePlanTasks,
  type PlanDateScope,
} from '@/lib/taskApi';
import type { TaskDraft, TaskWithRequests } from '@/types/database';

type StatusFilter = 'all' | 'open' | 'overdue' | 'waiting' | 'completed' | 'missed';

export function AdminPlanPage() {
  const { account } = useAuth();
  const today = todayISTDate();
  const now = useNow();
  const { employees, loading: employeesLoading, error: employeesError } = useTeamEmployees();
  const activeEmployees = employees.filter((employee) => employee.is_active);
  const { reload: reloadTodayTasks } = useTasksForDay(today, true, true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dateScope, setDateScope] = useState<PlanDateScope>('today');
  const [customDate, setCustomDate] = useState<string>(today);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [planTasks, setPlanTasks] = useState<TaskWithRequests[]>([]);
  const [hitCap, setHitCap] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskFetchError, setTaskFetchError] = useState<string | null>(null);

  const [editTask, setEditTask] = useState<TaskWithRequests | null>(null);
  const [deleteTask, setDeleteTask] = useState<TaskWithRequests | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pre-select employee from hash query param (e.g. #/admin/plan?employee=uuid)
  useEffect(() => {
    const parseEmployeeFromHash = () => {
      const match = window.location.hash.match(/[?&]employee=([^&]+)/);
      if (match && match[1]) {
        setSelectedId(decodeURIComponent(match[1]));
      }
    };
    parseEmployeeFromHash();
    window.addEventListener('hashchange', parseEmployeeFromHash);
    return () => window.removeEventListener('hashchange', parseEmployeeFromHash);
  }, []);

  const selected = activeEmployees.find((employee) => employee.id === selectedId) ?? null;

  // Load employee tasks whenever employee, dateScope, or customDate changes
  const loadTasks = useCallback(async () => {
    if (!selectedId) {
      setPlanTasks([]);
      setHitCap(false);
      return;
    }
    setLoadingTasks(true);
    setTaskFetchError(null);
    try {
      const res = await fetchEmployeePlanTasks(selectedId, dateScope, customDate);
      setPlanTasks(res.tasks);
      setHitCap(res.hitCap);
    } catch (err) {
      setTaskFetchError(err instanceof Error ? err.message : 'Failed to load employee tasks.');
    } finally {
      setLoadingTasks(false);
    }
  }, [selectedId, dateScope, customDate]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // Compute status counts across current dateScope tasks
  const counts = useMemo(() => {
    let open = 0;
    let overdue = 0;
    let waiting = 0;
    let completed = 0;
    let missed = 0;

    for (const t of planTasks) {
      if (t.status === 'completed') {
        completed++;
      } else if (t.status === 'done_pending') {
        waiting++;
      } else if (t.status === 'missed') {
        missed++;
      } else if (t.status === 'assigned' || t.status === 'rejected') {
        if (new Date(t.deadline).getTime() <= now) {
          overdue++;
        } else {
          open++;
        }
      }
    }

    return {
      all: planTasks.length,
      open,
      overdue,
      waiting,
      completed,
      missed,
    };
  }, [planTasks, now]);

  // Filter tasks by selected status chip and sort newest deadline first
  const displayedTasks = useMemo(() => {
    let filtered = planTasks;

    if (statusFilter === 'open') {
      filtered = filtered.filter(
        (t) => (t.status === 'assigned' || t.status === 'rejected') && new Date(t.deadline).getTime() > now,
      );
    } else if (statusFilter === 'overdue') {
      filtered = filtered.filter(
        (t) => (t.status === 'assigned' || t.status === 'rejected') && new Date(t.deadline).getTime() <= now,
      );
    } else if (statusFilter === 'waiting') {
      filtered = filtered.filter((t) => t.status === 'done_pending');
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter((t) => t.status === 'completed');
    } else if (statusFilter === 'missed') {
      filtered = filtered.filter((t) => t.status === 'missed');
    }

    return [...filtered].sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());
  }, [planTasks, statusFilter, now]);

  const handleAssign = async (drafts: TaskDraft[]) => {
    if (!selected || !account) return false;
    setSaveError(null);
    try {
      await createTasks({
        assignedTo: selected.id,
        assignedBy: account.profile.id,
        taskDate: today,
        drafts,
      });

      await Promise.all([loadTasks(), reloadTodayTasks()]);
      return true;
    } catch (assignError) {
      setSaveError(assignError instanceof Error ? assignError.message : 'Something went wrong. Please try again.');
      return false;
    }
  };

  const loading = employeesLoading;
  const pageError = employeesError ?? taskFetchError;

  return (
    <AdminLayout active="plan">
      <div className="space-y-8 animate-slide-up">
        <header>
          <p className="text-sm font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{todayIST()}</p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-4xl">
            Today&apos;s plan
          </h1>
          <p className="mt-2 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
            Pick an employee, review their tasks across dates, and plan new work.
          </p>
        </header>

        {loading && <Spinner label="Loading team members" />}
        {!loading && pageError && <Alert tone="error">{pageError}</Alert>}

        {!loading && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
              <label htmlFor="plan-employee" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Employee
              </label>
              <select
                id="plan-employee"
                value={selectedId ?? ''}
                onChange={(event) => {
                  setSelectedId(event.target.value || null);
                  setSaveError(null);
                }}
                className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Choose an employee</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
              </select>
              {activeEmployees.length === 0 && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  No active employees yet. Add one from the Overview page.
                </p>
              )}
            </section>

            {selected && (
              <>
                {/* Only show task assign draft form when planning for today */}
                {dateScope === 'today' && (
                  <TaskDraftForm
                    key={selected.id}
                    employeeName={selected.full_name}
                    day={today}
                    onSubmit={handleAssign}
                    error={saveError}
                  />
                )}

                <section className="space-y-5 rounded-2xl border border-white/60 bg-white/85 p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-slate-900/85 backdrop-blur-md">
                  {/* Date Controls */}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                        Date scope
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDateScope('today')}
                        className={`rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                          dateScope === 'today'
                            ? 'bg-brand-600 text-white font-semibold shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateScope('yesterday')}
                        className={`rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                          dateScope === 'yesterday'
                            ? 'bg-brand-600 text-white font-semibold shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        Yesterday
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDateScope('custom')}
                          className={`rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                            dateScope === 'custom'
                              ? 'bg-brand-600 text-white font-semibold shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
                        >
                          Pick date
                        </button>
                        {dateScope === 'custom' && (
                          <input
                            type="date"
                            value={customDate}
                            onChange={(e) => setCustomDate(e.target.value)}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDateScope('all_time')}
                        className={`rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                          dateScope === 'all_time'
                            ? 'bg-brand-600 text-white font-semibold shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        All time
                      </button>
                    </div>
                  </div>

                  {/* Status Filter Chips with Counts */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Filter status</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                          statusFilter === 'all'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        All ({counts.all})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('open')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                          statusFilter === 'open'
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300'
                        }`}
                      >
                        Open ({counts.open})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('overdue')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                          statusFilter === 'overdue'
                            ? 'bg-rose-600 text-white font-semibold'
                            : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                      >
                        Overdue ({counts.overdue})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('waiting')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                          statusFilter === 'waiting'
                            ? 'bg-amber-600 text-white font-semibold'
                            : 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        Waiting for confirmation ({counts.waiting})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('completed')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                          statusFilter === 'completed'
                            ? 'bg-emerald-600 text-white font-semibold'
                            : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}
                      >
                        Completed ({counts.completed})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('missed')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                          statusFilter === 'missed'
                            ? 'bg-slate-700 text-white font-semibold'
                            : 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        Missed ({counts.missed})
                      </button>
                    </div>
                  </div>

                  {/* Cap indicator if 500 tasks hit */}
                  {hitCap && (
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2 text-xs font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
                      Showing the latest 500 tasks
                    </div>
                  )}

                  {/* Task List Header */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                        <ListChecks className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {selected.full_name}&apos;s tasks ({displayedTasks.length})
                      </h3>
                    </div>
                  </div>

                  {loadingTasks ? (
                    <Spinner label="Loading tasks" />
                  ) : displayedTasks.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      No tasks matching this filter.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {displayedTasks.map((task) => (
                        <PlanTaskRow
                          key={task.id}
                          task={task}
                          onEdit={setEditTask}
                          onDelete={setDeleteTask}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>

      {editTask && (
        <EditTaskModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSaved={() => {
            setEditTask(null);
            void loadTasks();
            void reloadTodayTasks();
          }}
        />
      )}

      {deleteTask && (
        <DeleteTaskModal
          task={deleteTask}
          onClose={() => setDeleteTask(null)}
          onDeleted={() => {
            setDeleteTask(null);
            void loadTasks();
            void reloadTodayTasks();
          }}
        />
      )}
    </AdminLayout>
  );
}
