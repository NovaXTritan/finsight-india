import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User } from './api';

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      isAuthenticated: false,

      setToken: (token: string) => {
        localStorage.setItem('token', token);
        set({ token, isAuthenticated: true });
      },

      setUser: (user: User) => {
        set({ user });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false });
      },

      fetchUser: async () => {
        const token = get().token;
        if (!token) return;

        set({ isLoading: true });
        try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true });
        } catch (error) {
          set({ token: null, user: null, isAuthenticated: false });
          localStorage.removeItem('token');
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const data = await authApi.login(email, password);
          localStorage.setItem('token', data.access_token);
          set({ token: data.access_token, isAuthenticated: true });

          // Fetch user data
          const user = await authApi.me();
          set({ user });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        try {
          const data = await authApi.register(email, password, name);
          localStorage.setItem('token', data.access_token);
          set({ token: data.access_token, isAuthenticated: true });

          // Fetch user data
          const user = await authApi.me();
          set({ user });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// Watchlist store
interface WatchlistState {
  symbols: string[];
  count: number;
  limit: number;
  isLoading: boolean;

  setWatchlist: (symbols: string[], count: number, limit: number) => void;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
}

export const useWatchlistStore = create<WatchlistState>()((set, get) => ({
  symbols: [],
  count: 0,
  limit: 5,
  isLoading: false,

  setWatchlist: (symbols, count, limit) => {
    set({ symbols, count, limit });
  },

  addSymbol: (symbol) => {
    const { symbols, count } = get();
    if (!symbols.includes(symbol)) {
      set({ symbols: [...symbols, symbol], count: count + 1 });
    }
  },

  removeSymbol: (symbol) => {
    const { symbols, count } = get();
    set({
      symbols: symbols.filter(s => s !== symbol),
      count: Math.max(0, count - 1)
    });
  },
}));
