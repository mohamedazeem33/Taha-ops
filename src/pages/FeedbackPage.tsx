import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Flag,
  KeyRound,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlock,
  User,
} from 'lucide-react';
import { EmployeeLayout } from '@/components/employee/EmployeeLayout';
import { useUnreadFeedback } from '@/hooks/useUnreadFeedback';
import { Alert, Button, Field, Modal, TextAreaField } from '@/components/ui';
import {
  changeFeedbackPin,
  fetchFeedbackInbox,
  fetchFeedbackPinStatus,
  fetchFeedbackRecipients,
  markFeedbackMessageRead,
  reportFeedbackMessage,
  sendFeedbackMessage,
  setFeedbackPin,
  verifyFeedbackPin,
} from '@/lib/feedbackApi';
import { formatDateTimeIST } from '@/lib/formatDate';
import type {
  FeedbackInboxMessage,
  FeedbackPinStatus,
  FeedbackRecipient,
  FeedbackTag,
} from '@/types/database';

const FEEDBACK_TAGS: FeedbackTag[] = [
  'Great teamwork',
  'Shoutout',
  'Late to meeting',
  'Not focused',
];

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export function FeedbackPage() {
  const [activeTab, setActiveTab] = useState<'send' | 'inbox'>('send');

  return (
    <EmployeeLayout active="feedback">
      <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] sm:text-3xl flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4d79]/25 to-[#ff9040]/25 text-white border border-white/20">
                <Shield className="h-5 w-5" aria-hidden="true" />
              </span>
              Anonymous Feedback
            </h1>
            <p className="mt-1 text-sm text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              Share honest feedback and recognize teammates privately. Your identity is always kept anonymous.
            </p>
          </div>

          {/* Sub tabs */}
          <div className="inline-flex rounded-xl border border-white/60 bg-white/85 p-1 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-[#100e28]/85 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('send')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer ${
                activeTab === 'send'
                  ? 'bg-gradient-to-r from-[#ff4d79] via-[#ff6a5c] to-[#ff9040] text-[#1c0627] font-bold shadow-sm shadow-[#ff4d79]/20'
                  : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Send Feedback
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer ${
                activeTab === 'inbox'
                  ? 'bg-gradient-to-r from-[#ff4d79] via-[#ff6a5c] to-[#ff9040] text-[#1c0627] font-bold shadow-sm shadow-[#ff4d79]/20'
                  : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              My Feedback Box
            </button>
          </div>
        </div>

        {activeTab === 'send' ? <SendFeedbackView /> : <FeedbackInboxView />}
      </div>
    </EmployeeLayout>
  );
}

