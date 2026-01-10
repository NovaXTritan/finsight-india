'use client';

import { useEffect, useState } from 'react';
import { marketApi, NewsItem } from '@/lib/api';
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface NewsFeedProps {
  limit?: number;
  symbol?: string;
}

export function NewsFeed({ limit = 20, symbol }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNews = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await marketApi.getNews(limit, symbol);
      setNews(data.news || []);
    } catch (err) {
      setError('Failed to load news');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [limit, symbol]);

  if (isLoading) {
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <Newspaper className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {symbol ? `${symbol} News` : 'Market News'}
          </h2>
        </div>
        <button
          onClick={fetchNews}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* News List */}
      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {error ? (
          <div className="p-8 text-center text-gray-500">
            <p>{error}</p>
            <button
              onClick={fetchNews}
              className="mt-2 text-primary-600 hover:text-primary-700"
            >
              Try again
            </button>
          </div>
        ) : news.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No news available</p>
          </div>
        ) : (
          news.map((item, index) => (
            <NewsCard key={index} item={item} />
          ))
        )}
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const sentimentConfig = {
    positive: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    negative: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-100' },
    neutral: { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-100' },
  };

  const sentiment = sentimentConfig[item.sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;
  const SentimentIcon = sentiment.icon;

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
          <h3 className="text-sm font-medium text-gray-900 group-hover:text-primary-600 line-clamp-2">
            {item.title}
          </h3>

          {/* Summary */}
          {item.summary && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.summary}</p>
          )}

          {/* Meta */}
          <div className="mt-2 flex items-center flex-wrap gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-600">{item.source}</span>
            <span className="text-gray-300">|</span>
            <div className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatTime(item.published_at)}
            </div>

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

export default NewsFeed;
