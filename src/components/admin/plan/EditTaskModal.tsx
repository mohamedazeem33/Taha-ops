import { useState, type FormEvent } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Alert, Button, Modal } from '@/components/ui';
import { TaskFields } from '@/components/admin/plan/TaskFields';
import {
  toTaskDraft,
  validateTaskValues,
  type TaskFormValues,
} from '@/components/admin/plan/taskForm';
import { useTeamEmployees } from '@/hooks/useTeamEmployees';
import { isoToIstInput } from '@/lib/formatDate';
import { transferTask, updateTask } from '@/lib/taskApi';
import type { TaskWithRequests } from '@/types/database';

interface EditTaskModalProps {
  task: TaskWithRequests;
  onClose: () => void;
  onSaved: () => void;
}

export function EditTaskModal({ task, onClose, onSaved }: EditTaskModalProps) {
  const { employees } = useTeamEmployees();
  const [values, setValues] = useState<TaskFormValues>(() => ({
    client_name: task.client_name,
    title: task.title,
    description: task.description,
    deadline: isoToIstInput(task.deadline),
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transfer state
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const activeEmployees = employees.filter(
    (e) => e.is_active && e.id !== task.assigned_to,
  );
  const currentAssignee = employees.find((e) => e.id === task.assigned_to)?.full_name ?? 'current assignee';
  const targetEmployee = employees.find((e) => e.id === transferTargetId)?.full_name ?? '';

  const canTransfer = task.status === 'assigned' || task.status === 'rejected';
  const isDonePending = task.status === 'done_pending';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const problem = validateTaskValues(values);
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    try {
      await updateTask(task.id, toTaskDraft(values));
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!transferTargetId) return;
    setTransferSubmitting(true);
    setTransferError(null);
    try {
      await transferTask(task.id, transferTargetId);
      setShowTransferConfirm(false);
      onSaved();
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Failed to transfer task.');
      setTransferSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        title="Edit task"
        description={`${task.client_name} · ${task.title}`}
        onClose={() => {
          if (!submitting && !transferSubmitting) onClose();
        }}
      >
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && <Alert tone="error">{error}</Alert>}
            <TaskFields
              idPrefix="edit-task"
              values={values}
              disabled={submitting || transferSubmitting}
              onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
            />
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting || transferSubmitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={transferSubmitting}>
                Save changes
              </Button>
            </div>
          </form>

          {/* Transfer to another employee section */}
          {canTransfer && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4.5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                  <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Transfer to another employee
                </h3>
              </div>

              {transferError && <div className="mb-3"><Alert tone="error">{transferError}</Alert></div>}

              <div className="space-y-3">
                <div>
                  <label htmlFor="transfer-recipient" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Select team member
                  </label>
                  <select
                    id="transfer-recipient"
                    value={transferTargetId}
                    onChange={(e) => setTransferTargetId(e.target.value)}
                    disabled={submitting || transferSubmitting}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">Choose an employee</option>
                    {activeEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!transferTargetId || submitting || transferSubmitting}
                    onClick={() => setShowTransferConfirm(true)}
                  >
                    Transfer task
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isDonePending && (
            <Alert tone="info">
              Reject this task first, then transfer it.
            </Alert>
          )}
        </div>
      </Modal>

      {/* Confirmation Dialog */}
      {showTransferConfirm && (
        <Modal
          title="Confirm transfer"
          description={`Move this task from ${currentAssignee} to ${targetEmployee}?`}
          onClose={() => {
            if (!transferSubmitting) setShowTransferConfirm(false);
          }}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              The task will be reassigned immediately. Any pending time extension requests on it will be automatically cancelled.
            </p>
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={transferSubmitting}
                onClick={() => setShowTransferConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                loading={transferSubmitting}
                onClick={handleExecuteTransfer}
              >
                Confirm transfer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
