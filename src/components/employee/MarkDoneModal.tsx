import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Modal, TextAreaField } from '@/components/ui';
import { isValidHttpUrl } from '@/components/TaskSubmissionInfo';
import type { TaskWithRequests } from '@/types/database';

interface MarkDoneModalProps {
  task: TaskWithRequests;
  onClose: () => void;
  onSubmit: (link?: string, note?: string) => Promise<void>;
}

export function MarkDoneModal({ task, onClose, onSubmit }: MarkDoneModalProps) {
  // If the task was rejected earlier, prefill the previous link and note so they can fix and resubmit
  const [link, setLink] = useState(task.submission_link ?? '');
  const [note, setNote] = useState(task.submission_note ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedLink = link.trim();
    const trimmedNote = note.trim();

    if (trimmedLink) {
      if (!isValidHttpUrl(trimmedLink)) {
        setError('Link must start with http:// or https://');
        return;
      }
      if (trimmedLink.length > 2000) {
        setError('Link must be at most 2000 characters.');
        return;
      }
    }

    if (trimmedNote && trimmedNote.length > 500) {
      setError('Note must be at most 500 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(trimmedLink || undefined, trimmedNote || undefined);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Something went wrong. Please try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Mark as done"
      description={`${task.client_name} · ${task.title}`}
      onClose={() => {
        if (!submitting) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto px-0.5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <Field
          id="submission-link"
          label="Link (optional)"
          placeholder="https://..."
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          disabled={submitting}
          maxLength={2000}
        />

        <div className="space-y-1">
          <TextAreaField
            id="submission-note"
            label="Note (optional)"
            placeholder="Add context, deliverables summary, or notes for the admin..."
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            maxLength={500}
          />
          <div className="flex justify-between items-center text-xs text-slate-400 dark:text-slate-500">
            <span>Max 500 characters</span>
            <span className={note.length >= 500 ? 'font-semibold text-rose-500' : ''}>
              {note.length}/500
            </span>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Submit for review
          </Button>
        </div>
      </form>
    </Modal>
  );
}
