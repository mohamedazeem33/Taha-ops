import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Modal, TextAreaField } from '@/components/ui';
import { formatDeadlineIST, isoToIstInput, istInputToIso } from '@/lib/formatDate';
import { requestMoreTime } from '@/lib/taskApi';
import type { TaskWithRequests } from '@/types/database';

interface RequestTimeModalProps {
  task: TaskWithRequests;
  employeeId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function RequestTimeModal({ task, employeeId, onClose, onSaved }: RequestTimeModalProps) {
  const [reason, setReason] = useState('');
  const [requestedDeadline, setRequestedDeadline] = useState(() => isoToIstInput(task.deadline));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError('Please tell the admin why you need more time.');
      return;
    }
    if (!requestedDeadline) {
      setError('Please pick the new deadline.');
      return;
    }

    const requestedIso = istInputToIso(requestedDeadline);
    if (new Date(requestedIso).getTime() <= new Date(task.deadline).getTime()) {
      setError('The new deadline must be later than the current one.');
      return;
    }

    setSubmitting(true);
    try {
      await requestMoreTime({
        taskId: task.id,
        employeeId,
        reason: reason.trim(),
        requestedDeadlineIso: requestedIso,
      });
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Request more time"
      description={`${task.title} is currently due ${formatDeadlineIST(task.deadline)} IST.`}
      onClose={() => {
        if (!submitting) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <TextAreaField
          id="time-reason"
          label="Reason"
          placeholder="e.g. Client sent the final assets late"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={submitting}
          maxLength={500}
        />
        <Field
          id="requested-deadline"
          label="New deadline (IST)"
          type="datetime-local"
          value={requestedDeadline}
          onChange={(event) => setRequestedDeadline(event.target.value)}
          disabled={submitting}
        />
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Send request
          </Button>
        </div>
      </form>
    </Modal>
  );
}
