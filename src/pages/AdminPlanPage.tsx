import { useState } from 'react';
import { ListChecks } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DeleteTaskModal } from '@/components/admin/plan/DeleteTaskModal';
import { EditTaskModal } from '@/components/admin/plan/EditTaskModal';
import { PlanTaskRow } from '@/components/admin/plan/PlanTaskRow';
import { TaskDraftForm } from '@/components/admin/plan/TaskDraftForm';
import { Alert, Spinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTasksForDay } from '@/hooks/useTasksForDay';
import { useTeamEmployees } from '@/hooks/useTeamEmployees';
import { todayIST, todayISTDate } from '@/lib/formatDate';
import { createTasks } from '@/lib/taskApi';
import type { TaskDraft, TaskWithRequests } from '@/types/database';

export function AdminPlanPage() {
  const { account } = useAuth();
  const today = todayISTDate();
  const { employees, loading: employeesLoading, error: employeesError } = useTeamEmployees();
  const activeEmployees = employees.filter((employee) => employee.is_active);
  const { tasks, loading: tasksLoading, error: tasksError, reload, setTasks } = useTasksForDay(today, true, true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<TaskWithRequests | null>(null);
  const [deleteTask, setDeleteTask] = useState<TaskWithRequests | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selected = activeEmployees.find((employee) => employee.id === selectedId) ?? null;
  const plannedTasks = selected
    ? tasks
        .filter((task) => task.assigned_to === selected.id)
        .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    : [];

  const handleAssign = async (drafts: TaskDraft[]) => {
    if (!selected || !account) return false;
    setSaveError(null);
    try {
      const created = await createTasks({
        assignedTo: selected.id,
        assignedBy: account.profile.id,
        taskDate: today,
        drafts,
      });

      // Show the new tasks immediately in local state
      if (created && created.length > 0) {
        setTasks((prev) => {
          const map = new Map<string, TaskWithRequests>();
          for (const t of created) map.set(t.id, t);
          for (const t of prev) if (!map.has(t.id)) map.set(t.id, t);
          return Array.from(map.values());
        });
      }

      await reload();
      return true;
    } catch (assignError) {
      setSaveError(assignError instanceof Error ? assignError.message : 'Something went wrong. Please try again.');
      return false;
    }
  };

  const loading = employeesLoading || tasksLoading;
  const pageError = employeesError ?? tasksError;

  return (
    <AdminLayout active="plan">
      <div className="space-y-8 animate-slide-up">
        <header>
          <p className="text-sm font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{todayIST()}</p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-4xl">
            Today&apos;s plan
          </h1>
          <p className="mt-2 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">Pick an employee, then add the tasks they own for today.</p>
        </header>

        {loading && <Spinner label="Loading today's plan" />}
        {!loading && pageError && <Alert tone="error">{pageError}</Alert>}

        {!loading && !pageError && (
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
                <TaskDraftForm
                  key={selected.id}
                  employeeName={selected.full_name}
                  day={today}
                  onSubmit={handleAssign}
                  error={saveError}
                />

                <section className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                      <ListChecks className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                      {selected.full_name}&apos;s tasks ({plannedTasks.length})
                    </h2>
                  </div>

                  {plannedTasks.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      No tasks planned yet for {selected.full_name}.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {plannedTasks.map((task) => (
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
            void reload();
          }}
        />
      )}

      {deleteTask && (
        <DeleteTaskModal
          task={deleteTask}
          onClose={() => setDeleteTask(null)}
          onDeleted={() => {
            setDeleteTask(null);
            void reload();
          }}
        />
      )}
    </AdminLayout>
  );
}
