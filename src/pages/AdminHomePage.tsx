import { useMemo, useState } from 'react';
import { CalendarDays, MoonStar, Plus, Users } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AddEmployeeModal } from '@/components/admin/AddEmployeeModal';
import { CloseDayModal } from '@/components/admin/CloseDayModal';
import { EmployeeList } from '@/components/admin/EmployeeList';
import { TodaySummary } from '@/components/admin/TodaySummary';
import { Alert, Button, Modal, Spinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTasksForDay } from '@/hooks/useTasksForDay';
import { useTeamEmployees } from '@/hooks/useTeamEmployees';
import { useNow } from '@/hooks/useNow';
import { greetingIST, todayIST, todayISTDate } from '@/lib/formatDate';
import { callEdgeFunction } from '@/lib/edgeFunctions';
import { isOpenStatus, summarizeDay, type DaySummary } from '@/lib/tasks';
import type { Profile, Task } from '@/types/database';

export function AdminHomePage() {
  const { account } = useAuth();
  const today = todayISTDate();
  const now = useNow(30_000);
  const { employees, loading: employeesLoading, error: employeesError, reload: reloadEmployees } = useTeamEmployees();
  const { tasks, loading: tasksLoading, error: tasksError, reload: reloadTasks } = useTasksForDay(today);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCloseDay, setShowCloseDay] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<Profile | null>(null);
  const [toggling, setToggling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const firstName = account?.profile.full_name.split(' ')[0] ?? '';
  const loading = employeesLoading || tasksLoading;

  const { summaries, overall } = useMemo(() => {
    const byEmployee: Record<string, DaySummary> = {};
    const grouped = new Map<string, Task[]>();
    for (const task of tasks) {
      grouped.set(task.assigned_to, [...(grouped.get(task.assigned_to) ?? []), task]);
    }
    for (const employee of employees) {
      byEmployee[employee.id] = summarizeDay(grouped.get(employee.id) ?? [], now);
    }
    return { summaries: byEmployee, overall: summarizeDay(tasks, now) };
  }, [employees, tasks, now]);

  const openCount = tasks.filter((task) => isOpenStatus(task.status)).length;
  const isDeactivating = pendingToggle?.is_active === true;

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return;
    setToggling(true);
    setActionError(null);
    try {
      await callEdgeFunction('manage-employee', {
        action: 'set_active',
        user_id: pendingToggle.id,
        is_active: !pendingToggle.is_active,
      });
      setPendingToggle(null);
      await reloadEmployees();
    } catch (toggleError) {
      setActionError(toggleError instanceof Error ? toggleError.message : 'Something went wrong. Please try again.');
    } finally {
      setToggling(false);
    }
  };

  const handleCreated = async () => {
    setShowAddModal(false);
    await reloadEmployees();
  };

  const pageError = employeesError ?? tasksError;

  return (
    <AdminLayout active="home">
      <div className="space-y-8 animate-slide-up">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300">
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {todayIST()} (IST)
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
              {greetingIST()}, {firstName}
            </h1>
          </div>
          <Button variant="secondary" onClick={() => setShowCloseDay(true)} disabled={loading} className="w-full sm:w-auto">
            <MoonStar className="h-4 w-4" aria-hidden="true" />
            Close the day
          </Button>
        </header>

        {loading && <Spinner label="Loading today's overview" />}

        {!loading && pageError && <Alert tone="error">{pageError}</Alert>}

        {!loading && !pageError && (
          <>
            <TodaySummary summary={overall} />

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">Team</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {employees.length} {employees.length === 1 ? 'employee' : 'employees'} today
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add employee
                </Button>
              </div>

              {actionError && (
                <div className="px-5 pt-4">
                  <Alert tone="error">{actionError}</Alert>
                </div>
              )}

              <EmployeeList employees={employees} summaries={summaries} onRequestToggle={setPendingToggle} />
            </section>
          </>
        )}
      </div>

      {showAddModal && (
        <AddEmployeeModal onClose={() => setShowAddModal(false)} onCreated={() => void handleCreated()} />
      )}

      {showCloseDay && (
        <CloseDayModal
          day={today}
          openCount={openCount}
          onClose={() => setShowCloseDay(false)}
          onFinished={() => void reloadTasks()}
        />
      )}

      {pendingToggle && (
        <Modal
          title={isDeactivating ? `Deactivate ${pendingToggle.full_name}?` : `Reactivate ${pendingToggle.full_name}?`}
          description={
            isDeactivating
              ? "They won't be able to sign in until you reactivate them."
              : 'They will be able to sign in again with their existing password.'
          }
          onClose={() => {
            if (!toggling) setPendingToggle(null);
          }}
        >
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setPendingToggle(null)} disabled={toggling}>
              Cancel
            </Button>
            <Button variant={isDeactivating ? 'danger' : 'primary'} loading={toggling} onClick={() => void handleConfirmToggle()}>
              {isDeactivating ? 'Deactivate' : 'Reactivate'}
            </Button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
