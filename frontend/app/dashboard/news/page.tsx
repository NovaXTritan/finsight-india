'use client';

import { NewsFeed } from '@/components/NewsFeed';
import { Newspaper, Rss, Bell, Sparkles } from 'lucide-react';

export default function NewsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Newspaper className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Market News</h1>
              <p className="text-[var(--text-secondary)]">
                Latest news from Indian financial markets with auto-refresh
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 bg-[var(--bg-muted)] border border-[var(--border-default)] rounded-lg">
            <Rss className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-medium text-[var(--text-secondary)]">Live Feed</span>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Sources Info */}
      <div className="card overflow-hidden">
        <div className="bg-[var(--bg-muted)] border-b border-[var(--border-default)] px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Bell className="h-5 w-5 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Real-time News Aggregation</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-primary-400 mt-0.5" />
            <div>
              <p className="text-sm text-[var(--text-secondary)]">
                News aggregated from <span className="font-semibold text-[var(--text-primary)]">Economic Times</span>,{' '}
                <span className="font-semibold text-[var(--text-primary)]">Moneycontrol</span>,{' '}
                <span className="font-semibold text-[var(--text-primary)]">Business Standard</span>,{' '}
                <span className="font-semibold text-[var(--text-primary)]">LiveMint</span>,{' '}
                <span className="font-semibold text-[var(--text-primary)]">Yahoo Finance</span>, and more.
              </p>
              <div className="mt-3 flex items-center space-x-4 text-xs text-[var(--text-muted)]">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>Auto-refreshes every 2 minutes</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-primary-400 rounded-full" />
                  <span>AI-powered sentiment analysis</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* News Feed */}
      <NewsFeed
        limit={100}
        showCategoryTabs={true}
        showSearch={true}
        refreshInterval={2 * 60 * 1000}
      />
    </div>
  );
}
