import { useCallback, useEffect, useState } from 'react';
import { fetchTasksForDay } from '@/lib/taskApi';
import { supabase } from '@/lib/supabase';
import type { TaskWithRequests } from '@/types/database';

export function useTasksForDay(day: string, live = false) {
  const [tasks, setTasks] = useState<TaskWithRequests[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setTasks(await fetchTasksForDay(day));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We couldn't load today's tasks.");
    } finally {
      setLoading(false);
    }
  }, [day]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!live) return;
    const channel = supabase
      .channel(`tasks-live-${day}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_requests' }, () => void reload())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [day, live, reload]);

  return { tasks, loading, error, reload };
}
