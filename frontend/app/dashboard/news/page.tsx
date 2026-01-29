'use client';

import { NewsFeed } from '@/components/NewsFeed';
import { Newspaper, Rss, Bell, Sparkles } from 'lucide-react';

export default function NewsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card-dashboard p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl shadow-glow">
              <Newspaper className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Market News</h1>
              <p className="text-gray-500">
                Latest news from Indian financial markets with auto-refresh
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 glass-card-purple rounded-full">
            <Rss className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">Live Feed</span>
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Sources Info */}
      <div className="glass-card-dashboard overflow-hidden">
        <div className="bg-gradient-to-r from-primary-500 to-purple-600 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Real-time News Aggregation</h3>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-start space-x-3">
            <Sparkles className="h-5 w-5 text-primary-600 mt-0.5" />
            <div>
              <p className="text-sm text-gray-600">
                News aggregated from <span className="font-semibold text-gray-900">Economic Times</span>,{' '}
                <span className="font-semibold text-gray-900">Moneycontrol</span>,{' '}
                <span className="font-semibold text-gray-900">Business Standard</span>,{' '}
                <span className="font-semibold text-gray-900">LiveMint</span>,{' '}
                <span className="font-semibold text-gray-900">Yahoo Finance</span>, and more.
              </p>
              <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
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

      {/* News Feed with all features enabled */}
      <NewsFeed
        limit={100}
        showCategoryTabs={true}
        showSearch={true}
        refreshInterval={2 * 60 * 1000}
      />
    </div>
  );
}
