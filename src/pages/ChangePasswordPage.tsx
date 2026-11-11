import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Alert, Button, Field } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function ChangePasswordPage() {
  const { refreshAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Your new password needs at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('We could not update your password. Please try again.');
      setSubmitting(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc('complete_password_change');
    if (rpcError) {
      setError('Your password was saved, but we could not finish setup. Please try again.');
      setSubmitting(false);
      return;
    }

    try {
      await refreshAccount();
    } catch {
      setError('Your password was saved, but we could not load your workspace. Please refresh the page.');
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4d79]/25 to-[#ff9040]/25 text-white border border-white/20 shadow-lg">
            <KeyRound className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-3xl">Choose your password</h1>
          <p className="mt-2 text-sm text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
            Your admin gave you a temporary password. Pick a new one to continue.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && <Alert tone="error">{error}</Alert>}
            <Field
              id="new-password"
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
            />
            <Field
              id="confirm-password"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              disabled={submitting}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">Use at least 8 characters.</p>
            <Button type="submit" loading={submitting} className="w-full">
              Save and continue
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
