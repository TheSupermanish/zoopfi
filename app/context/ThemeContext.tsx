'use client';

import { createContext, useContext, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Zoopfi is dark-only: one premium canvas across the whole app. We lock the
 * document to the `dark` class so every `dark:` utility resolves consistently.
 * Previously this read the system / saved preference and could apply `.light`,
 * which rendered the inner pages (that rely on `dark:` variants) in light mode
 * while the always-dark home/shell stayed dark — the visual mismatch we fixed.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#0a0512');
    try {
      localStorage.setItem('superpay-theme', 'dark');
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Theme is locked to dark; setters are no-ops kept for API compatibility.
  const noop = () => {};

  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: noop, setTheme: noop, mounted: true }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
