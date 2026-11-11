import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-xl border border-white/60 bg-white/80 p-2 text-slate-700 transition-all duration-200 hover:scale-105 hover:text-[#ff4d79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d79] dark:border-white/15 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-[#ff9040] cursor-pointer"
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
