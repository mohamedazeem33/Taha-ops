import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { Loader2, X } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const buttonSizes: Record<ButtonSize, string> = {
  sm: '!px-3 !py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
};

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-[#ff4d79] via-[#ff6a5c] to-[#ff9040] text-[#1c0627] font-bold shadow-md shadow-[#ff4d79]/20 hover:brightness-105 focus-visible:ring-[#ff4d79]',
  secondary:
    'border border-white/60 bg-white/80 text-slate-800 hover:bg-white dark:border-white/15 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:ring-[#ff4d79]',
  ghost:
    'text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10 focus-visible:ring-[#ff4d79]',
  danger:
    'border border-rose-300 bg-white/90 text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-slate-900/90 dark:text-rose-300 dark:hover:bg-rose-950/40 focus-visible:ring-rose-500',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl ${buttonSizes[size]} transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-[#100e28] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${buttonVariants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden="true" />}
      {children}
    </button>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

export function Field({ label, id, ...props }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="block w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#ff4f7b] focus:outline-none focus:ring-4 focus:ring-[#ff4f7b]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#100e28]/90 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </div>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
}

export function TextAreaField({ label, id, rows = 3, ...props }: TextAreaFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        {...props}
        className="block w-full resize-none rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#ff4f7b] focus:outline-none focus:ring-4 focus:ring-[#ff4f7b]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#100e28]/90 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </div>
  );
}

interface AlertProps {
  tone: 'error' | 'info';
  children: ReactNode;
}

const alertTones: Record<AlertProps['tone'], string> = {
  error:
    'border-rose-200 bg-rose-50/90 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200',
  info: 'border-brand-200 bg-brand-50/90 text-brand-900 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-200',
};

export function Alert({ tone, children }: AlertProps) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border px-4 py-3 text-sm ${alertTones[tone]}`}>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-[#ff4f7b]" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, description, onClose, children }: ModalProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 backdrop-blur-md sm:items-center sm:p-4 animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full rounded-t-3xl border border-white/50 bg-white/95 p-6 shadow-2xl sm:max-w-md sm:rounded-3xl dark:border-white/10 dark:bg-[#100e28]/95 backdrop-blur-xl animate-slide-up"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
