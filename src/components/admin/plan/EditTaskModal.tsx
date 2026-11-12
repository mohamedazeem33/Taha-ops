import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRightLeft, ChevronDown, X } from 'lucide-react';
import { Alert, Button } from '@/components/ui';
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
  onSaved: (toastMessage?: string) => void;
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
  const [transferExpanded, setTransferExpanded] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string>('');
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const transferSectionRef = useRef<HTMLDivElement>(null);

  const activeEmployees = employees.filter(
    (e) => e.is_active && e.id !== task.assigned_to,
  );
  const currentAssignee = employees.find((e) => e.id === task.assigned_to)?.full_name ?? 'this employee';
  const targetEmployee = employees.find((e) => e.id === transferTargetId)?.full_name ?? '';

  const canTransfer = task.status === 'assigned' || task.status === 'rejected';
  const isDonePending = task.status === 'done_pending';

  // Prevent background page from scrolling while Edit dialog is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle Escape key to close the main Edit dialog when confirmation is not open
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !showTransferConfirm && !submitting && !transferSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTransferConfirm, submitting, transferSubmitting, onClose]);

  // Focus Cancel button when transfer confirmation popup opens
  useEffect(() => {
    if (showTransferConfirm) {
      const timer = setTimeout(() => {
        document.getElementById('transfer-cancel-btn')?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showTransferConfirm]);

  // Handle Escape key to cancel transfer confirmation popup
  useEffect(() => {
    if (!showTransferConfirm) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !transferSubmitting) {
        event.stopPropagation();
        setShowTransferConfirm(false);
        setTransferError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTransferConfirm, transferSubmitting]);

  const handleToggleTransfer = () => {
    const next = !transferExpanded;
    setTransferExpanded(next);
    if (next) {
      setTimeout(() => {
        transferSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  };

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
      onSaved(`Task moved to ${targetEmployee}`);
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : 'Failed to transfer task.');
      setTransferSubmitting(false);
    }
  };

  return (
    <>
      {/* Dialog Backdrop Overlay */}
      <div
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting && !transferSubmitting) {
            onClose();
          }
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
      >
        {/* Dialog Card: Max-height 90vh/90dvh, flex column, overflow-hidden */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-task-modal-title"
          onClick={(e) => e.stopPropagation()}
          className="flex w-full max-w-lg max-h-[90vh] max-h-[90dvh] flex-col rounded-3xl border border-white/50 bg-white/95 shadow-2xl backdrop-blur-xl animate-slide-up dark:border-white/10 dark:bg-[#100e28]/95 overflow-hidden"
        >
          {/* Fixed Sticky Header at Top */}
          <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-5 py-4 dark:border-slate-800/80 dark:bg-[#100e28]/95 backdrop-blur-md shrink-0 sm:px-6">
            <div className="min-w-0">
              <h2
                id="edit-task-modal-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                Edit task
              </h2>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {task.client_name} · {task.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!submitting && !transferSubmitting) onClose();
              }}
              aria-label="Close"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer shrink-0"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          {/* Form wrapping Scrollable Body and Fixed Footer */}
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 overflow-hidden" noValidate>
            {/* Scrollable Body: only this area scrolls */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 min-h-0 sm:px-6">
              {error && <Alert tone="error">{error}</Alert>}

              <TaskFields
                idPrefix="edit-task"
                values={values}
                disabled={submitting || transferSubmitting}
                onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
              />

              {/* Transfer Section: ABOVE the footer */}
              {canTransfer && (
                <div
                  ref={transferSectionRef}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-900/60 transition-all overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={handleToggleTransfer}
                    aria-expanded={transferExpanded}
                    className="flex w-full items-center justify-between p-3.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-100/60 dark:text-slate-200 dark:hover:bg-slate-800/40 rounded-2xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                        <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span>Transfer to another employee</span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                        transferExpanded ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {transferExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-slate-200/60 dark:border-slate-800/60 animate-fade-in">
                      <div>
                        <label
                          htmlFor="transfer-recipient"
                          className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                        >
                          Select team member
                        </label>
                        <select
                          id="transfer-recipient"
                          value={transferTargetId}
                          onChange={(e) => {
                            setTransferTargetId(e.target.value);
                            setTransferError(null);
                          }}
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
                          size="sm"
                          disabled={!transferTargetId || submitting || transferSubmitting}
                          onClick={() => {
                            setTransferError(null);
                            setShowTransferConfirm(true);
                          }}
                        >
                          Transfer task
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isDonePending && (
                <Alert tone="info">
                  Reject this task first, then transfer it.
                </Alert>
              )}
            </div>

            {/* Fixed Sticky Footer at Bottom */}
            <footer className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 border-t border-slate-200/80 bg-slate-50/90 px-5 py-3.5 sm:flex-row sm:justify-end dark:border-slate-800/80 dark:bg-slate-900/90 backdrop-blur-md shrink-0 sm:px-6">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting || transferSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={transferSubmitting}
              >
                Save changes
              </Button>
            </footer>
          </form>
        </div>
      </div>

      {/* Centered Confirmation Popup on top of everything */}
      {showTransferConfirm && (
        <div
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !transferSubmitting) {
              setShowTransferConfirm(false);
              setTransferError(null);
            }
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-confirm-heading"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-[360px] sm:max-w-md max-h-[90vh] max-h-[90dvh] flex-col rounded-3xl border border-white/50 bg-white/95 p-5 sm:p-6 shadow-2xl backdrop-blur-xl animate-slide-up dark:border-white/10 dark:bg-[#100e28]/95 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 sm:space-y-4 pr-0.5">
              <h2
                id="transfer-confirm-heading"
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                Transfer this task?
              </h2>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Move &ldquo;{task.title}&rdquo; from{' '}
                <strong className="font-bold text-slate-900 dark:text-white">
                  {currentAssignee}
                </strong>{' '}
                to{' '}
                <strong className="font-bold text-slate-900 dark:text-white">
                  {targetEmployee}
                </strong>
                ?
              </p>

              {transferError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50/80 px-3.5 py-2 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
                  {transferError}
                </p>
              )}
            </div>

            {/* Buttons always visible at bottom of popup */}
            <div className="pt-3 sm:pt-4 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end shrink-0 border-t border-slate-100 dark:border-slate-800/60 mt-2">
              <Button
                id="transfer-cancel-btn"
                type="button"
                variant="secondary"
                size="sm"
                autoFocus
                disabled={transferSubmitting}
                onClick={() => {
                  setShowTransferConfirm(false);
                  setTransferError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={transferSubmitting}
                disabled={transferSubmitting}
                onClick={handleExecuteTransfer}
              >
                {transferSubmitting ? 'Transferring...' : 'Yes, transfer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
