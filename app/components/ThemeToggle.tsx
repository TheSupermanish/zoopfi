'use client';

import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme();

  // Render a placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className={`relative flex items-center gap-2 p-2 rounded-xl ${className}`}
        aria-label="Toggle theme"
      >
        <span className="text-lg opacity-50">🌙</span>
        {showLabel && (
          <span className="text-sm font-medium text-slate-600 dark:text-[#ad92c9] opacity-50">
            Theme
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center gap-2 p-2 rounded-xl transition-all hover:bg-black/5 dark:hover:bg-white/10 ${className}`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {/* Icon - show current theme's icon */}
      <span className="text-lg">
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
      
      {showLabel && (
        <span className="text-sm font-medium text-slate-600 dark:text-[#ad92c9]">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}

// Pill-style toggle for settings page
export function ThemeTogglePill() {
  const { theme, setTheme, mounted } = useTheme();

  // Render a placeholder during SSR
  if (!mounted) {
    return (
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-[#362348] opacity-50">
        <div className="px-4 py-2 rounded-lg text-sm font-bold">☀️ Light</div>
        <div className="px-4 py-2 rounded-lg text-sm font-bold">🌙 Dark</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-[#362348]">
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
          theme === 'light'
            ? 'bg-white dark:bg-[#1a1122] text-[#7f13ec] shadow-sm'
            : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-700 dark:hover:text-white'
        }`}
      >
        <span>☀️</span>
        Light
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
          theme === 'dark'
            ? 'bg-white dark:bg-[#1a1122] text-[#7f13ec] shadow-sm'
            : 'text-slate-500 dark:text-[#ad92c9] hover:text-slate-700 dark:hover:text-white'
        }`}
      >
        <span>🌙</span>
        Dark
      </button>
    </div>
  );
}

