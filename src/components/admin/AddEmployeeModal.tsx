import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Modal } from '@/components/ui';
import { callEdgeFunction } from '@/lib/edgeFunctions';

interface AddEmployeeModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function AddEmployeeModal({ onClose, onCreated }: AddEmployeeModalProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callEdgeFunction('manage-employee', {
        action: 'create',
        full_name: fullName,
        email,
        temp_password: tempPassword,
      });
      onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Add employee"
      description="Share the temporary password with them. They'll be asked to choose a new one at first sign-in."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <Alert tone="error">{error}</Alert>}
        <Field
          id="employee-name"
          label="Full name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          disabled={submitting}
        />
        <Field
          id="employee-email"
          label="Work email"
          type="email"
          autoComplete="off"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={submitting}
        />
        <Field
          id="employee-password"
          label="Temporary password"
          type="text"
          autoComplete="off"
          required
          minLength={8}
          value={tempPassword}
          onChange={(event) => setTempPassword(event.target.value)}
          disabled={submitting}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">At least 8 characters.</p>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create account
          </Button>
        </div>
      </form>
    </Modal>
  );
}
