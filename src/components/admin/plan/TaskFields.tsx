import { Field, TextAreaField } from '@/components/ui';
import type { TaskFormValues } from '@/components/admin/plan/taskForm';

interface TaskFieldsProps {
  idPrefix: string;
  values: TaskFormValues;
  disabled?: boolean;
  onChange: (field: keyof TaskFormValues, value: string) => void;
}

export function TaskFields({ idPrefix, values, disabled = false, onChange }: TaskFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`${idPrefix}-client`}
          label="Client"
          required
          value={values.client_name}
          onChange={(event) => onChange('client_name', event.target.value)}
          disabled={disabled}
        />
        <Field
          id={`${idPrefix}-deadline`}
          label="Deadline (IST)"
          type="datetime-local"
          required
          value={values.deadline}
          onChange={(event) => onChange('deadline', event.target.value)}
          disabled={disabled}
        />
      </div>
      <Field
        id={`${idPrefix}-title`}
        label="Task title"
        required
        value={values.title}
        onChange={(event) => onChange('title', event.target.value)}
        disabled={disabled}
      />
      <TextAreaField
        id={`${idPrefix}-description`}
        label="Description (optional)"
        rows={2}
        value={values.description}
        onChange={(event) => onChange('description', event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
