import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAdminFeedbackStats } from '@/lib/feedbackApi';
import { useAuth } from '@/contexts/AuthContext';
import { Toast, type ToastMessage } from '@/components/Toast';

export interface AdminAlertsContextValue {
  confirmationsCount: number;
  timeRequestsCount: number;
  reportsCount: number;
  totalAlertsCount: number;
  refresh: () => Promise<void>;
}

const AdminAlertsContext = createContext<AdminAlertsContextValue | null>(null);

export function AdminAlertsProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const [confirmationsCount, setConfirmationsCount] = useState<number>(0);
  const [timeRequestsCount, setTimeRequestsCount] = useState<number>(0);
  const [reportsCount, setReportsCount] = useState<number>(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const isInitialLoadRef = useRef(true);
  const prevCountsRef = useRef<{
    confirmations: number;
    timeRequests: number;
    reports: number;
  } | null>(null);
  const isFetchingRef = useRef(false);
  const pendingRefetchRef = useRef(false);

  const fetchCounts = useCallback(async () => {
    if (!account || account.role !== 'admin') {
      return;
    }

    if (isFetchingRef.current) {
      pendingRefetchRef.current = true;
      return;
    }

    isFetchingRef.current = true;
    try {
      do {
        pendingRefetchRef.current = false;
        const [confRes, trRes, stats] = await Promise.all([
          supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'done_pending'),
          supabase
            .from('time_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
          fetchAdminFeedbackStats(),
        ]);

        if (confRes.error) throw confRes.error;
        if (trRes.error) throw trRes.error;

        const newConf = confRes.count ?? 0;
        const newTr = trRes.count ?? 0;
        const newReports = stats.total_reported ?? 0;

        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          prevCountsRef.current = {
            confirmations: newConf,
            timeRequests: newTr,
            reports: newReports,
          };
        } else if (prevCountsRef.current !== null) {
          const wentUp =
            newConf > prevCountsRef.current.confirmations ||
            newTr > prevCountsRef.current.timeRequests ||
            newReports > prevCountsRef.current.reports;

          if (wentUp) {
            setToast({
              id: Date.now(),
              text: 'New items need your attention',
              tone: 'info',
            });
          }

          prevCountsRef.current = {
            confirmations: newConf,
            timeRequests: newTr,
            reports: newReports,
          };
        }

        setConfirmationsCount(newConf);
        setTimeRequestsCount(newTr);
        setReportsCount(newReports);
      } while (pendingRefetchRef.current);
    } catch {
      // Failures are ignored quietly (keep the last known counts)
    } finally {
      isFetchingRef.current = false;
    }
  }, [account]);

  // Fetch on mount, poll every 30s while visible, refetch when tab becomes visible,
  // and listen to realtime channel for tasks and time_requests.
  useEffect(() => {
    if (!account || account.role !== 'admin') {
      return;
    }

    // Initial fetch on mount
    void fetchCounts();

    // Poll every 30 seconds while tab is visible
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchCounts();
      }
    }, 30000);

    // Refetch when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchCounts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen to realtime changes on tasks and time_requests
    const channel = supabase
      .channel('admin-alerts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        void fetchCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_requests' }, () => {
        void fetchCounts();
      })
      .subscribe();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [account, fetchCounts]);

  // Update browser tab title
  const totalAlertsCount = confirmationsCount + timeRequestsCount + reportsCount;

  useEffect(() => {
    if (totalAlertsCount > 0) {
      document.title = `(${totalAlertsCount}) Teamboard`;
    } else {
      document.title = 'Teamboard';
    }

    return () => {
      document.title = 'Teamboard';
    };
  }, [totalAlertsCount]);

  return (
    <AdminAlertsContext.Provider
      value={{
        confirmationsCount,
        timeRequestsCount,
        reportsCount,
        totalAlertsCount,
        refresh: fetchCounts,
      }}
    >
      {children}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </AdminAlertsContext.Provider>
  );
}

export function useAdminAlerts(): AdminAlertsContextValue {
  const context = useContext(AdminAlertsContext);
  if (!context) {
    return {
      confirmationsCount: 0,
      timeRequestsCount: 0,
      reportsCount: 0,
      totalAlertsCount: 0,
      refresh: async () => {},
    };
  }
  return context;
}
