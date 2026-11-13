import { Flame, Star, Zap } from 'lucide-react';
import { getLevel, getLevelProgress } from '@/lib/levels';
import { EMPLOYEE_ROUTE_PATHS } from '@/lib/adminRoute';
import { StatCard } from '@/components/StatCard';
import { DailyProgress } from '@/components/employee/DailyProgress';

interface StatsTopBarProps {
  totalPoints: number;
  currentStreak: number;
  doneCount: number;
  totalTasks: number;
}

export function StatsTopBar({
  totalPoints,
  currentStreak,
  doneCount,
  totalTasks,
}: StatsTopBarProps) {
  const level = getLevel(totalPoints);
  const { percent, remaining, nextLevel } = getLevelProgress(totalPoints);

  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {/* 1. Points (clickable -> My progress: Points history) */}
      <StatCard
        icon={Zap}
        iconTone="text-[#ff4d79] bg-[#ff4d79]/10 dark:text-[#ff7195] dark:bg-[#ff4d79]/20"
        value={totalPoints}
        label="Points"
        href="#/progress#points-history"
        actionText="View →"
      />

      {/* 2. Day streak (clickable -> My progress: Streaks) */}
      <StatCard
        icon={Flame}
        iconTone="text-[#ff6a5c] bg-[#ff6a5c]/10 dark:text-[#ff9040] dark:bg-[#ff9040]/20"
        value={currentStreak}
        label="Day streak"
        href="#/progress#streaks"
        actionText="View →"
      />

      {/* 3. Level (clickable -> My progress: Badges) */}
      <StatCard
        icon={Star}
        iconTone="text-[#ff9040] bg-[#ff9040]/10 dark:text-[#ff9a3d] dark:bg-[#ff9040]/20"
        value={level.name}
        label="Level"
        href="#/progress#badges"
        actionText="View →"
      >
        <div className="space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ff4d79] to-[#ff9040] transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {nextLevel ? `${remaining} pts to ${nextLevel.name}` : 'Max level'}
          </p>
        </div>
      </StatCard>

      {/* 4. Today (not clickable) */}
      <DailyProgress done={doneCount} total={totalTasks} />
    </section>
  );
}
