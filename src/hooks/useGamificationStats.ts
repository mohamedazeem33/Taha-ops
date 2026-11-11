import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchMyBadges, fetchMyPoints, fetchMyPointsLog, fetchMyStreak } from '@/lib/gamificationApi';
import type { EmployeeBadge, EmployeeStreak, PointsLogEntry } from '@/types/database';

export interface GamificationStats {
  totalPoints: number;
  streak: EmployeeStreak | null;
  pointsLog: PointsLogEntry[];
  badges: EmployeeBadge[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useGamificationStats(live = false): GamificationStats {
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState<EmployeeStreak | null>(null);
  const [pointsLog, setPointsLog] = useState<PointsLogEntry[]>([]);
  const [badges, setBadges] = useState<EmployeeBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [points, streakData, log, badgeData] = await Promise.all([
        fetchMyPoints(),
        fetchMyStreak(),
        fetchMyPointsLog(),
        fetchMyBadges(),
      ]);
      setTotalPoints(points);
      setStreak(streakData);
      setPointsLog(log);
      setBadges(badgeData);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!live) return;
    const channel = supabase
      .channel('points-log-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'points_log' }, () => void reload())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [live, reload]);

  return { totalPoints, streak, pointsLog, badges, loading, error, reload };
}
