import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Sparkles } from 'lucide-react';
import { Confetti } from '@/components/Confetti';
import { Toast, type ToastMessage } from '@/components/Toast';
import { EmployeeLayout } from '@/components/employee/EmployeeLayout';
import { RequestTimeModal } from '@/components/employee/RequestTimeModal';
import { StatsTopBar } from '@/components/employee/StatsTopBar';
import { TaskCard } from '@/components/employee/TaskCard';
import { Alert, Spinner } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useGamificationStats } from '@/hooks/useGamificationStats';
import { useTasksForDay } from '@/hooks/useTasksForDay';
import { useNow } from '@/hooks/useNow';
import { greetingIST, todayIST, todayISTDate } from '@/lib/formatDate';
import { markTaskDone } from '@/lib/taskApi';
import { isDoneStatus } from '@/lib/tasks';
import type { PointsLogEntry, TaskWithRequests } from '@/types/database';

export function TodayPage() {
  const { account } = useAuth();
  const today = todayISTDate();
  const { tasks, loading, error, reload } = useTasksForDay(today, true);
  const now = useNow();
  const { totalPoints, streak, pointsLog, loading: statsLoading, reload: reloadStats } = useGamificationStats(true);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [requestTask, setRequestTask] = useState<TaskWithRequests | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const prevLogRef = useRef<PointsLogEntry[]>([]);
  const prevAllDoneRef = useRef(false);

  const firstName = account?.profile.full_name.split(' ')[0] ?? '';
  const doneCount = tasks.filter((task) => isDoneStatus(task.status)).length;
  const allDone = tasks.length > 0 && doneCount === tasks.length;

  const handleDone = async (task: TaskWithRequests) => {
    setBusyTaskId(task.id);
    setActionError(null);
    try {
      await markTaskDone(task.id);
      await reload();
    } catch (doneError) {
      setActionError(doneError instanceof Error ? doneError.message : 'Something went wrong. Please try again.');
    } finally {
      setBusyTaskId(null);
    }
  };

  useEffect(() => {
    if (statsLoading) return;
    const prev = prevLogRef.current;
    if (prev.length > 0 && pointsLog.length > prev.length) {
      const newest = pointsLog[0];
      if (newest && newest.points > 0) {
        setToast({ id: Date.now(), text: `+${newest.points} points — ${newest.reason}`, tone: 'points' });
      }
    }
    prevLogRef.current = pointsLog;
  }, [pointsLog, statsLoading]);

  useEffect(() => {
    if (allDone && !prevAllDoneRef.current) {
      setShowConfetti(true);
      void reloadStats();
    }
    prevAllDoneRef.current = allDone;
  }, [allDone, reloadStats]);

  return (
    <EmployeeLayout active="today">
      <div className="space-y-6 animate-slide-up">
        <header>
          <p className="flex items-center gap-2 text-sm font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {todayIST()}
          </p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-4xl">
            {greetingIST()}, {firstName}
          </h1>
        </header>

        {loading && <Spinner label="Loading your tasks" />}

        {!loading && error && <Alert tone="error">{error}</Alert>}

        {!loading && !error && (
          <>
            {tasks.length > 0 && (
              <StatsTopBar
                totalPoints={totalPoints}
                currentStreak={streak?.current_streak ?? 0}
                doneCount={doneCount}
                totalTasks={tasks.length}
              />
            )}

            {actionError && <Alert tone="error">{actionError}</Alert>}

            {tasks.length === 0 ? (
              <section className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
                <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">
                  <Sparkles className="h-8 w-8" aria-hidden="true" />
                </span>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">No tasks yet today.</p>
                <p className="mt-2 text-slate-500 dark:text-slate-400">Check after the morning meeting.</p>
              </section>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    now={now}
                    busy={busyTaskId === task.id}
                    onDone={(item) => void handleDone(item)}
                    onRequestTime={setRequestTask}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Confetti show={showConfetti} onDone={() => setShowConfetti(false)} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {requestTask && account && (
        <RequestTimeModal
          task={requestTask}
          employeeId={account.profile.id}
          onClose={() => setRequestTask(null)}
          onSaved={() => {
            setRequestTask(null);
            void reload();
          }}
        />
      )}
    </EmployeeLayout>
  );
}
