import { Alert, Button, Modal } from '@/components/ui';
import { useState } from 'react';
import { deleteTask } from '@/lib/taskApi';
import type { TaskWithRequests } from '@/types/database';

interface DeleteTaskModalProps {
  task: TaskWithRequests;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteTaskModal({ task, onClose, onDeleted }: DeleteTaskModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await deleteTask(task.id);
      onDeleted();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Delete this task?"
      description={`${task.client_name} · ${task.title}`}
      onClose={() => {
        if (!submitting) onClose();
      }}
    >
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This removes the task permanently. This can&apos;t be undone.
        </p>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()} loading={submitting}>
            Delete task
          </Button>
        </div>
      </div>
    </Modal>
  );
}
