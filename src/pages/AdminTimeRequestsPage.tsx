import { useEffect, useState } from 'react';
import { CalendarClock, Inbox } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ReviewTimeRequestModal } from '@/components/admin/ReviewTimeRequestModal';
import { Alert, Button, Spinner } from '@/components/ui';
import { useAdminAlerts } from '@/hooks/useAdminAlerts';
import { fetchPendingTimeRequests, type PendingTimeRequest } from '@/lib/taskApi';
import { todayIST, formatDeadlineIST, formatTimeIST } from '@/lib/formatDate';

export function AdminTimeRequestsPage() {
  const { refresh: refreshAlerts } = useAdminAlerts();
  const [requests, setRequests] = useState<PendingTimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<PendingTimeRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'reject'>('approve');

  const load = async () => {
    try {
      setRequests(await fetchPendingTimeRequests());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We couldn't load time requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleReviewed = async () => {
    setReviewing(null);
    await Promise.all([load(), refreshAlerts()]);
  };

  return (
    <AdminLayout active="time-requests">
      <div className="space-y-8 animate-slide-up">
        <header>
          <p className="text-sm font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{todayIST()}</p>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-4xl">
            Time requests
          </h1>
          <p className="mt-2 text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
            Team members asking for more time on a task.
          </p>
        </header>

        {loading && <Spinner label="Loading time requests" />}
        {!loading && error && <Alert tone="error">{error}</Alert>}

        {!loading && !error && requests.length === 0 && (
          <section className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/50 dark:text-brand-300">
              <Inbox className="h-7 w-7" aria-hidden="true" />
            </span>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">No pending requests</p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">When someone asks for more time, it shows up here.</p>
          </section>
        )}

        {!loading && !error && requests.length > 0 && (
          <ul className="space-y-4">
            {requests.map((request) => (
              <li
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                    <CalendarClock className="h-3 w-3" aria-hidden="true" />
                    Extension request
                  </span>
                </div>
                {request.task && (
                  <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {request.task.client_name} · {request.task.title}
                  </h3>
                )}
                <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60">
                  <p className="text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Reason:</span> {request.reason}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Requested by:</span>{' '}
                    {request.employee?.full_name ?? 'Employee'}
                  </p>
                  {request.task && (
                    <p className="text-slate-600 dark:text-slate-300">
                      <span className="font-medium">Current deadline:</span>{' '}
                      {formatDeadlineIST(request.task.deadline)} IST
                    </p>
                  )}
                  <p className="text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Requested new deadline:</span>{' '}
                    {formatDeadlineIST(request.requested_deadline)} IST
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Sent {formatTimeIST(request.created_at)}
                  </p>
                </div>
                <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                  <Button
                    onClick={() => {
                      setReviewDecision('approve');
                      setReviewing(request);
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setReviewDecision('reject');
                      setReviewing(request);
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {reviewing && (
        <ReviewTimeRequestModal
          request={reviewing}
          decision={reviewDecision}
          onClose={() => setReviewing(null)}
          onReviewed={() => void handleReviewed()}
        />
      )}
    </AdminLayout>
  );
}
