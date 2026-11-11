import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'points' | 'info' | 'error';
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = window.setTimeout(() => {
        setVisible(false);
        window.setTimeout(onDismiss, 300);
      }, 3500);
      return () => window.clearTimeout(timer);
    }
    setVisible(false);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const toneStyles =
    toast.tone === 'points'
      ? 'bg-gradient-to-r from-[#ff4d79] via-[#ff6a5c] to-[#ff9040] text-[#1c0627] font-bold shadow-lg shadow-[#ff4d79]/30'
      : toast.tone === 'error'
        ? 'bg-rose-600 text-white shadow-lg'
        : 'bg-[#100e28] text-white border border-white/20 shadow-lg';

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 ${toneStyles}`}>
        {toast.tone === 'points' && <Sparkles className="h-5 w-5" aria-hidden="true" />}
        <span className="text-sm font-semibold">{toast.text}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 transition hover:bg-black/10 dark:hover:bg-white/20"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
