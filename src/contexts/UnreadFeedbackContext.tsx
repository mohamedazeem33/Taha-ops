import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUnreadFeedbackCount } from '@/lib/feedbackApi';
import { Toast, type ToastMessage } from '@/components/Toast';

interface UnreadFeedbackContextValue {
  unreadCount: number;
  refresh: () => Promise<void>;
}

const UnreadFeedbackContext = createContext<UnreadFeedbackContextValue | null>(null);

export function UnreadFeedbackProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const isInitialLoadRef = useRef(true);
  const prevCountRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);

  const fetchCount = useCallback(async () => {
    if (!account || account.role !== 'employee' || isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      const count = await getUnreadFeedbackCount();

      setUnreadCount(() => {
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          prevCountRef.current = count;
        } else if (prevCountRef.current !== null && count > prevCountRef.current) {
          // Count went UP while using the app
          setToast({
            id: Date.now(),
            text: 'You received new feedback',
            tone: 'info',
          });
          prevCountRef.current = count;
        } else {
          prevCountRef.current = count;
        }
        return count;
      });
    } catch {
      // Failures are ignored quietly (keep the last known count)
    } finally {
      isFetchingRef.current = false;
    }
  }, [account]);

  // Fetch on mount, poll every 30s while visible, refetch when tab becomes visible
  useEffect(() => {
    if (!account || account.role !== 'employee') {
      return;
    }

    // Initial fetch on mount
    void fetchCount();

    // Poll every 30 seconds while tab is visible
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchCount();
      }
    }, 30000);

    // Refetch when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [account, fetchCount]);

  // Update browser tab title
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Teamboard`;
    } else {
      document.title = 'Teamboard';
    }

    return () => {
      document.title = 'Teamboard';
    };
  }, [unreadCount]);

  return (
    <UnreadFeedbackContext.Provider value={{ unreadCount, refresh: fetchCount }}>
      {children}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </UnreadFeedbackContext.Provider>
  );
}

export function useUnreadFeedback(): UnreadFeedbackContextValue {
  const context = useContext(UnreadFeedbackContext);
  if (!context) {
    return {
      unreadCount: 0,
      refresh: async () => {},
    };
  }
  return context;
}

