'use client';

import { useEffect, useState, useMemo } from 'react';
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
  refreshInterval?: number; // in milliseconds
}

type Category = 'all' | 'markets' | 'economy' | 'stocks' | 'ipo';

const CATEGORIES: { id: Category; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: Newspaper },
  { id: 'markets', label: 'Markets', icon: LineChart },
  { id: 'economy', label: 'Economy', icon: Landmark },
  { id: 'stocks', label: 'Stocks', icon: Building2 },
  { id: 'ipo', label: 'IPO', icon: CircleDollarSign },
];

export function NewsFeed({
  limit = 50,
  symbol,
  showCategoryTabs = true,
  showSearch = true,
  refreshInterval = 2 * 60 * 1000, // 2 minutes default
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

  const fetchNews = async (category?: Category) => {
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
  };

  useEffect(() => {
    fetchNews(activeCategory);
    // Refresh at configured interval
    const interval = setInterval(() => fetchNews(activeCategory), refreshInterval);
    return () => clearInterval(interval);
  }, [limit, symbol, activeCategory, refreshInterval]);

  // Filter news by search query
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

  const handleCategoryChange = (category: Category) => {
    setActiveCategory(category);
    setSearchQuery(''); // Clear search when changing category
  };

  if (isLoading && news.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-24 bg-gray-200 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Newspaper className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {symbol ? `${symbol} News` : 'Market News'}
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                Updated {formatTimeAgo(lastUpdated)}
              </span>
            )}
            <button
              onClick={() => fetchNews(activeCategory)}
              disabled={isLoading}
              className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${
                isLoading ? 'animate-spin' : ''
              }`}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-gray-500" />
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
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Category Tabs */}
        {showCategoryTabs && (
          <div className="mt-3 flex space-x-1 overflow-x-auto">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleCategoryChange(id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeCategory === id
                      ? 'bg-primary-200 text-primary-800'
                      : 'bg-gray-200 text-gray-600'
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
      <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
        {error ? (
          <div className="p-8 text-center text-gray-500">
            <p>{error}</p>
            <button
              onClick={() => fetchNews(activeCategory)}
              className="mt-2 text-primary-600 hover:text-primary-700"
            >
              Try again
            </button>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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

      {/* Footer with auto-refresh indicator */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-400">
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

function NewsCard({ item, searchQuery }: { item: NewsItem; searchQuery?: string }) {
  const sentimentConfig = {
    positive: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    negative: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100' },
    neutral: { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-100' },
  };

  const sentiment =
    sentimentConfig[item.sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;
  const SentimentIcon = sentiment.icon;

  // Highlight search matches
  const highlightText = (text: string) => {
    if (!searchQuery?.trim()) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  const categoryColors: Record<string, string> = {
    markets: 'bg-blue-100 text-blue-700',
    economy: 'bg-purple-100 text-purple-700',
    stocks: 'bg-green-100 text-green-700',
    ipo: 'bg-orange-100 text-orange-700',
  };

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block px-6 py-4 hover:bg-gray-50 transition-colors group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className="text-sm font-medium text-gray-900 group-hover:text-primary-600 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: highlightText(item.title) }}
          />

          {/* Summary */}
          {item.summary && (
            <p
              className="mt-1 text-sm text-gray-500 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: highlightText(item.summary) }}
            />
          )}

          {/* Meta */}
          <div className="mt-2 flex items-center flex-wrap gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-600">{item.source}</span>
            <span className="text-gray-300">|</span>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(item.published_at)}
            </div>

            {/* Category badge */}
            {item.category && item.category !== 'markets' && (
              <>
                <span className="text-gray-300">|</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${
                    categoryColors[item.category] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {item.category}
                </span>
              </>
            )}

            {/* Sentiment */}
            {item.sentiment && (
              <>
                <span className="text-gray-300">|</span>
                <div className={`flex items-center ${sentiment.color}`}>
                  <SentimentIcon className="h-3 w-3 mr-1" />
                  {item.sentiment}
                </div>
              </>
            )}

            {/* Symbols */}
            {item.symbols && item.symbols.length > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <div className="flex gap-1">
                  {item.symbols.slice(0, 3).map((symbol) => (
                    <span
                      key={symbol}
                      className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium"
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

        <ExternalLink className="h-4 w-4 text-gray-300 group-hover:text-primary-500 ml-2 flex-shrink-0" />
      </div>
    </a>
  );
}

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
