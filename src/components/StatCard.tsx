import type { ElementType, ReactNode } from 'react';

export interface StatCardProps {
  icon: ElementType;
  iconTone: string;
  value: ReactNode;
  label: string;
  href?: string;
  actionText?: string;
  children?: ReactNode;
  className?: string;
}

export function StatCard({
  icon: Icon,
  iconTone,
  value,
  label,
  href,
  actionText = 'View →',
  children,
  className = '',
}: StatCardProps) {
  const innerContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
              href ? 'group-hover:scale-105' : ''
            } ${iconTone}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          {href && actionText && (
            <span className="text-xs font-semibold text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-brand-400">
              {actionText}
            </span>
          )}
        </div>
        <div className="font-display mt-3 text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
          {value}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      {children && <div className="mt-2.5">{children}</div>}
    </div>
  );

  const baseClasses =
    'rounded-2xl border border-white/60 bg-white p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-slate-900';

  if (href) {
    return (
      <a
        href={href}
        className={`group block h-full ${baseClasses} transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-400/60 hover:shadow-md active:scale-[0.98] dark:hover:border-brand-500/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d79] ${className}`}
      >
        {innerContent}
      </a>
    );
  }

  return (
    <div className={`h-full ${baseClasses} ${className}`}>
      {innerContent}
    </div>
  );
}

