import { useState } from 'react';
import { CheckCircle2, MoonStar } from 'lucide-react';
import { Alert, Button, Modal } from '@/components/ui';
import { closeDay, rollOverTasks } from '@/lib/taskApi';

interface CloseDayModalProps {
  day: string;
  openCount: number;
  onClose: () => void;
  onFinished: () => void;
}

type Step = 'confirm' | 'rollover' | 'done';

export function CloseDayModal({ day, openCount, onClose, onFinished }: CloseDayModalProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [missedCount, setMissedCount] = useState(0);
  const [copiedCount, setCopiedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const count = await closeDay(day);
      setMissedCount(count);
      setStep('rollover');
      onFinished();
    });
  };

  const handleRollOver = () => {
    void run(async () => {
      const count = await rollOverTasks(day);
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
        title="Close the day?"
        description="Tasks that are still open will be marked as missed. Tasks waiting for confirmation are left alone."
        onClose={dismiss}
      >
        <div className="space-y-5">
          {error && <Alert tone="error">{error}</Alert>}
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {openCount === 0
              ? 'There are no open tasks left for today.'
              : `${openCount} ${openCount === 1 ? 'task is' : 'tasks are'} still open.`}
          </p>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={dismiss} disabled={busy}>
              Not yet
            </Button>
            <Button variant="danger" onClick={handleClose} loading={busy}>
              <MoonStar className="h-4 w-4" aria-hidden="true" />
              Close the day
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
            ? 'Nothing was left open today.'
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
              : 'Nothing was copied to tomorrow.'}
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
