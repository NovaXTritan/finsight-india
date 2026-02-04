'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useWatchlistStore, useThemeStore } from '@/lib/store';
import { watchlistApi } from '@/lib/api';
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
  const { theme, toggleTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const initAuth = async () => {
      // Check localStorage directly for token (more reliable than zustand during hydration)
      const storedToken = localStorage.getItem('token');

      if (!storedToken) {
        router.push('/login');
        return;
      }

      // Fetch user and watchlist in parallel for faster initialization
      const [, watchlistData] = await Promise.all([
        fetchUser(),
        watchlistApi.get().catch((error) => {
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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 bg-primary-500/30 blur-xl rounded-full animate-pulse" />
            <TrendingUp className="relative h-16 w-16 text-primary-600 animate-pulse" />
          </div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950 transition-colors duration-300">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full glass-card-dashboard border-r-0 rounded-none rounded-r-2xl">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-primary-100/50 dark:border-primary-800/50">
            <Link href="/dashboard" className="flex items-center space-x-2 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-500/20 blur-md rounded-full group-hover:bg-primary-500/30 transition-all" />
                <TrendingUp className="relative h-8 w-8 text-primary-600" />
              </div>
              <span className="text-xl font-bold gradient-text-static">FinSight</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-primary-100/50 dark:hover:bg-primary-900/30 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'nav-item-active text-primary-700 bg-primary-100/60 dark:text-primary-400 dark:bg-primary-900/40'
                      : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700 dark:text-gray-400 dark:hover:bg-primary-900/30 dark:hover:text-primary-400'
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-primary-600' : ''}`} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User tier info */}
          {user && (
            <div className="absolute bottom-20 left-4 right-4">
              <div className="glass-card-purple p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-primary-700 uppercase tracking-wide">
                    {user.tier} Tier
                  </span>
                  {user.tier === 'free' && (
                    <Link
                      href="/dashboard/settings"
                      className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {user.watchlist_count} / {user.tier_limit} symbols
                </div>
                <div className="progress-gradient mt-2">
                  <div
                    className="progress-gradient-bar"
                    style={{
                      width: `${Math.min((user.watchlist_count / user.tier_limit) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-3 py-2.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 mx-4 mt-4 lg:mx-6">
          <div className="glass-card-dashboard px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-primary-600 p-2 rounded-lg hover:bg-primary-100/50 transition-all"
              >
                <Menu className="h-6 w-6" />
              </button>

              {/* Page title placeholder */}
              <div className="hidden lg:block" />

              <div className="flex items-center space-x-3">
                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-100/50 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-primary-900/30 transition-all"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-700 dark:text-gray-300 dark:hover:text-primary-400 transition-colors"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center shadow-glow">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <span className="hidden sm:block font-medium">{user?.name}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 glass-card-dashboard py-1 z-50 animate-slide-down shadow-lg">
                      <div className="px-4 py-3 border-b border-primary-100/50 dark:border-primary-800/50">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                        <div className="mt-2">
                          <span className="badge-glass">{user?.tier} Plan</span>
                        </div>
                      </div>
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 dark:text-gray-300 dark:hover:bg-primary-900/30 transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 pb-20 animate-page-enter">{children}</main>

        {/* Footer */}
        <footer className="fixed bottom-0 right-0 left-0 lg:left-64 z-20">
          <div className="mx-4 mb-4 lg:mx-6 glass-card-dashboard px-4 py-2">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>&copy; {new Date().getFullYear()} FinSight India</span>
              <div className="flex items-center space-x-3">
                <span>Built by Divyanshu Kumar</span>
                <a
                  href="https://novaxtritan.github.io/novaxtritanxmetamorphosis/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Portfolio
                </a>
                <a
                  href="https://www.linkedin.com/in/divyanshukumar27"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 transition-colors"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
