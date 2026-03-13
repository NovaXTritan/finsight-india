'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { marketApi, NewsItem, NewsResponse } from '@/lib/api';
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Building2,
  LineChart,
  Landmark,
  CircleDollarSign,
} from 'lucide-react';

interface NewsFeedProps {
  limit?: number;
  symbol?: string;
  showCategoryTabs?: boolean;
  showSearch?: boolean;
  refreshInterval?: number;
}

type Category = 'all' | 'markets' | 'economy' | 'stocks' | 'ipo';

const CATEGORIES: { id: Category; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: Newspaper },
  { id: 'markets', label: 'Markets', icon: LineChart },
  { id: 'economy', label: 'Economy', icon: Landmark },
  { id: 'stocks', label: 'Stocks', icon: Building2 },
  { id: 'ipo', label: 'IPO', icon: CircleDollarSign },
];

const sentimentConfig = {
  positive: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-l-green-500' },
  negative: { icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-l-red-500' },
  neutral: { icon: Minus, color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-muted)]', border: 'border-l-gray-400' },
} as const;

const categoryColors: Record<string, string> = {
  markets: 'bg-blue-500/10 text-blue-400',
  economy: 'bg-purple-500/10 text-purple-400',
  stocks: 'bg-green-500/10 text-green-400',
  ipo: 'bg-orange-500/10 text-orange-400',
};

export function NewsFeed({
  limit = 50,
  symbol,
  showCategoryTabs = true,
  showSearch = true,
  refreshInterval = 2 * 60 * 1000,
}: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [categoryCounts, setCategoryCounts] = useState<Record<Category, number>>({
    all: 0,
    markets: 0,
    economy: 0,
    stocks: 0,
    ipo: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNews = useCallback(async (category?: Category) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await marketApi.getNews(limit, symbol, category === 'all' ? undefined : category);
      setNews(data.news || []);
      setCategoryCounts(data.category_counts || { all: 0, markets: 0, economy: 0, stocks: 0, ipo: 0 });
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load news');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [limit, symbol]);

  useEffect(() => {
    fetchNews(activeCategory);
    const interval = setInterval(() => fetchNews(activeCategory), refreshInterval);
    return () => clearInterval(interval);
  }, [fetchNews, activeCategory, refreshInterval]);

  const filteredNews = useMemo(() => {
    if (!searchQuery.trim()) return news;
    const query = searchQuery.toLowerCase();
    return news.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.summary?.toLowerCase().includes(query) ||
        item.symbols?.some((s) => s.toLowerCase().includes(query)) ||
        item.source.toLowerCase().includes(query)
    );
  }, [news, searchQuery]);

  const handleCategoryChange = useCallback((category: Category) => {
    setActiveCategory(category);
    setSearchQuery('');
  }, []);

  if (isLoading && news.length === 0) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-24 bg-[var(--bg-muted)] rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-[var(--bg-muted)] rounded w-full" />
              <div className="h-4 bg-[var(--bg-muted)] rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Newspaper className="h-4 w-4 sm:h-5 sm:w-5 text-primary-400" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
              {symbol ? `${symbol} News` : 'News'}
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            {lastUpdated && (
              <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-muted)] px-2 py-1 rounded-full font-mono">
                Updated {formatTimeAgo(lastUpdated)}
              </span>
            )}
            <button
              onClick={() => fetchNews(activeCategory)}
              disabled={isLoading}
              className={`p-2 hover:bg-[var(--bg-muted)] rounded-lg transition-colors ${
                isLoading ? 'animate-spin' : ''
              }`}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-primary-500" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search news by title, symbol, or source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 text-sm"
            />
          </div>
        )}

        {/* Category Tabs */}
        {showCategoryTabs && (
          <div className="mt-4 flex space-x-2 overflow-x-auto pb-1">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleCategoryChange(id)}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === id
                    ? 'bg-primary-500/10 text-primary-400'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] border border-[var(--border-default)]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                    activeCategory === id
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
                  }`}
                >
                  {categoryCounts[id]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* News List */}
      <div className="divide-y divide-[var(--border-default)] max-h-[600px] overflow-y-auto">
        {error ? (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            <p>{error}</p>
            <button
              onClick={() => fetchNews(activeCategory)}
              className="mt-2 text-primary-400 hover:text-primary-300 font-medium"
            >
              Try again
            </button>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-primary-500/10 blur-xl rounded-full" />
              <Newspaper className="relative h-16 w-16 mx-auto text-primary-400" />
            </div>
            <p>
              {searchQuery
                ? 'No news matching your search'
                : `No ${activeCategory === 'all' ? '' : activeCategory} news available`}
            </p>
          </div>
        ) : (
          filteredNews.map((item, index) => (
            <NewsCard key={`${item.url}-${index}`} item={item} searchQuery={searchQuery} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-[var(--bg-muted)] border-t border-[var(--border-default)]">
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span className="font-mono">
            Showing {filteredNews.length} of {categoryCounts.all} articles
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Auto-refresh every 2 min</span>
          </span>
        </div>
      </div>
    </div>
  );
}

const NewsCard = memo(function NewsCard({ item, searchQuery }: { item: NewsItem; searchQuery?: string }) {
  const sentiment =
    sentimentConfig[item.sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;
  const SentimentIcon = sentiment.icon;

  const highlightText = useMemo(() => {
    if (!searchQuery?.trim()) return (text: string) => text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return (text: string) => text.replace(regex, '<mark class="bg-yellow-500/20 text-yellow-300 rounded px-0.5">$1</mark>');
  }, [searchQuery]);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block px-4 sm:px-6 py-3 sm:py-4 hover:bg-[var(--bg-muted)] transition-colors group border-l-4 ${sentiment.border}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-medium text-[var(--text-primary)] group-hover:text-primary-400 line-clamp-2 transition-colors"
            dangerouslySetInnerHTML={{ __html: highlightText(item.title) }}
          />

          {item.summary && (
            <p
              className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2"
              dangerouslySetInnerHTML={{ __html: highlightText(item.summary) }}
            />
          )}

          <div className="mt-2 sm:mt-3 flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs text-[var(--text-secondary)]">
            <span className="font-semibold text-primary-400">{item.source}</span>
            <span className="text-[var(--text-muted)]">&middot;</span>
            <div className="flex items-center font-mono">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(item.published_at)}
            </div>

            {item.sentiment && (
              <>
                <span className="hidden sm:inline text-[var(--text-muted)]">&middot;</span>
                <div className={`hidden sm:flex items-center ${sentiment.color}`}>
                  <SentimentIcon className="h-3 w-3 mr-1" />
                  {item.sentiment}
                </div>
              </>
            )}

            {item.symbols && item.symbols.length > 0 && (
              <>
                <span className="hidden sm:inline text-[var(--text-muted)]">&middot;</span>
                <div className="hidden sm:flex gap-1">
                  {item.symbols.slice(0, 3).map((symbol) => (
                    <span
                      key={symbol}
                      className="px-1.5 py-0.5 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded text-xs font-medium font-mono"
                    >
                      {symbol}
                    </span>
                  ))}
                  {item.symbols.length > 3 && (
                    <span className="text-[var(--text-muted)] font-mono">+{item.symbols.length - 3}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <ExternalLink className="h-4 w-4 text-[var(--text-muted)] group-hover:text-primary-400 ml-2 flex-shrink-0 transition-colors" />
      </div>
    </a>
  );
});

function formatTime(dateString: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default NewsFeed;
