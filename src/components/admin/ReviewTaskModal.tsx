import { useState, type FormEvent } from 'react';
import { Alert, Button, Modal, TextAreaField } from '@/components/ui';
import { reviewTask } from '@/lib/taskApi';
import type { Task } from '@/types/database';

interface ReviewTaskModalProps {
  task: Task;
  decision: 'confirm' | 'reject';
  onClose: () => void;
  onReviewed: () => void;
}

export function ReviewTaskModal({ task, decision, onClose, onReviewed }: ReviewTaskModalProps) {
  const isReject = decision === 'reject';
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (isReject && !reason.trim()) {
      setError('Please tell the employee why this task is being rejected.');
      return;
    }
    setSubmitting(true);
    try {
      await reviewTask(task.id, decision, isReject ? reason.trim() : undefined);
      onReviewed();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isReject ? 'Reject task?' : 'Confirm task?'}
      description={`${task.client_name} · ${task.title}`}
      onClose={() => {
        if (!submitting) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        {isReject && (
          <TextAreaField
            id="reject-reason"
            label="Reason"
            placeholder="e.g. Needs a second round of revisions"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={submitting}
            maxLength={500}
          />
        )}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {isReject
            ? 'The task will go back to the employee as open, with your reason shown.'
            : 'The task will be marked as completed.'}
        </p>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant={isReject ? 'danger' : 'primary'} loading={submitting}>
            {isReject ? 'Reject task' : 'Confirm task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
