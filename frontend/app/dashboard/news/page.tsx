'use client';

import { NewsFeed } from '@/components/NewsFeed';
import { Newspaper } from 'lucide-react';

export default function NewsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Newspaper className="h-7 w-7 mr-2 text-primary-600" />
          Market News
        </h1>
        <p className="text-gray-500">
          Latest news from Indian financial markets
        </p>
      </div>

      {/* News Feed */}
      <NewsFeed limit={50} />
    </div>
  );
}
