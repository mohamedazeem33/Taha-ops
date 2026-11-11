import { Award, CalendarCheck, Flame, Lock, Sun } from 'lucide-react';
import type { Badge, EmployeeBadge } from '@/types/database';

const ICONS: Record<string, typeof Award> = {
  award: Award,
  sun: Sun,
  flame: Flame,
  'calendar-check': CalendarCheck,
};

interface BadgeGalleryProps {
  badges: Badge[];
  earned: EmployeeBadge[];
}

export function BadgeGallery({ badges, earned }: BadgeGalleryProps) {
  const earnedIds = new Set(earned.map((badge) => badge.badge_id));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {badges.map((badge) => {
        const isEarned = earnedIds.has(badge.id);
        const Icon = ICONS[badge.icon_name] ?? Award;
        return (
          <div
            key={badge.id}
            className={`flex flex-col items-center rounded-2xl border p-5 text-center transition ${
              isEarned
                ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/20'
                : 'border-slate-200 bg-slate-50 opacity-60 dark:border-slate-800 dark:bg-slate-900/50'
            }`}
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                isEarned
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                  : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
              }`}
            >
              {isEarned ? <Icon className="h-7 w-7" aria-hidden="true" /> : <Lock className="h-6 w-6" aria-hidden="true" />}
            </span>
            <p className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{badge.name}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{badge.description}</p>
            {isEarned && (
              <span className="mt-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                Earned
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
