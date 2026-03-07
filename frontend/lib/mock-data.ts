// Realistic Nifty 50 stock data for visualizations
// Sector weights approximate actual Nifty 50 composition

export interface StockData {
  symbol: string;
  sector: string;
  weight: number; // approximate Nifty weight %
  zScore: number;
  change: number; // daily price change %
  volume: number; // relative volume (1.0 = average)
  marketCap: number; // in ₹ Cr
}

export interface SectorGroup {
  name: string;
  children: StockData[];
}

export const NIFTY_STOCKS: StockData[] = [
  // Financials (~37% of Nifty)
  { symbol: 'HDFCBANK', sector: 'Financials', weight: 13.2, zScore: 5.44, change: -2.1, volume: 5.4, marketCap: 1245000 },
  { symbol: 'ICICIBANK', sector: 'Financials', weight: 7.8, zScore: 0.8, change: 0.6, volume: 1.1, marketCap: 785000 },
  { symbol: 'SBIN', sector: 'Financials', weight: 3.1, zScore: 1.2, change: -0.4, volume: 1.3, marketCap: 620000 },
  { symbol: 'KOTAKBANK', sector: 'Financials', weight: 3.5, zScore: 0.5, change: 0.3, volume: 0.9, marketCap: 380000 },
  { symbol: 'AXISBANK', sector: 'Financials', weight: 2.8, zScore: 2.1, change: -1.2, volume: 2.0, marketCap: 320000 },
  { symbol: 'BAJFINANCE', sector: 'Financials', weight: 2.4, zScore: 0.3, change: 1.5, volume: 0.8, marketCap: 450000 },
  { symbol: 'HDFCLIFE', sector: 'Financials', weight: 1.2, zScore: 0.6, change: -0.2, volume: 1.0, marketCap: 145000 },

  // IT (~13% of Nifty)
  { symbol: 'TCS', sector: 'IT', weight: 4.2, zScore: 0.9, change: -0.8, volume: 1.0, marketCap: 1420000 },
  { symbol: 'INFY', sector: 'IT', weight: 5.8, zScore: 1.5, change: 1.2, volume: 1.4, marketCap: 680000 },
  { symbol: 'WIPRO', sector: 'IT', weight: 1.1, zScore: 0.4, change: -0.3, volume: 0.7, marketCap: 250000 },
  { symbol: 'HCLTECH', sector: 'IT', weight: 2.3, zScore: 2.8, change: 2.1, volume: 2.6, marketCap: 380000 },
  { symbol: 'TECHM', sector: 'IT', weight: 0.8, zScore: 0.7, change: 0.5, volume: 0.9, marketCap: 140000 },

  // Energy (~14%)
  { symbol: 'RELIANCE', sector: 'Energy', weight: 10.1, zScore: 1.1, change: 0.9, volume: 1.2, marketCap: 1920000 },
  { symbol: 'ONGC', sector: 'Energy', weight: 1.3, zScore: 0.3, change: -0.5, volume: 0.8, marketCap: 290000 },
  { symbol: 'NTPC', sector: 'Energy', weight: 1.6, zScore: 0.6, change: 0.2, volume: 1.0, marketCap: 320000 },
  { symbol: 'POWERGRID', sector: 'Energy', weight: 1.1, zScore: 0.4, change: 0.1, volume: 0.9, marketCap: 260000 },

  // FMCG (~9%)
  { symbol: 'HINDUNILVR', sector: 'FMCG', weight: 3.2, zScore: 3.58, change: -1.8, volume: 3.2, marketCap: 580000 },
  { symbol: 'ITC', sector: 'FMCG', weight: 4.1, zScore: 0.7, change: 0.4, volume: 1.0, marketCap: 540000 },
  { symbol: 'NESTLEIND', sector: 'FMCG', weight: 0.8, zScore: 0.2, change: -0.1, volume: 0.7, marketCap: 210000 },
  { symbol: 'BRITANNIA', sector: 'FMCG', weight: 0.6, zScore: 1.8, change: 1.3, volume: 1.6, marketCap: 120000 },

  // Auto (~7%)
  { symbol: 'MARUTI', sector: 'Auto', weight: 1.9, zScore: 0.5, change: 0.7, volume: 0.9, marketCap: 380000 },
  { symbol: 'TATAMOTORS', sector: 'Auto', weight: 1.8, zScore: 3.2, change: -2.5, volume: 3.8, marketCap: 290000 },
  { symbol: 'M&M', sector: 'Auto', weight: 2.1, zScore: 0.9, change: 0.3, volume: 1.1, marketCap: 340000 },
  { symbol: 'BAJAJ-AUTO', sector: 'Auto', weight: 1.0, zScore: 0.4, change: 0.8, volume: 0.8, marketCap: 210000 },

  // Pharma (~4%)
  { symbol: 'SUNPHARMA', sector: 'Pharma', weight: 1.7, zScore: 0.6, change: 0.5, volume: 0.9, marketCap: 360000 },
  { symbol: 'DRREDDY', sector: 'Pharma', weight: 0.9, zScore: 1.4, change: -0.9, volume: 1.3, marketCap: 105000 },
  { symbol: 'CIPLA', sector: 'Pharma', weight: 0.8, zScore: 0.3, change: 0.2, volume: 0.8, marketCap: 100000 },
  { symbol: 'DIVISLAB', sector: 'Pharma', weight: 0.5, zScore: 0.8, change: -0.4, volume: 1.0, marketCap: 95000 },

  // Metals (~4%)
  { symbol: 'TATASTEEL', sector: 'Metals', weight: 1.2, zScore: 2.4, change: -1.6, volume: 2.3, marketCap: 180000 },
  { symbol: 'HINDALCO', sector: 'Metals', weight: 1.0, zScore: 0.5, change: 0.4, volume: 0.9, marketCap: 130000 },
  { symbol: 'JSWSTEEL', sector: 'Metals', weight: 0.9, zScore: 1.9, change: -1.0, volume: 1.7, marketCap: 195000 },
  { symbol: 'COALINDIA', sector: 'Metals', weight: 0.7, zScore: 0.2, change: 0.1, volume: 0.7, marketCap: 250000 },
];

export function getStocksBySector(): SectorGroup[] {
  const sectorMap = new Map<string, StockData[]>();
  for (const stock of NIFTY_STOCKS) {
    const list = sectorMap.get(stock.sector) || [];
    list.push(stock);
    sectorMap.set(stock.sector, list);
  }
  return Array.from(sectorMap.entries()).map(([name, children]) => ({
    name,
    children,
  }));
}

export function getZScoreColor(z: number): string {
  if (z >= 4) return '#ef4444';    // red-500 - critical
  if (z >= 3) return '#f97316';    // orange-500 - high
  if (z >= 2) return '#f59e0b';    // amber-500 - medium
  if (z >= 1) return '#22d3ee';    // cyan-400 - low
  return '#1a1d24';                // bg-muted - normal
}

export function getZScoreSeverity(z: number): 'critical' | 'high' | 'medium' | 'low' | 'normal' {
  if (z >= 4) return 'critical';
  if (z >= 3) return 'high';
  if (z >= 2) return 'medium';
  if (z >= 1) return 'low';
  return 'normal';
}

// Sector color assignments for consistent visualization
export const SECTOR_COLORS: Record<string, string> = {
  Financials: '#3b82f6',
  IT: '#8b5cf6',
  Energy: '#f59e0b',
  FMCG: '#10b981',
  Auto: '#06b6d4',
  Pharma: '#ec4899',
  Metals: '#6b7280',
};
