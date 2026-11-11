import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Flag,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Trash2,
  User,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Alert, Button, Modal } from '@/components/ui';
import {
  deleteReportedFeedback,
  fetchAdminFeedbackStats,
  fetchReportedFeedback,
} from '@/lib/feedbackApi';
import { formatDateTimeIST } from '@/lib/formatDate';
import type { AdminFeedbackStats, ReportedFeedbackMessage } from '@/types/database';

export function AdminReportsPage() {
  const [reports, setReports] = useState<ReportedFeedbackMessage[]>([]);
  const [stats, setStats] = useState<AdminFeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingReport, setDeletingReport] = useState<ReportedFeedbackMessage | null>(null);
  const [deletingSubmitting, setDeletingSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [reportsData, statsData] = await Promise.all([
        fetchReportedFeedback(),
        fetchAdminFeedbackStats(),
      ]);
      setReports(reportsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reported feedback.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!deletingReport) return;
    try {
      setDeletingSubmitting(true);
      await deleteReportedFeedback(deletingReport.id);
      setReports((prev) => prev.filter((r) => r.id !== deletingReport.id));
      setStats((prev) => (prev ? { ...prev, total_reported: Math.max(0, prev.total_reported - 1) } : null));
      setDeletingReport(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete report.');
    } finally {
      setDeletingSubmitting(false);
    }
  };

  return (
    <AdminLayout active="reports">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-3xl flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-200 border border-rose-300/30">
                <Flag className="h-5 w-5" aria-hidden="true" />
              </span>
              Reported Feedback
            </h1>
            <p className="mt-1 text-sm text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              Review flagged anonymous messages. Regular non-reported feedback remains strictly private.
            </p>
          </div>

          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading} className="self-start sm:self-auto">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh reports
          </Button>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        {/* Stats cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Feedback Sent This Week</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
                <MessageSquare className="h-5 w-5" />
              </span>
            </div>
            <p className="font-display mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
              {stats ? stats.total_sent_this_week : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Aggregate peer recognitions across the workspace this week
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Flagged Messages</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
                <ShieldAlert className="h-5 w-5" />
              </span>
            </div>
            <p className="font-display mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
              {stats ? stats.total_reported : reports.length}
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Messages escalated by receivers for policy review
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Privacy Status</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-2 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              Zero-Knowledge Active
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Non-reported feedback and plain PINs are cryptographically inaccessible to admins
            </p>
          </div>
        </div>

        {/* Reports list */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <Flag className="h-7 w-7" />
            </span>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">No reported feedback</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              There are currently no reported or flagged messages from your team.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              Reported messages ({reports.length})
            </h2>

            {reports.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm transition dark:border-rose-900/60 dark:bg-slate-900"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Parties Info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                        <User className="h-3.5 w-3.5" />
                        <span>Sender:</span>
                        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium dark:bg-rose-950/60">
                          {report.sender_name}
                        </span>
                      </div>

                      <span className="text-slate-300 dark:text-slate-700">→</span>

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <User className="h-3.5 w-3.5" />
                        <span>Receiver:</span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium dark:bg-slate-800">
                          {report.receiver_name}
                        </span>
                      </div>

                      {report.tag && (
                        <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Tag: {report.tag}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Sent: {formatDateTimeIST(report.created_at)}
                      </span>
                      <span className="flex items-center gap-1 text-rose-500">
                        <Flag className="h-3.5 w-3.5" />
                        Reported: {formatDateTimeIST(report.reported_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeletingReport(report)}
                    className="self-end sm:self-auto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>

                {/* Message text */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {report.message}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete confirmation modal */}
        {deletingReport && (
          <Modal
            title="Delete Reported Message"
            description="Are you sure you want to permanently delete this reported feedback message?"
            onClose={() => setDeletingReport(null)}
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                This will remove the message from the system completely. This action cannot be undone.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setDeletingReport(null)} disabled={deletingSubmitting}>
                  Cancel
                </Button>
                <Button variant="danger" loading={deletingSubmitting} onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  Delete Permanently
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
}

