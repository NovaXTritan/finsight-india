'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/lib/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const root = document.documentElement;
      root.setAttribute('data-theme', theme);
      // Also toggle class for Tailwind dark: variants
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    }
  }, [theme, mounted]);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
