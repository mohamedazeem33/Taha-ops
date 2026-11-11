import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Modal } from '@/components/ui';
import { isoToIstInput, istInputToIso } from '@/lib/formatDate';
import { reviewTimeRequest } from '@/lib/taskApi';
import type { PendingTimeRequest } from '@/lib/taskApi';

interface ReviewTimeRequestModalProps {
  request: PendingTimeRequest;
  decision: 'approve' | 'reject';
  onClose: () => void;
  onReviewed: () => void;
}

export function ReviewTimeRequestModal({
  request,
  decision,
  onClose,
  onReviewed,
}: ReviewTimeRequestModalProps) {
  const isApprove = decision === 'approve';
  const [newDeadline, setNewDeadline] = useState(() => isoToIstInput(request.requested_deadline));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    let newDeadlineIso: string | undefined;
    if (isApprove) {
      if (!newDeadline) {
        setError('Please pick the new deadline.');
        return;
      }
      newDeadlineIso = istInputToIso(newDeadline);
    }
    setSubmitting(true);
    try {
      await reviewTimeRequest(request.id, decision, newDeadlineIso);
      onReviewed();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isApprove ? 'Approve extension?' : 'Reject extension?'}
      description={request.task ? `${request.task.client_name} · ${request.task.title}` : undefined}
      onClose={() => {
        if (!submitting) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <p>
            <span className="font-medium">Reason:</span> {request.reason}
          </p>
        </div>
        {isApprove && (
          <Field
            id="new-deadline"
            label="New deadline (IST)"
            type="datetime-local"
            value={newDeadline}
            onChange={(event) => setNewDeadline(event.target.value)}
            disabled={submitting}
          />
        )}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant={isApprove ? 'primary' : 'danger'} loading={submitting}>
            {isApprove ? 'Approve extension' : 'Reject request'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
