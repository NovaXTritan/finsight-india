'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useWatchlistStore, useThemeStore } from '@/lib/store';
import { watchlistApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CommandPalette } from '@/components/CommandPalette';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  LayoutDashboard,
  Bell,
  List,
  Newspaper,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  Wallet,
  Filter,
  Activity,
  History,
  BarChart3,
  Search,
  Target,
  Sun,
  Moon,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Portfolio', href: '/dashboard/portfolio', icon: Wallet },
  { name: 'Screener', href: '/dashboard/screener', icon: Filter },
  { name: 'F&O', href: '/dashboard/fno', icon: Activity },
  { name: 'Backtest', href: '/dashboard/backtest', icon: History },
  { name: 'Macro', href: '/dashboard/macro', icon: BarChart3 },
  { name: 'Signals', href: '/dashboard/signals', icon: Bell },
  { name: 'Track Record', href: '/dashboard/track-record', icon: Target },
  { name: 'Watchlist', href: '/dashboard/watchlist', icon: List },
  { name: 'News', href: '/dashboard/news', icon: Newspaper },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, token, fetchUser, logout } = useAuthStore();
  const { setWatchlist } = useWatchlistStore();
  const { theme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');

      if (!storedToken) {
        router.push('/login');
        return;
      }

      const needsUserFetch = !useAuthStore.getState().user;

      const [, watchlistData] = await Promise.all([
        needsUserFetch ? fetchUser() : Promise.resolve(),
        watchlistApi.get().catch(() => {
          console.error('Failed to fetch watchlist');
          return null;
        }),
      ]);

      if (!useAuthStore.getState().isAuthenticated) {
        router.push('/login');
        return;
      }

      if (watchlistData) {
        setWatchlist(watchlistData.symbols, watchlistData.count, watchlistData.limit);
      }

      setIsLoading(false);
    };

    initAuth();
  }, [isHydrated, fetchUser, router, setWatchlist]);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary-500/20 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary-400" />
          </div>
          <div className="h-1 w-24 mx-auto rounded-full overflow-hidden bg-[var(--bg-muted)]">
            <motion.div
              className="h-full bg-primary-500 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <CommandPalette />
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[220px] transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full bg-[var(--bg-primary)] border-r border-[var(--border-default)] flex flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--border-default)]">
            <Link href="/dashboard" className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-display font-bold text-[var(--text-primary)]">FinSight</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg transition-all duration-100 ${
                    isActive
                      ? 'nav-item-active text-primary-400'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${isActive ? 'text-primary-400' : ''}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Tier info */}
          {user && (
            <div className="p-3 border-t border-[var(--border-default)]">
              <div className="bg-[var(--bg-muted)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-primary-400 uppercase tracking-wider">
                    {user.tier} Plan
                  </span>
                  {user.tier === 'free' && (
                    <Link
                      href="/dashboard/settings"
                      className="text-[10px] font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
                <div className="text-xs text-[var(--text-muted)] font-mono mb-1.5">
                  {user.watchlist_count}/{user.tier_limit} symbols
                </div>
                <div className="progress">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${Math.min((user.watchlist_count / user.tier_limit) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <div className="p-2 border-t border-[var(--border-default)]">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2.5 w-full px-3 py-2 text-[var(--text-secondary)] hover:bg-red-500/8 hover:text-red-400 rounded-lg transition-all duration-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[220px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-lg border-b border-[var(--border-default)]">
          <div className="px-4 py-2 lg:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-muted)] transition-all"
                >
                  <Menu className="h-5 w-5" />
                </button>

                {/* Page title from pathname */}
                <h2 className="hidden lg:block text-sm font-medium text-[var(--text-secondary)]">
                  {navigation.find(n => n.href === pathname)?.name || 'Dashboard'}
                </h2>
              </div>

              <div className="flex items-center space-x-2">
                {/* Cmd+K trigger */}
                <button
                  onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                  className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span className="text-xs">Search</span>
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-[var(--bg-card)] border border-[var(--border-default)] rounded">⌘K</kbd>
                </button>
                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--bg-muted)]"
                  >
                    <div className="w-7 h-7 bg-primary-500/15 border border-primary-500/25 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-400">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm font-medium">{user?.name}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setUserMenuOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.97 }}
                          transition={{ duration: 0.12 }}
                          className="absolute right-0 mt-1 w-52 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl py-1 z-50 shadow-lg"
                        >
                          <div className="px-3 py-2.5 border-b border-[var(--border-default)]">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{user?.email}</p>
                            <div className="mt-1.5">
                              <span className="badge text-[10px]">{user?.tier} Plan</span>
                            </div>
                          </div>
                          <Link
                            href="/dashboard/settings"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center space-x-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
                          >
                            <Settings className="h-3.5 w-3.5" />
                            <span>Settings</span>
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/8 transition-colors"
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            <span>Logout</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content with framer-motion */}
        <main className="p-4 lg:p-6 pb-16">
          <ErrorBoundary>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </ErrorBoundary>
        </main>

        {/* Footer */}
        <footer className="border-t border-[var(--border-default)] bg-[var(--bg-primary)]">
          <div className="px-4 py-2 lg:px-6">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>&copy; {new Date().getFullYear()} FinSight India</span>
              <div className="flex items-center space-x-3">
                <Link href="/terms" className="text-primary-500 hover:text-primary-400 transition-colors">Terms</Link>
                <Link href="/privacy" className="text-primary-500 hover:text-primary-400 transition-colors">Privacy</Link>
                <Link href="/disclaimer" className="text-primary-500 hover:text-primary-400 transition-colors">Disclaimer</Link>
                <span className="text-[var(--border-primary)]">|</span>
                <span>Built by Divyanshu Kumar</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
