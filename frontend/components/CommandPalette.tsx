'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Wallet,
  Filter,
  Activity,
  History,
  BarChart3,
  Bell,
  List,
  Newspaper,
  Settings,
  Search,
  LogOut,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore, useWatchlistStore } from '@/lib/store';

const PAGES = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: 'home overview' },
  { name: 'Portfolio', href: '/dashboard/portfolio', icon: Wallet, keywords: 'holdings stocks' },
  { name: 'Screener', href: '/dashboard/screener', icon: Filter, keywords: 'filter scan search stocks' },
  { name: 'F&O', href: '/dashboard/fno', icon: Activity, keywords: 'futures options derivatives' },
  { name: 'Backtest', href: '/dashboard/backtest', icon: History, keywords: 'strategy testing historical' },
  { name: 'Macro', href: '/dashboard/macro', icon: BarChart3, keywords: 'economy fii dii gdp' },
  { name: 'Signals', href: '/dashboard/signals', icon: Bell, keywords: 'anomaly alerts notifications' },
  { name: 'Watchlist', href: '/dashboard/watchlist', icon: List, keywords: 'watch track monitor' },
  { name: 'News', href: '/dashboard/news', icon: Newspaper, keywords: 'market news headlines' },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, keywords: 'account profile preferences' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { logout } = useAuthStore();
  const { symbols: watchlistSymbols } = useWatchlistStore();

  // Toggle with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const handleLogout = useCallback(() => {
    setOpen(false);
    logout();
    router.push('/login');
  }, [logout, router]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Command dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
            className="fixed inset-0 z-[101] flex items-start justify-center pt-[20vh] px-4"
          >
            <Command
              className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden"
              label="Command palette"
            >
              {/* Search input */}
              <div className="flex items-center px-4 border-b border-[var(--border-default)]">
                <Search className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                <Command.Input
                  placeholder="Type a command or search..."
                  className="flex-1 px-3 py-3.5 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-muted)] border border-[var(--border-default)] rounded">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-[var(--text-muted)]">
                  No results found.
                </Command.Empty>

                {/* Pages */}
                <Command.Group heading="Pages" className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 py-1.5">
                  {PAGES.map((page) => (
                    <Command.Item
                      key={page.href}
                      value={`${page.name} ${page.keywords}`}
                      onSelect={() => navigate(page.href)}
                      className="flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer text-[var(--text-secondary)] data-[selected=true]:bg-[var(--accent-subtle)] data-[selected=true]:text-[var(--text-primary)] transition-colors"
                    >
                      <page.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium flex-1">{page.name}</span>
                      <ArrowRight className="h-3 w-3 opacity-0 data-[selected=true]:opacity-100 transition-opacity" />
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Watchlist quick-nav */}
                {watchlistSymbols.length > 0 && (
                  <Command.Group heading="Watchlist" className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 py-1.5 mt-1">
                    {watchlistSymbols.slice(0, 8).map((sym) => (
                      <Command.Item
                        key={sym}
                        value={`stock ${sym}`}
                        onSelect={() => navigate('/dashboard/watchlist')}
                        className="flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer text-[var(--text-secondary)] data-[selected=true]:bg-[var(--accent-subtle)] data-[selected=true]:text-[var(--text-primary)] transition-colors"
                      >
                        <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-primary-400" />
                        <span className="text-sm font-mono">{sym}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Actions */}
                <Command.Group heading="Actions" className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 py-1.5 mt-1">
                  <Command.Item
                    value="logout sign out"
                    onSelect={handleLogout}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer text-red-400 data-[selected=true]:bg-red-500/8 transition-colors"
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Logout</span>
                  </Command.Item>
                </Command.Group>
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-default)] bg-[var(--bg-primary)]">
                <div className="flex items-center space-x-3 text-[10px] text-[var(--text-muted)]">
                  <span className="flex items-center space-x-1">
                    <kbd className="px-1 py-0.5 bg-[var(--bg-muted)] border border-[var(--border-default)] rounded font-mono">↑↓</kbd>
                    <span>Navigate</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <kbd className="px-1 py-0.5 bg-[var(--bg-muted)] border border-[var(--border-default)] rounded font-mono">↵</kbd>
                    <span>Select</span>
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">FinSight</span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
