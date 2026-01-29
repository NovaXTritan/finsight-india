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
  positive: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100', border: 'border-l-green-500' },
  negative: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100', border: 'border-l-red-500' },
  neutral: { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-l-gray-400' },
} as const;

const categoryColors: Record<string, string> = {
  markets: 'bg-blue-100 text-blue-700',
  economy: 'bg-purple-100 text-purple-700',
  stocks: 'bg-green-100 text-green-700',
  ipo: 'bg-orange-100 text-orange-700',
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
      <div className="glass-card-dashboard p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-24 bg-primary-100 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-primary-50 rounded w-full" />
              <div className="h-4 bg-primary-50 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card-dashboard overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-primary-100/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-primary-100 to-purple-100 rounded-lg">
              <Newspaper className="h-5 w-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {symbol ? `${symbol} News` : 'Market News'}
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            {lastUpdated && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                Updated {formatTimeAgo(lastUpdated)}
              </span>
            )}
            <button
              onClick={() => fetchNews(activeCategory)}
              disabled={isLoading}
              className={`p-2 hover:bg-primary-100 rounded-lg transition-colors ${
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search news by title, symbol, or source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-glass-light pl-10 text-sm"
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
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeCategory === id
                    ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-glow'
                    : 'text-gray-600 hover:bg-primary-50 border border-primary-100/50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeCategory === id
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-600'
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
      <div className="divide-y divide-primary-100/50 max-h-[600px] overflow-y-auto">
        {error ? (
          <div className="p-8 text-center text-gray-500">
            <p>{error}</p>
            <button
              onClick={() => fetchNews(activeCategory)}
              className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              Try again
            </button>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="relative mx-auto w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-primary-200/50 blur-xl rounded-full" />
              <Newspaper className="relative h-16 w-16 mx-auto text-primary-300" />
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
      <div className="px-4 py-3 bg-gradient-to-r from-primary-50/50 to-purple-50/50 border-t border-primary-100/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
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
    return (text: string) => text.replace(regex, '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');
  }, [searchQuery]);

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block px-6 py-4 hover:bg-primary-50/50 transition-colors group border-l-4 ${sentiment.border}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-medium text-gray-900 group-hover:text-primary-600 line-clamp-2 transition-colors"
            dangerouslySetInnerHTML={{ __html: highlightText(item.title) }}
          />

          {item.summary && (
            <p
              className="mt-1 text-sm text-gray-500 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: highlightText(item.summary) }}
            />
          )}

          <div className="mt-3 flex items-center flex-wrap gap-2 text-xs text-gray-500">
            <span className="font-semibold text-primary-600">{item.source}</span>
            <span className="text-gray-300">|</span>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(item.published_at)}
            </div>

            {item.category && item.category !== 'markets' && (
              <>
                <span className="text-gray-300">|</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    categoryColors[item.category] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {item.category}
                </span>
              </>
            )}

            {item.sentiment && (
              <>
                <span className="text-gray-300">|</span>
                <div className={`flex items-center ${sentiment.color}`}>
                  <SentimentIcon className="h-3 w-3 mr-1" />
                  {item.sentiment}
                </div>
              </>
            )}

            {item.symbols && item.symbols.length > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <div className="flex gap-1">
                  {item.symbols.slice(0, 3).map((symbol) => (
                    <span
                      key={symbol}
                      className="px-1.5 py-0.5 bg-gradient-to-r from-primary-100 to-purple-100 text-primary-700 rounded text-xs font-medium"
                    >
                      {symbol}
                    </span>
                  ))}
                  {item.symbols.length > 3 && (
                    <span className="text-gray-400">+{item.symbols.length - 3}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-primary-500 ml-2 flex-shrink-0 transition-colors" />
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
