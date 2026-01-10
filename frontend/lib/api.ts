import axios, { AxiosError } from 'axios';

// Use environment variable for API URL, fallback to relative path for same-origin
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  tier: string;
  created_at: string;
  watchlist_count: number;
  tier_limit: number;
}

export interface Signal {
  id: string;
  symbol: string;
  pattern_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  z_score: number;
  price: number;
  volume: number;
  detected_at: string;
  agent_decision: string;
  agent_confidence: number;
  agent_reason: string;
}

export interface Index {
  name: string;
  value: number;
  change: number;
  change_pct: number;
}

export interface FiiDii {
  date: string;
  fii_buy: number;
  fii_sell: number;
  fii_net: number;
  dii_buy: number;
  dii_sell: number;
  dii_net: number;
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  sentiment: string;
  symbols: string[];
}

export interface MarketSummary {
  market_status: {
    is_open: boolean;
    market: string;
  };
  indices: Index[];
  fii_dii: FiiDii;
  top_gainers: any[];
  top_losers: any[];
}

// Auth APIs
export const authApi = {
  register: async (email: string, password: string, name: string) => {
    const res = await api.post('/auth/register', { email, password, name });
    return res.data;
  },

  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  me: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  refresh: async () => {
    const res = await api.post('/auth/refresh');
    return res.data;
  },
};

// Watchlist APIs
export const watchlistApi = {
  get: async () => {
    const res = await api.get('/watchlist');
    return res.data;
  },

  add: async (symbol: string) => {
    const res = await api.post('/watchlist', { symbol });
    return res.data;
  },

  remove: async (symbol: string) => {
    const res = await api.delete(`/watchlist/${symbol}`);
    return res.data;
  },
};

// Signals APIs
export const signalsApi = {
  get: async (page = 1, perPage = 20) => {
    const res = await api.get('/signals', { params: { page, per_page: perPage } });
    return res.data;
  },

  getLatest: async (limit = 5) => {
    const res = await api.get('/signals/latest', { params: { limit } });
    return res.data;
  },

  getById: async (id: string): Promise<Signal> => {
    const res = await api.get(`/signals/${id}`);
    return res.data;
  },

  recordAction: async (id: string, action: string, notes?: string) => {
    const res = await api.post(`/signals/${id}/action`, { action, notes });
    return res.data;
  },

  getBySymbol: async (symbol: string, limit = 10) => {
    const res = await api.get(`/signals/symbol/${symbol}`, { params: { limit } });
    return res.data;
  },
};

// Market APIs
export const marketApi = {
  getSummary: async (): Promise<MarketSummary> => {
    const res = await api.get('/market/summary');
    return res.data;
  },

  getIndices: async () => {
    const res = await api.get('/market/indices');
    return res.data;
  },

  getFiiDii: async (): Promise<FiiDii> => {
    const res = await api.get('/market/fii-dii');
    return res.data;
  },

  getBulkDeals: async () => {
    const res = await api.get('/market/bulk-deals');
    return res.data;
  },

  getBlockDeals: async () => {
    const res = await api.get('/market/block-deals');
    return res.data;
  },

  getNews: async (limit = 50, symbol?: string) => {
    const res = await api.get('/market/news', { params: { limit, symbol } });
    return res.data;
  },

  getNifty50: async () => {
    const res = await api.get('/market/nifty50');
    return res.data;
  },

  getStockPrice: async (symbol: string) => {
    const res = await api.get(`/market/stock/${symbol}/price`);
    return res.data;
  },
};

export default api;
