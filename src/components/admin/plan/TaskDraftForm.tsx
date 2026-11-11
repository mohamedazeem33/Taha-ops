import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TaskFields } from '@/components/admin/plan/TaskFields';
import { blankTaskValues, toTaskDraft, validateTaskValues, type TaskFormValues } from '@/components/admin/plan/taskForm';
import { Alert, Button } from '@/components/ui';
import type { TaskDraft } from '@/types/database';

interface TaskDraftFormProps {
  employeeName: string;
  day: string;
  onSubmit: (drafts: TaskDraft[]) => Promise<boolean>;
  error: string | null;
}

export function TaskDraftForm({ employeeName, day, onSubmit, error }: TaskDraftFormProps) {
  const [rows, setRows] = useState<TaskFormValues[]>(() => [blankTaskValues(day)]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (index: number, field: keyof TaskFormValues, value: string) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLocalError(null);
    for (let index = 0; index < rows.length; index += 1) {
      const problem = validateTaskValues(rows[index]);
      if (problem) {
        setLocalError(rows.length > 1 ? `Task ${index + 1}: ${problem}` : problem);
        return;
      }
    }

    setSubmitting(true);
    const saved = await onSubmit(rows.map(toTaskDraft));
    setSubmitting(false);
    if (saved) setRows([blankTaskValues(day)]);
  };

  const message = localError ?? error;

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Add tasks for {employeeName}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Deadlines default to 6:00 PM IST today. You can add several tasks at once.
        </p>
      </div>

      {message && <Alert tone="error">{message}</Alert>}

      <div className="space-y-5">
        {rows.map((row, index) => (
          <div
            key={index}
            className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Task {index + 1}</p>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-rose-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              )}
            </div>
            <TaskFields
              idPrefix={`draft-${index}`}
              values={row}
              disabled={submitting}
              onChange={(field, value) => updateRow(index, field, value)}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={() => setRows((current) => [...current, blankTaskValues(day)])} disabled={submitting}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add another task
        </Button>
        <Button onClick={() => void handleSubmit()} loading={submitting}>
          {rows.length === 1 ? 'Assign task' : `Assign ${rows.length} tasks`}
        </Button>
      </div>
    </section>
  );
}
