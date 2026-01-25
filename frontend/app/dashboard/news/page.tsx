'use client';

import { NewsFeed } from '@/components/NewsFeed';
import { Newspaper, Rss, Bell } from 'lucide-react';

export default function NewsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Newspaper className="h-7 w-7 mr-2 text-primary-600" />
            Market News
          </h1>
          <p className="text-gray-500">
            Latest news from Indian financial markets with auto-refresh
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Rss className="h-4 w-4 text-orange-500" />
          <span>Live Feed</span>
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Sources Info */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg p-4 border border-primary-100">
        <div className="flex items-start space-x-3">
          <Bell className="h-5 w-5 text-primary-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">Real-time News Aggregation</h3>
            <p className="text-sm text-gray-600 mt-1">
              News aggregated from Economic Times, Moneycontrol, Business Standard,
              LiveMint, Yahoo Finance, and more. Auto-refreshes every 2 minutes.
            </p>
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
