'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useWatchlistStore } from '@/lib/store';
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

      await fetchUser();

      if (!useAuthStore.getState().isAuthenticated) {
        router.push('/login');
        return;
      }

      // Fetch watchlist
      try {
        const data = await watchlistApi.get();
        setWatchlist(data.symbols, data.count, data.limit);
      } catch (error) {
        console.error('Failed to fetch watchlist');
      }

      setIsLoading(false);
    };

    initAuth();
  }, [isHydrated, fetchUser, router, setWatchlist]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="h-12 w-12 text-primary-500 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-primary-600" />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
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
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
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
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {user.tier} Tier
                </span>
                {user.tier === 'free' && (
                  <Link
                    href="/dashboard/upgrade"
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Upgrade
                  </Link>
                )}
              </div>
              <div className="text-sm text-gray-600">
                {user.watchlist_count} / {user.tier_limit} symbols
              </div>
              <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{
                    width: `${(user.watchlist_count / user.tier_limit) * 100}%`,
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
            className="flex items-center space-x-3 w-full px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Page title placeholder */}
            <div className="hidden lg:block" />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-600" />
                </div>
                <span className="hidden sm:block font-medium">{user?.name}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6 pb-16">{children}</main>

        {/* Footer */}
        <footer className="fixed bottom-0 right-0 left-0 lg:left-64 bg-white border-t border-gray-200 py-2 px-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>&copy; {new Date().getFullYear()} FinSight India</span>
            <div className="flex items-center space-x-3">
              <span>Built by Divyanshu Kumar</span>
              <a
                href="https://novaxtritan.github.io/novaxtritanxmetamorphosis/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700"
              >
                Portfolio
              </a>
              <a
                href="https://www.linkedin.com/in/divyanshukumar27"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
