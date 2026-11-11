import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Account, AppRole, Profile } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  account: Account | null;
  loading: boolean;
  notice: string | null;
  setNotice: (message: string | null) => void;
  refreshAccount: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PROFILE_COLUMNS = 'id, full_name, email, is_active, must_change_password, created_at';

async function loadAccount(userId: string): Promise<Account | null> {
  const [profileRes, roleRes] = await Promise.all([
    supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (roleRes.error) throw roleRes.error;
  if (!profileRes.data || !roleRes.data) return null;
  return { profile: profileRes.data as Profile, role: roleRes.data.role as AppRole };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applySession = async (nextSession: Session | null) => {
      if (!nextSession) {
        if (cancelled) return;
        setSession(null);
        setAccount(null);
        setLoading(false);
        return;
      }

      let nextAccount: Account | null = null;
      let message: string | null = null;
      try {
        nextAccount = await loadAccount(nextSession.user.id);
        if (!nextAccount) {
          message = "This account isn't set up for Teamboard yet. Please ask your admin.";
        } else if (!nextAccount.profile.is_active) {
          message = 'Your account has been deactivated. Please contact your admin.';
        }
      } catch {
        message = "We couldn't load your account. Please sign in again.";
      }

      if (message || !nextAccount) {
        if (!cancelled) {
          setNotice(message);
          setSession(null);
          setAccount(null);
          setLoading(false);
        }
        await supabase.auth.signOut();
        return;
      }

      if (cancelled) return;
      setSession(nextSession);
      setAccount(nextAccount);
      setLoading(false);
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const refreshAccount = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const nextAccount = await loadAccount(data.session.user.id);
    setAccount(nextAccount);
  }, []);

  const signOut = useCallback(async () => {
    setNotice(null);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, account, loading, notice, setNotice, refreshAccount, signOut }),
    [session, account, loading, notice, refreshAccount, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
