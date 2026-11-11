import { useState, type FormEvent } from 'react';
import { Alert, Button, Modal } from '@/components/ui';
import { TaskFields } from '@/components/admin/plan/TaskFields';
import {
  toTaskDraft,
  validateTaskValues,
  type TaskFormValues,
} from '@/components/admin/plan/taskForm';
import { isoToIstInput } from '@/lib/formatDate';
import { updateTask } from '@/lib/taskApi';
import type { TaskWithRequests } from '@/types/database';

interface EditTaskModalProps {
  task: TaskWithRequests;
  onClose: () => void;
  onSaved: () => void;
}

export function EditTaskModal({ task, onClose, onSaved }: EditTaskModalProps) {
  const [values, setValues] = useState<TaskFormValues>(() => ({
    client_name: task.client_name,
    title: task.title,
    description: task.description,
    deadline: isoToIstInput(task.deadline),
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Modal
      title="Edit task"
      description={`${task.client_name} · ${task.title}`}
      onClose={() => {
        if (!submitting) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <TaskFields
          idPrefix="edit-task"
          values={values}
          disabled={submitting}
          onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        />
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
