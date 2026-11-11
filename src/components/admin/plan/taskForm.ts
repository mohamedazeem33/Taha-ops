import { defaultDeadlineInput, istInputToIso } from '@/lib/formatDate';
import type { TaskDraft } from '@/types/database';

export interface TaskFormValues {
  client_name: string;
  title: string;
  description: string;
  deadline: string;
}

export function blankTaskValues(day: string): TaskFormValues {
  return { client_name: '', title: '', description: '', deadline: defaultDeadlineInput(day) };
}

export function validateTaskValues(values: TaskFormValues): string | null {
  if (!values.client_name.trim()) return 'Please add the client name.';
  if (!values.title.trim()) return 'Please add a task title.';
  if (!values.deadline) return 'Please pick a deadline.';
  return null;
}

export function toTaskDraft(values: TaskFormValues): TaskDraft {
  return {
    client_name: values.client_name.trim(),
    title: values.title.trim(),
    description: values.description.trim(),
    deadline: istInputToIso(values.deadline),
  };
}
