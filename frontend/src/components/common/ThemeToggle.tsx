import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-2 rounded-xl transition-all border ${
        theme === 'dark'
          ? 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-amber-300 hover:text-amber-200 shadow-sm'
          : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700 hover:text-zinc-900 shadow-sm'
      } ${className}`}
      title={theme === 'dark' ? 'Switch to Google White Theme' : 'Switch to Google Night Theme'}
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
