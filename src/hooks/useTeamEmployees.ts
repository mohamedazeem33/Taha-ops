import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

const PROFILE_COLUMNS = 'id, full_name, email, is_active, must_change_password, created_at';

export function useTeamEmployees() {
  const { account } = useAuth();
  const currentUserId = account?.profile.id;
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .order('created_at', { ascending: true });
    if (loadError || !Array.isArray(data)) {
      setError("We couldn't load your team. Please try again.");
    } else {
      setEmployees((data as Profile[]).filter((profile) => profile.id !== currentUserId));
      setError(null);
    }
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { employees, loading, error, reload };
}
