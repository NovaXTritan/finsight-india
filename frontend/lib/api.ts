import axios, { AxiosError } from 'axios';

// Use environment variable for API URL, fallback to relative path for same-origin
const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

// Cache token in memory to avoid localStorage reads on every request
let cachedToken: string | null = null;

// Token management functions
export function setAuthToken(token: string | null): void {
  cachedToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }
}

export function getAuthToken(): string | null {
  if (cachedToken) return cachedToken;
  if (typeof window !== 'undefined') {
    cachedToken = localStorage.getItem('token');
  }
  return cachedToken;
}

export function clearAuthToken(): void {
  cachedToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests (uses cached token)
api.interceptors.request.use((config) => {
  const token = getAuthToken();
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
      clearAuthToken();
      if (typeof window !== 'undefined') {
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
  context?: string;
  sources?: string;
  thought_process?: string;
}

export interface Index {
  name?: string;
  value: number;
  change: number;
  change_pct: number;
  open?: number;
  high?: number;
  low?: number;
}

// Indices as returned by API (object with index names as keys)
export interface IndicesMap {
  [key: string]: Omit<Index, 'name'>;
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
  category: 'all' | 'markets' | 'economy' | 'stocks' | 'ipo';
  symbols: string[];
}

export interface NewsResponse {
  news: NewsItem[];
  count: number;
  category_counts: {
    all: number;
    markets: number;
    economy: number;
    stocks: number;
    ipo: number;
  };
  timestamp: string;
}

// Portfolio Types
export interface Holding {
  id: number;
  symbol: string;
  quantity: number;
  avg_price: number;
  invested_value: number;
  current_price?: number;
  current_value?: number;
  gain_loss?: number;
  gain_loss_pct?: number;
  day_change?: number;
  day_change_pct?: number;
  notes?: string;
  updated_at: string;
}

export interface HoldingList {
  holdings: Holding[];
  total_invested: number;
  total_current_value: number;
  total_gain_loss: number;
  total_gain_loss_pct: number;
  day_change: number;
  day_change_pct: number;
}

export interface Transaction {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'SPLIT' | 'BONUS';
  quantity?: number;
  price?: number;
  amount?: number;
  fees: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
}

export interface TransactionList {
  transactions: Transaction[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

export interface PortfolioSummary {
  total_invested: number;
  total_current_value: number;
  total_gain_loss: number;
  total_gain_loss_pct: number;
  day_change: number;
  day_change_pct: number;
  holdings_count: number;
  top_gainer?: string;
  top_loser?: string;
  sector_allocation?: Record<string, number>;
}

export interface PortfolioPerformance {
  dates: string[];
  values: number[];
  invested: number[];
  returns: number[];
  xirr?: number;
  cagr?: number;
}

// Screener Types
export interface ScreenerFilters {
  pe_min?: number;
  pe_max?: number;
  pb_min?: number;
  pb_max?: number;
  roe_min?: number;
  roe_max?: number;
  dividend_yield_min?: number;
  dividend_yield_max?: number;
  debt_to_equity_max?: number;
  current_ratio_min?: number;
  market_cap_min?: number;
  market_cap_max?: number;
  sectors?: string[];
  industries?: string[];
  near_52w_high?: number;
  near_52w_low?: number;
  is_fno?: boolean;
  eps_min?: number;
  beta_min?: number;
  beta_max?: number;
}

export interface StockFundamentals {
  symbol: string;
  name?: string;
  sector?: string;
  industry?: string;
  market_cap?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  ps_ratio?: number;
  dividend_yield?: number;
  roe?: number;
  roce?: number;
  debt_to_equity?: number;
  current_ratio?: number;
  eps?: number;
  book_value?: number;
  high_52w?: number;
  low_52w?: number;
  current_price?: number;
  price_to_52w_high?: number;
  price_to_52w_low?: number;
  avg_volume_30d?: number;
  beta?: number;
  is_fno: boolean;
  updated_at?: string;
}

export interface ScreenerResult {
  stocks: StockFundamentals[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
  filters_applied: Record<string, any>;
}

export interface ScreenerFilterOptions {
  pe_ratio: { min: number; max: number };
  pb_ratio: { min: number; max: number };
  roe: { min: number; max: number };
  dividend_yield: { min: number; max: number };
  debt_to_equity: { min: number; max: number };
  market_cap: { min: number; max: number };
  current_ratio: { min: number; max: number };
  eps: { min: number; max: number };
  beta: { min: number; max: number };
  sectors: string[];
  industries: string[];
}

export interface SavedScreener {
  id: number;
  name: string;
  filters: Record<string, any>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScreenerPreset {
  name: string;
  description: string;
  filters: ScreenerFilters;
}

// F&O Types
export interface OptionData {
  strike: number;
  expiry_date: string;
  option_type: 'CE' | 'PE';
  ltp?: number;
  bid?: number;
  ask?: number;
  volume: number;
  oi: number;
  oi_change: number;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface OptionChain {
  symbol: string;
  spot_price: number;
  expiry_date: string;
  expiry_dates: string[];
  lot_size: number;
  options: OptionData[];
  total_ce_oi: number;
  total_pe_oi: number;
  timestamp: string;
}

export interface StrikeData {
  strike: number;
  is_atm: boolean;
  is_itm_ce: boolean;
  is_itm_pe: boolean;
  ce?: OptionData;
  pe?: OptionData;
}

export interface OptionChainByStrikes {
  symbol: string;
  spot_price: number;
  atm_strike: number;
  expiry_date: string;
  lot_size: number;
  strikes: StrikeData[];
  total_ce_oi: number;
  total_pe_oi: number;
}

export interface MaxPainResult {
  symbol: string;
  expiry_date: string;
  max_pain: number;
  current_price: number;
  distance_from_spot: number;
  pain_values: Record<string, number>;
}

export interface PCRResult {
  symbol: string;
  pcr_volume: number;
  pcr_oi: number;
  call_volume: number;
  put_volume: number;
  call_oi: number;
  put_oi: number;
  sentiment: string;
  description: string;
}

export interface OIAnalysis {
  symbol: string;
  spot_price: number;
  expiry_date: string;
  max_ce_oi_strike: number;
  max_pe_oi_strike: number;
  max_ce_oi: number;
  max_pe_oi: number;
  support_levels: number[];
  resistance_levels: number[];
  sentiment: string;
}

export interface FNOSymbol {
  symbol: string;
  lot_size: number;
  is_index: boolean;
}

export interface MarketSummary {
  market_open?: boolean;
  market_status?: {
    is_open: boolean;
    market: string;
  };
  indices: IndicesMap;
  fii_dii?: FiiDii;
  top_gainers?: any[];
  top_losers?: any[];
  timestamp?: string;
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

// Enriched watchlist types
export interface SparklinePoint {
  date: string;
  price: number;
}

export interface EnrichedStock {
  symbol: string;
  name: string;
  current_price?: number;
  prev_close?: number;
  day_change?: number;
  day_change_pct?: number;
  high_52w?: number;
  low_52w?: number;
  position_52w?: number;
  pe_ratio?: number;
  market_cap?: number;
  volume?: number;
  avg_volume?: number;
  sparkline: SparklinePoint[];
  last_updated: string;
  error?: string;
}

export interface EnrichedWatchlist {
  symbols: EnrichedStock[];
  count: number;
  timestamp: string;
}

// Watchlist APIs
export const watchlistApi = {
  get: async () => {
    const res = await api.get('/watchlist');
    return res.data;
  },

  getEnriched: async (): Promise<EnrichedWatchlist> => {
    const res = await api.get('/watchlist/enriched');
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

// Demo signal type
export interface DemoSignal extends Signal {
  is_demo: boolean;
  context?: string;
}

export interface DemoSignalsResponse {
  signals: DemoSignal[];
  total: number;
  is_demo: boolean;
  message: string;
}

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

  getDemo: async (): Promise<DemoSignalsResponse> => {
    const res = await api.get('/signals/demo');
    return res.data;
  },

  runDetection: async () => {
    const res = await api.post('/signals/detect');
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

  getNews: async (limit = 50, symbol?: string, category?: string): Promise<NewsResponse> => {
    const res = await api.get('/market/news', { params: { limit, symbol, category } });
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

// F&O APIs
export const optionsApi = {
  getChain: async (symbol: string): Promise<OptionChain> => {
    const res = await api.get(`/options/chain/${symbol}`);
    return res.data;
  },

  getChainByStrikes: async (symbol: string, strikeRange = 10): Promise<OptionChainByStrikes> => {
    const res = await api.get(`/options/chain/${symbol}/strikes`, {
      params: { strike_range: strikeRange }
    });
    return res.data;
  },

  getExpiries: async (symbol: string): Promise<{ symbol: string; expiry_dates: string[]; nearest_expiry: string }> => {
    const res = await api.get(`/options/expiries/${symbol}`);
    return res.data;
  },

  getMaxPain: async (symbol: string): Promise<MaxPainResult> => {
    const res = await api.get(`/options/max-pain/${symbol}`);
    return res.data;
  },

  getPCR: async (symbol: string): Promise<PCRResult> => {
    const res = await api.get(`/options/pcr/${symbol}`);
    return res.data;
  },

  getOIAnalysis: async (symbol: string): Promise<OIAnalysis> => {
    const res = await api.get(`/options/oi-analysis/${symbol}`);
    return res.data;
  },

  getSymbols: async (): Promise<FNOSymbol[]> => {
    const res = await api.get('/options/symbols');
    return res.data;
  },

  getLotSize: async (symbol: string): Promise<{ symbol: string; lot_size: number; is_fno: boolean }> => {
    const res = await api.get(`/options/lot-size/${symbol}`);
    return res.data;
  },

  getIVPercentile: async (symbol: string): Promise<{
    symbol: string;
    current_iv: number;
    atm_strike: number;
    iv_percentile: number;
    iv_interpretation: string;
    recommendation: string;
  }> => {
    const res = await api.get(`/options/iv-percentile/${symbol}`);
    return res.data;
  },

  calculateGreeks: async (
    spot: number,
    strike: number,
    expiryDays: number,
    iv: number,
    optionType: 'CE' | 'PE'
  ) => {
    const res = await api.get('/options/greeks', {
      params: {
        spot,
        strike,
        expiry_days: expiryDays,
        iv,
        option_type: optionType
      }
    });
    return res.data;
  },
};

// Screener APIs
export const screenerApi = {
  getFilters: async (): Promise<ScreenerFilterOptions> => {
    const res = await api.get('/screener/filters');
    return res.data;
  },

  run: async (
    filters: ScreenerFilters,
    page = 1,
    perPage = 50,
    sortBy = 'market_cap',
    sortOrder = 'desc'
  ): Promise<ScreenerResult> => {
    const res = await api.post('/screener/run', filters, {
      params: { page, per_page: perPage, sort_by: sortBy, sort_order: sortOrder }
    });
    return res.data;
  },

  getStock: async (symbol: string, refresh = false): Promise<StockFundamentals> => {
    const res = await api.get(`/screener/stock/${symbol}`, { params: { refresh } });
    return res.data;
  },

  getSavedScreeners: async (): Promise<{ screeners: SavedScreener[]; total: number }> => {
    const res = await api.get('/screener/saved');
    return res.data;
  },

  saveScreener: async (name: string, filters: ScreenerFilters, isPublic = false): Promise<SavedScreener> => {
    const res = await api.post('/screener/save', { name, filters, is_public: isPublic });
    return res.data;
  },

  deleteScreener: async (id: number) => {
    const res = await api.delete(`/screener/saved/${id}`);
    return res.data;
  },

  getPresets: async (): Promise<{ presets: ScreenerPreset[] }> => {
    const res = await api.get('/screener/presets');
    return res.data;
  },

  getSectors: async (): Promise<{ sectors: { sector: string; count: number }[] }> => {
    const res = await api.get('/screener/sectors');
    return res.data;
  },

  getIndustries: async (sector?: string): Promise<{ industries: { industry: string; count: number }[] }> => {
    const res = await api.get('/screener/industries', { params: { sector } });
    return res.data;
  },

  getStatus: async (): Promise<{
    total_stocks: number;
    stale_stocks: number;
    needs_population: boolean;
    needs_refresh: boolean;
    message: string;
  }> => {
    const res = await api.get('/screener/status');
    return res.data;
  },

  populate: async (mode: 'priority' | 'top100' | 'all' = 'priority'): Promise<{
    message: string;
    mode: string;
    symbols_count: number;
  }> => {
    const res = await api.post('/screener/populate', null, { params: { mode } });
    return res.data;
  },
};

// Portfolio APIs
export const portfolioApi = {
  // Holdings
  getHoldings: async (): Promise<HoldingList> => {
    const res = await api.get('/portfolio');
    return res.data;
  },

  addHolding: async (symbol: string, quantity: number, avg_price: number, notes?: string): Promise<Holding> => {
    const res = await api.post('/portfolio/holdings', { symbol, quantity, avg_price, notes });
    return res.data;
  },

  updateHolding: async (symbol: string, data: { quantity?: number; avg_price?: number; notes?: string }): Promise<Holding> => {
    const res = await api.put(`/portfolio/holdings/${symbol}`, data);
    return res.data;
  },

  deleteHolding: async (symbol: string) => {
    const res = await api.delete(`/portfolio/holdings/${symbol}`);
    return res.data;
  },

  // Transactions
  getTransactions: async (page = 1, perPage = 20, symbol?: string, type?: string): Promise<TransactionList> => {
    const res = await api.get('/portfolio/transactions', {
      params: { page, per_page: perPage, symbol, type }
    });
    return res.data;
  },

  addTransaction: async (data: {
    symbol: string;
    type: string;
    quantity?: number;
    price?: number;
    amount?: number;
    fees?: number;
    transaction_date: string;
    notes?: string;
  }, updateHolding = true): Promise<Transaction> => {
    const res = await api.post('/portfolio/transactions', data, {
      params: { update_holding: updateHolding }
    });
    return res.data;
  },

  // Summary & Performance
  getSummary: async (): Promise<PortfolioSummary> => {
    const res = await api.get('/portfolio/summary');
    return res.data;
  },

  getPerformance: async (days = 30): Promise<PortfolioPerformance> => {
    const res = await api.get('/portfolio/performance', { params: { days } });
    return res.data;
  },
};

// =============================================================================
// BACKTESTING TYPES
// =============================================================================

export interface BacktestStrategy {
  name: string;
  type: 'sma_crossover' | 'rsi' | 'macd' | 'breakout';
  params: Record<string, number>;
  position_size: 'fixed' | 'percent';
  capital_per_trade?: number;
  capital_percent?: number;
  stop_loss_pct?: number;
  take_profit_pct?: number;
}

export interface BacktestCreate {
  name: string;
  strategy: BacktestStrategy;
  symbols: string[];
  start_date: string;
  end_date: string;
  initial_capital: number;
}

export interface BacktestRun {
  id: string;
  user_id: string;
  name: string;
  strategy: BacktestStrategy;
  symbols: string[];
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_capital?: number;
  total_return?: number;
  cagr?: number;
  sharpe_ratio?: number;
  sortino_ratio?: number;
  max_drawdown?: number;
  win_rate?: number;
  profit_factor?: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_win?: number;
  avg_loss?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface BacktestTrade {
  id: number;
  symbol: string;
  trade_type: 'LONG' | 'SHORT';
  entry_date: string;
  exit_date?: string;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  entry_signal?: string;
  exit_signal?: string;
  pnl?: number;
  return_pct?: number;
  fees: number;
  is_open: boolean;
}

export interface EquityCurve {
  dates: string[];
  equity: number[];
  cash: number[];
  positions_value: number[];
  daily_returns: number[];
  drawdown: number[];
}

export interface StrategyType {
  id: string;
  name: string;
  description: string;
  params: { name: string; type: string; default: number; min: number; max: number }[];
}

export interface StrategyPreset {
  id: string;
  name: string;
  type: string;
  config: BacktestStrategy;
}

// =============================================================================
// BACKTESTING API
// =============================================================================

export const backtestApi = {
  run: async (config: BacktestCreate): Promise<BacktestRun> => {
    const res = await api.post('/backtest/run', config);
    return res.data;
  },

  list: async (
    page = 1,
    perPage = 20,
    status?: string
  ): Promise<{ runs: BacktestRun[]; total: number; page: number; per_page: number; has_more: boolean }> => {
    const res = await api.get('/backtest/jobs', {
      params: { page, per_page: perPage, status }
    });
    return res.data;
  },

  get: async (id: string): Promise<{ run: BacktestRun; trade_count: number; symbols_traded: string[] }> => {
    const res = await api.get(`/backtest/${id}`);
    return res.data;
  },

  getTrades: async (
    id: string,
    page = 1,
    perPage = 50,
    symbol?: string
  ): Promise<{ trades: BacktestTrade[]; total: number; page: number; per_page: number; has_more: boolean }> => {
    const res = await api.get(`/backtest/${id}/trades`, {
      params: { page, per_page: perPage, symbol }
    });
    return res.data;
  },

  getEquityCurve: async (id: string): Promise<EquityCurve> => {
    const res = await api.get(`/backtest/${id}/equity-curve`);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete(`/backtest/${id}`);
    return res.data;
  },

  getPresets: async (): Promise<{ presets: StrategyPreset[] }> => {
    const res = await api.get('/backtest/presets/list');
    return res.data;
  },

  getStrategyTypes: async (): Promise<{ types: StrategyType[] }> => {
    const res = await api.get('/backtest/strategies/types');
    return res.data;
  },

  compare: async (ids: string[]): Promise<{ backtests: any[] }> => {
    const res = await api.post('/backtest/compare', ids);
    return res.data;
  },
};

export default api;
