import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Hourglass, MoonStar, ShieldCheck } from 'lucide-react';
import { Alert, Button, Modal, Spinner } from '@/components/ui';
import { formatDateIST, formatDeadlineIST, todayISTDate } from '@/lib/formatDate';
import { closeDay, fetchAuditTasksForCloseDay, rollOverTasks, type CloseDayAuditTask } from '@/lib/taskApi';

interface CloseDayModalProps {
  day: string;
  openCount: number;
  onClose: () => void;
  onFinished: () => void;
}

type Step = 'confirm' | 'rollover' | 'done';

export function CloseDayModal({ day, onClose, onFinished }: CloseDayModalProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [selectedDay, setSelectedDay] = useState(day);
  const [auditTasks, setAuditTasks] = useState<CloseDayAuditTask[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [missedCount, setMissedCount] = useState(0);
  const [copiedCount, setCopiedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load audit tasks whenever selectedDay changes
  useEffect(() => {
    let cancelled = false;
    setLoadingAudit(true);
    fetchAuditTasksForCloseDay(selectedDay)
      .then((data) => {
        if (!cancelled) {
          setAuditTasks(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not check tasks for this day.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAudit(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDay]);

  const now = Date.now();
  // Filter into categories:
  // 1. Will be marked missed: assigned or rejected, and deadline already passed
  const willBeMissed = auditTasks.filter(
    (t) => t.status !== 'done_pending' && new Date(t.deadline).getTime() <= now,
  );
  // 2. Staying open: future deadline
  const willStayOpenFuture = auditTasks.filter(
    (t) => t.status !== 'done_pending' && new Date(t.deadline).getTime() > now,
  );
  // 3. Staying open: waiting for confirmation
  const willStayOpenWaiting = auditTasks.filter((t) => t.status === 'done_pending');

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    void run(async () => {
      const count = await closeDay(selectedDay);
      setMissedCount(count);
      setStep('rollover');
      onFinished();
    });
  };

  const handleRollOver = () => {
    void run(async () => {
      const count = await rollOverTasks(selectedDay);
      setCopiedCount(count);
      setStep('done');
      onFinished();
    });
  };

  const dismiss = () => {
    if (!busy) onClose();
  };

  if (step === 'confirm') {
    return (
      <Modal
        title="Close the day"
        description="Review tasks before closing. Only open tasks with passed deadlines will be marked as missed. Tasks with future deadlines remain open."
        onClose={dismiss}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {error && <Alert tone="error">{error}</Alert>}

          {/* Date Selector */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/60 bg-white/60 p-3 dark:border-white/10 dark:bg-slate-900/60">
            <label htmlFor="close-day-date" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Target date:
            </label>
            <input
              id="close-day-date"
              type="date"
              value={selectedDay}
              max={todayISTDate()}
              onChange={(e) => setSelectedDay(e.target.value)}
              disabled={busy}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-[#ff4f7b] focus:outline-none dark:border-white/15 dark:bg-[#100e28] dark:text-slate-100"
            />
          </div>

          {loadingAudit && (
            <div className="py-8 text-center">
              <Spinner label="Checking open tasks" />
            </div>
          )}

          {!loadingAudit && (
            <>
              {/* Category 1: Will be marked missed */}
              <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <h3 className="text-xs font-bold">
                    Will be marked as missed ({willBeMissed.length})
                  </h3>
                </div>
                <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                  These tasks are still open and their deadline has passed:
                </p>

                {willBeMissed.length === 0 ? (
                  <p className="py-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    None. No tasks have passed their deadline.
                  </p>
                ) : (
                  <ul className="divide-y divide-rose-200/60 dark:divide-rose-900/40 text-xs">
                    {willBeMissed.map((t) => (
                      <li key={t.id} className="py-2 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {t.title}
                          </span>
                          <span className="shrink-0 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                            Due {formatDeadlineIST(t.deadline)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{t.client_name}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {t.assignee?.full_name ?? 'Assigned'}
                          </span>
                          {t.task_date < selectedDay && (
                            <>
                              <span>•</span>
                              <span className="text-amber-700 dark:text-amber-400">
                                Carried over from {formatDateIST(t.task_date)}
                              </span>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Category 2: Will stay open (future deadline or waiting confirmation) */}
              {(willStayOpenFuture.length > 0 || willStayOpenWaiting.length > 0) && (
                <div className="space-y-3 rounded-2xl border border-white/60 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-900/70">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <h3 className="text-xs font-bold">
                      Will stay open ({willStayOpenFuture.length + willStayOpenWaiting.length})
                    </h3>
                  </div>

                  {/* Future deadline tasks */}
                  {willStayOpenFuture.length > 0 && (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <Clock3 className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        Deadline in the future ({willStayOpenFuture.length}):
                      </p>
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {willStayOpenFuture.map((t) => (
                          <li key={t.id} className="py-1.5 flex items-center justify-between gap-2">
                            <span className="truncate text-slate-800 dark:text-slate-200">
                              {t.title} <span className="text-[11px] text-slate-400">({t.assignee?.full_name})</span>
                            </span>
                            <span className="shrink-0 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                              Due {formatDeadlineIST(t.deadline)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Waiting confirmation tasks */}
                  {willStayOpenWaiting.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                        Waiting for admin confirmation ({willStayOpenWaiting.length}):
                      </p>
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {willStayOpenWaiting.map((t) => (
                          <li key={t.id} className="py-1.5 flex items-center justify-between gap-2">
                            <span className="truncate text-slate-800 dark:text-slate-200">
                              {t.title} <span className="text-[11px] text-slate-400">({t.assignee?.full_name})</span>
                            </span>
                            <span className="shrink-0 text-[11px] text-amber-700 dark:text-amber-400">
                              Awaiting review
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={dismiss} disabled={busy}>
              Not yet
            </Button>
            <Button
              variant="danger"
              onClick={handleClose}
              loading={busy}
              disabled={loadingAudit}
            >
              <MoonStar className="h-4 w-4" aria-hidden="true" />
              {willBeMissed.length > 0
                ? `Mark ${willBeMissed.length} missed and close`
                : 'Close the day'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (step === 'rollover') {
    return (
      <Modal
        title="Roll over unfinished tasks?"
        description={
          missedCount === 0
            ? 'No tasks were marked missed today.'
            : `${missedCount} ${missedCount === 1 ? 'task was' : 'tasks were'} marked as missed.`
        }
        onClose={dismiss}
      >
        <div className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Copy them into tomorrow&apos;s plan so the employees see them again. The deadlines move forward by one day.
          </p>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setStep('done')} disabled={busy}>
              Not now
            </Button>
            <Button onClick={handleRollOver} loading={busy} disabled={missedCount === 0}>
              Roll over to tomorrow
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="The day is closed" onClose={dismiss}>
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            {copiedCount > 0
              ? `${copiedCount} ${copiedCount === 1 ? 'task has' : 'tasks have'} been copied to tomorrow.`
              : 'The day was closed successfully.'}
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