// ---------------------------------------------------------------------------
// 1. SEND FEEDBACK VIEW
// ---------------------------------------------------------------------------
function SendFeedbackView() {
  const { refresh } = useUnreadFeedback();
  const [recipients, setRecipients] = useState<FeedbackRecipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [selectedTag, setSelectedTag] = useState<FeedbackTag | null>(null);
  const [message, setMessage] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState(false);

  const loadRecipients = useCallback(async () => {
    try {
      setLoadingRecipients(true);
      setError(null);
      const data = await fetchFeedbackRecipients();
      setRecipients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load teammates list.');
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId) {
      setError('Please select a teammate.');
      return;
    }
    const cleanMsg = message.trim();
    if (!cleanMsg) {
      setError('Please write a message.');
      return;
    }
    if (cleanMsg.length > 500) {
      setError('Message exceeds 500 characters.');
      return;
    }

    try {
      setSending(true);
      setError(null);
      await sendFeedbackMessage(selectedRecipientId, selectedTag, cleanMsg);
      setSentSuccess(true);
      setMessage('');
      setSelectedRecipientId('');
      setSelectedTag(null);
      void refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send feedback.');
    } finally {
      setSending(false);
    }
  };

  if (sentSuccess) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-slide-up">
        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Feedback Sent Anonymously</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Your feedback has been delivered securely to your teammate’s private box. Your identity remains completely private.
        </p>
        <div className="mt-6">
          <Button onClick={() => setSentSuccess(false)}>
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            Send Another Feedback
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Form column */}
      <div className="md:col-span-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert tone="error">{error}</Alert>}

            {/* Recipient picker */}
            <div className="space-y-1.5">
              <label htmlFor="recipient-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Choose a Teammate
              </label>
              {loadingRecipients ? (
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
              ) : recipients.length === 0 ? (
                <p className="text-sm text-slate-500">No other active teammates available.</p>
              ) : (
                <select
                  id="recipient-select"
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="">Select someone...</option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Optional Tag selection */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tag <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(Optional category)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TAGS.map((tag) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSelectedTag(isSelected ? null : tag)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#ff4d79] via-[#ff6a5c] to-[#ff9040] text-[#1c0627] font-bold shadow-sm shadow-[#ff4d79]/20'
                          : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                      }`}
                    >
                      {tag === 'Great teamwork' || tag === 'Shoutout' ? (
                        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {tag}
                      {isSelected && <Check className="ml-1 h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="feedback-message" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Your Message
                </label>
                <span
                  className={`text-xs ${
                    message.length > 500
                      ? 'font-bold text-rose-600 dark:text-rose-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {message.length} / 500
                </span>
              </div>
              <TextAreaField
                id="feedback-message"
                label=""
                rows={5}
                value={message}
                maxLength={500}
                placeholder="Write constructive, respectful, and honest feedback or appreciation..."
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                Max 10 feedback messages per day
              </span>
              <Button type="submit" loading={sending} disabled={!selectedRecipientId || !message.trim() || sending}>
                <Send className="h-4 w-4" aria-hidden="true" />
                Send Feedback
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Guidelines / Privacy assurance column */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 text-brand-600 dark:text-brand-400">
            <ShieldCheck className="h-6 w-6" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">100% Anonymous</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Your name and profile are never visible to the receiver. They only see an anonymous card with your message and tag.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/5">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Ground rules
          </h4>
          <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>Be constructive and focus on actions, habits, or positive shoutouts.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>Keep messages concise and actionable (max 500 characters).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-bold">•</span>
              <span>Messages can be reported by the receiver if abusive, which reveals the sender to the workspace admin.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. FEEDBACK INBOX VIEW (PIN + WHATSAPP-STYLE LIST)
// ---------------------------------------------------------------------------
function FeedbackInboxView() {
  const { refresh } = useUnreadFeedback();
  const [pinStatus, setPinStatus] = useState<FeedbackPinStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [unlockedPin, setUnlockedPin] = useState<string | null>(null);
  const [messages, setMessages] = useState<FeedbackInboxMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lockout countdown timer
  const [lockRemaining, setLockRemaining] = useState<number>(0);

  // Modals
  const [showChangePin, setShowChangePin] = useState(false);
  const [reportingMessage, setReportingMessage] = useState<FeedbackInboxMessage | null>(null);
  const [reportingSubmitting, setReportingSubmitting] = useState(false);

  // Inactivity auto-lock ref
  const lastActivityRef = useRef<number>(Date.now());

  // Check PIN status
  const checkStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      setError(null);
      const status = await fetchFeedbackPinStatus();
      setPinStatus(status);
      setLockRemaining(status.remaining_seconds || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check PIN status.');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  // Lockout tick timer
  useEffect(() => {
    if (lockRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          void checkStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockRemaining, checkStatus]);

  // Inactivity timer: locks after 5 minutes of no mouse/keyboard interaction
  useEffect(() => {
    if (!unlockedPin) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((e) => window.addEventListener(e, resetActivity));

    const checkInterval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT_MS) {
        // Lock inbox
        setUnlockedPin(null);
        setMessages([]);
      }
    }, 10000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetActivity));
      clearInterval(checkInterval);
    };
  }, [unlockedPin]);

  // Auto lock when unmounting or leaving page
  useEffect(() => {
    return () => {
      setUnlockedPin(null);
      setMessages([]);
    };
  }, []);

  // Fetch messages using unlocked PIN
  const loadMessages = useCallback(async (pin: string) => {
    try {
      setLoadingMessages(true);
      setError(null);
      const [status, data] = await Promise.all([
        fetchFeedbackPinStatus(),
        fetchFeedbackInbox(pin),
      ]);
      if (!status.has_pin) {
        setUnlockedPin(null);
        setPinStatus(status);
        return;
      }
      if (status.is_locked) {
        setUnlockedPin(null);
        setPinStatus(status);
        setLockRemaining(status.remaining_seconds || 900);
        return;
      }

      const unread = data.filter((m) => !m.read_at);
      if (unread.length > 0) {
        const nowIso = new Date().toISOString();
        // Optimistically mark displayed messages as read in UI
        setMessages(data.map((m) => (m.read_at ? m : { ...m, read_at: nowIso })));

        // Persist mark-read to database for displayed messages
        try {
          await Promise.allSettled(unread.map((m) => markFeedbackMessageRead(m.id)));
        } catch {
          // Ignore background read error
        }

        // Refresh unread count immediately so badge drops to 0
        void refresh();
      } else {
        setMessages(data);
        void refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inbox.');
      setUnlockedPin(null);
    } finally {
      setLoadingMessages(false);
    }
  }, [refresh]);

  // When unlocked, load messages
  const handleUnlocked = (pin: string) => {
    setUnlockedPin(pin);
    lastActivityRef.current = Date.now();
    void loadMessages(pin);
  };

  const handleManualLock = () => {
    setUnlockedPin(null);
    setMessages([]);
  };

  // Mark a single message read
  const handleMarkRead = async (messageId: string) => {
    try {
      await markFeedbackMessageRead(messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, read_at: new Date().toISOString() } : m)),
      );
      void refresh();
    } catch {
      // Ignore background read error
    }
  };

  // Report a message to admin
  const handleConfirmReport = async () => {
    if (!reportingMessage) return;
    try {
      setReportingSubmitting(true);
      await reportFeedbackMessage(reportingMessage.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === reportingMessage.id
            ? { ...m, is_reported: true, reported_at: new Date().toISOString() }
            : m,
        ),
      );
      setReportingMessage(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not report message.');
    } finally {
      setReportingSubmitting(false);
    }
  };

  if (loadingStatus) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  // 1. PIN Setup screen (First time)
  if (!pinStatus?.has_pin) {
    return (
      <SetupPinCard
        onSetupComplete={(pin) => {
          setPinStatus({ has_pin: true, is_locked: false, remaining_seconds: 0 });
          handleUnlocked(pin);
        }}
      />
    );
  }

  // 2. Lockout screen (after 5 failed attempts)
  if (pinStatus.is_locked || lockRemaining > 0) {
    const minutes = Math.floor(lockRemaining / 60);
    const seconds = lockRemaining % 60;
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40 animate-slide-up">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-300">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Feedback Box Locked</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Too many incorrect PIN attempts. For security, your feedback box is temporarily locked.
        </p>

        <div className="my-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-lg font-mono font-semibold text-rose-600 shadow-sm dark:bg-slate-900 dark:text-rose-400">
          <Clock className="h-5 w-5" />
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')} remaining
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Forgot your PIN? Please ask your workspace administrator to reset it.
        </p>
      </div>
    );
  }

  // 3. Locked / PIN Challenge screen
  if (!unlockedPin) {
    return (
      <UnlockPinCard
        onUnlocked={handleUnlocked}
        onLockedOut={(remaining) => {
          setPinStatus((prev) => (prev ? { ...prev, is_locked: true, remaining_seconds: remaining } : null));
          setLockRemaining(remaining);
        }}
      />
    );
  }

  // 4. Unlocked WhatsApp-Style Inbox
  const unreadCount = messages.filter((m) => !m.read_at).length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Unlock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Inbox Unlocked</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {messages.length} message{messages.length === 1 ? '' : 's'}
              {unreadCount > 0 && ` • ${unreadCount} unread`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => loadMessages(unlockedPin)} disabled={loadingMessages}>
            <RefreshCw className={`h-3.5 w-3.5 ${loadingMessages ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowChangePin(true)}>
            <KeyRound className="h-3.5 w-3.5" />
            Change PIN
          </Button>
          <Button variant="ghost" size="sm" onClick={handleManualLock}>
            <Lock className="h-3.5 w-3.5" />
            Lock
          </Button>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {/* Messages list */}
      {loadingMessages ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <MessageSquare className="h-6 w-6" />
          </span>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Your feedback box is empty</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            When teammates send you feedback or recognition, it will arrive here securely.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <FeedbackMessageCard
              key={msg.id}
              message={msg}
              onMarkRead={handleMarkRead}
              onReport={(m) => setReportingMessage(m)}
            />
          ))}
        </div>
      )}

      {/* Change PIN Modal */}
      {showChangePin && (
        <ChangePinModal
          onClose={() => setShowChangePin(false)}
          onSuccess={(newPin) => {
            setUnlockedPin(newPin);
            setShowChangePin(false);
          }}
          onLockedOut={(remaining) => {
            setShowChangePin(false);
            setUnlockedPin(null);
            setPinStatus((prev) => (prev ? { ...prev, is_locked: true, remaining_seconds: remaining } : null));
            setLockRemaining(remaining);
          }}
        />
      )}

      {/* Report confirmation modal */}
      {reportingMessage && (
        <Modal
          title="Report this message?"
          description="Report this message to the admin? Your teammate's identity will be revealed to the admin."
          onClose={() => setReportingMessage(null)}
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <p className="line-clamp-3 italic">"{reportingMessage.message}"</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              Only use reporting for harassment, abuse, or serious misconduct. The sender will be reviewed by the admin.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setReportingMessage(null)} disabled={reportingSubmitting}>
                Cancel
              </Button>
              <Button variant="danger" loading={reportingSubmitting} onClick={handleConfirmReport}>
                <Flag className="h-4 w-4" />
                Yes, Report Message
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. WHATSAPP-STYLE MESSAGE CARD
// ---------------------------------------------------------------------------
function FeedbackMessageCard({
  message,
  onMarkRead,
  onReport,
}: {
  message: FeedbackInboxMessage;
  onMarkRead: (id: string) => void;
  onReport: (msg: FeedbackInboxMessage) => void;
}) {
  const isUnread = !message.read_at;

  useEffect(() => {
    if (isUnread) {
      onMarkRead(message.id);
    }
  }, [isUnread, message.id, onMarkRead]);

  const tagColor = (tag: FeedbackTag | null) => {
    switch (tag) {
      case 'Great teamwork':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
      case 'Shoutout':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800';
      case 'Late to meeting':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
      case 'Not focused':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 shadow-sm transition-all duration-200 ${
        isUnread
          ? 'border-brand-300 bg-brand-50/30 dark:border-brand-800 dark:bg-brand-950/20'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Anonymous Sender Info */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <User className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                Anonymous
              </span>
              {isUnread && (
                <span className="rounded-full bg-gradient-to-r from-[#ff4d79] to-[#ff9040] px-2 py-0.5 text-[10px] font-bold text-[#1c0627]">
                  New
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {formatDateTimeIST(message.created_at)}
            </p>
          </div>
        </div>

        {/* Tag badge */}
        {message.tag && (
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium ${tagColor(
              message.tag,
            )}`}
          >
            {message.tag}
          </span>
        )}
      </div>

      {/* Message Body (WhatsApp bubble style) */}
      <div className="mt-3.5 rounded-xl bg-slate-50/80 p-3.5 text-sm text-slate-800 dark:bg-slate-800/50 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
        {message.message}
      </div>

      {/* Bottom Actions */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Delivered anonymously via Teamboard
        </span>

        {message.is_reported ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Flag className="h-3 w-3" /> Reported to admin
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onReport(message)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-600 transition dark:hover:text-rose-400"
          >
            <Flag className="h-3 w-3" />
            Report
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. SETUP PIN COMPONENT (FIRST TIME)
// ---------------------------------------------------------------------------
function SetupPinCard({ onSetupComplete }: { onSetupComplete: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    try {
      setLoading(true);
      await setFeedbackPin(pin);
      onSetupComplete(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-slide-up">
      <div className="text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300">
          <KeyRound className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Set Up Your Feedback PIN</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Choose a 4-digit PIN to securely protect your feedback box. You'll enter this PIN whenever you open your inbox.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <Field
          id="new-feedback-pin"
          label="4-Digit PIN"
          type="password"
          maxLength={4}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          required
        />

        <Field
          id="confirm-feedback-pin"
          label="Confirm 4-Digit PIN"
          type="password"
          maxLength={4}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="••••"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          required
        />

        <Button type="submit" loading={loading} className="w-full" disabled={pin.length !== 4 || confirmPin.length !== 4}>
          Save PIN & Open Inbox
        </Button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. UNLOCK PIN CHALLENGE COMPONENT
// ---------------------------------------------------------------------------
function UnlockPinCard({
  onUnlocked,
  onLockedOut,
}: {
  onUnlocked: (pin: string) => void;
  onLockedOut: (remainingSeconds: number) => void;
}) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setError('Please enter a 4-digit PIN.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await verifyFeedbackPin(pin);

      if (res.is_locked) {
        onLockedOut(res.remaining_seconds || 900);
        return;
      }

      if (res.success) {
        onUnlocked(pin);
      } else {
        const attemptsLeft = res.attempts_left ?? 0;
        setError(`Incorrect PIN. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`);
        setPin('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 animate-slide-up">
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Lock className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Unlock Feedback Box</h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Enter your 4-digit PIN to view your received feedback.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div>
          <input
            id="unlock-pin"
            type="password"
            maxLength={4}
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="••••"
            className="block w-full text-center text-2xl tracking-[0.5em] rounded-xl border border-slate-200 bg-white py-3 text-slate-900 placeholder:text-slate-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-600"
            autoFocus
          />
        </div>

        <Button type="submit" loading={loading} className="w-full" disabled={pin.length !== 4}>
          <Unlock className="h-4 w-4" />
          Unlock
        </Button>

        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          5 incorrect attempts will lock the box for 15 minutes.
        </p>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. CHANGE PIN MODAL
// ---------------------------------------------------------------------------
function ChangePinModal({
  onClose,
  onSuccess,
  onLockedOut,
}: {
  onClose: () => void;
  onSuccess: (newPin: string) => void;
  onLockedOut: (remainingSeconds: number) => void;
}) {
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}$/.test(oldPin)) {
      setError('Current PIN must be 4 digits.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setError('New PIN must be 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('New PINs do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await changeFeedbackPin(oldPin, newPin);

      if (res.is_locked) {
        onLockedOut(res.remaining_seconds || 900);
        return;
      }

      if (res.success) {
        onSuccess(newPin);
      } else {
        setError(res.error || 'Incorrect current PIN.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Change Feedback PIN" description="Enter your current PIN and choose a new one." onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <Field
          id="current-pin"
          label="Current 4-Digit PIN"
          type="password"
          maxLength={4}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="••••"
          value={oldPin}
          onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          required
        />

        <Field
          id="new-pin"
          label="New 4-Digit PIN"
          type="password"
          maxLength={4}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="••••"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          required
        />

        <Field
          id="confirm-new-pin"
          label="Confirm New 4-Digit PIN"
          type="password"
          maxLength={4}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="••••"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          required
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={oldPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
          >
            Update PIN
          </Button>
        </div>
      </form>
    </Modal>
  );
}

