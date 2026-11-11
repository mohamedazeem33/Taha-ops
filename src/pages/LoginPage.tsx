import { useEffect, useState, type FormEvent } from 'react';
import { Layers } from 'lucide-react';
import { Alert, Button, Field } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { callEdgeFunction } from '@/lib/edgeFunctions';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'setup';

function friendlyLoginError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('banned')) return 'Your account has been deactivated. Please contact your admin.';
  if (lower.includes('invalid login')) return "That email and password don't match. Please try again.";
  if (lower.includes('fetch') || lower.includes('network')) return 'Network problem. Check your connection and try again.';
  return 'We could not sign you in. Please try again.';
}

export function LoginPage() {
  const { notice, setNotice } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.rpc('admin_setup_available').then(({ data, error: rpcError }) => {
      if (!rpcError && data === true) setSetupAvailable(true);
    });
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError(friendlyLoginError(signInError.message));
      setSubmitting(false);
    }
  };

  const handleSetup = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callEdgeFunction('setup-admin', {
        full_name: fullName,
        email: email.trim(),
        password,
      });
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    setSetupAvailable(false);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setMode('signin');
      setError('Your admin account is ready. Please sign in with your email and password.');
      setSubmitting(false);
    }
  };

  const isSetup = mode === 'setup';

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Layers className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isSetup ? 'Set up your workspace' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isSetup
              ? 'Create the admin account that will manage your team.'
              : 'Sign in to see your team and today’s work.'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={isSetup ? handleSetup : handleSignIn} className="space-y-5" noValidate>
            {notice && <Alert tone="info">{notice}</Alert>}
            {error && <Alert tone="error">{error}</Alert>}

            {isSetup && (
              <Field
                id="full-name"
                label="Your name"
                autoComplete="name"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={submitting}
              />
            )}
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={submitting}
            />
            <Field
              id="password"
              label="Password"
              type="password"
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              required
              minLength={isSetup ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={submitting}
            />

            <Button type="submit" loading={submitting} className="w-full">
              {isSetup ? 'Create admin account' : 'Sign in'}
            </Button>
          </form>
        </div>

        {setupAvailable && (
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {isSetup ? (
              <button type="button" onClick={() => switchMode('signin')} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                Back to sign in
              </button>
            ) : (
              <>
                New workspace?{' '}
                <button type="button" onClick={() => switchMode('setup')} className="font-medium text-brand-700 hover:underline dark:text-brand-300">
                  Set up the admin account
                </button>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
