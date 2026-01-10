'use client';

import { useAuthStore } from '@/lib/store';
import { Settings, User, Shield, Bell, CreditCard } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Settings className="h-7 w-7 mr-2 text-primary-600" />
          Settings
        </h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
          <User className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Name
            </label>
            <div className="text-gray-900">{user?.name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Email
            </label>
            <div className="text-gray-900">{user?.email}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Member Since
            </label>
            <div className="text-gray-900">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-gray-900 capitalize">
                  {user?.tier} Plan
                </span>
                {user?.tier === 'free' && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {user?.watchlist_count} / {user?.tier_limit} watchlist symbols used
              </p>
            </div>
            {user?.tier === 'free' && (
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors">
                Upgrade to Pro
              </button>
            )}
          </div>

          {/* Tier Comparison */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <TierCard
              name="Free"
              price="0"
              features={['5 symbols', 'EOD data', 'Basic signals']}
              current={user?.tier === 'free'}
            />
            <TierCard
              name="Pro"
              price="499"
              features={['25 symbols', 'Real-time data', 'FII/DII alerts', 'Email alerts']}
              current={user?.tier === 'pro'}
              highlighted
            />
            <TierCard
              name="Premium"
              price="999"
              features={['Unlimited', 'F&O analytics', 'Backtesting', 'API access']}
              current={user?.tier === 'premium'}
            />
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
          <Bell className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        </div>
        <div className="p-6 space-y-4">
          <ToggleSetting
            label="Email alerts for new signals"
            description="Get notified when new signals are detected for your watchlist"
            defaultChecked={true}
          />
          <ToggleSetting
            label="Daily market summary"
            description="Receive a daily summary of market activity"
            defaultChecked={true}
          />
          <ToggleSetting
            label="Weekly performance report"
            description="Get a weekly report on signal performance"
            defaultChecked={false}
          />
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
          <Shield className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>
        <div className="p-6">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}

function TierCard({
  name,
  price,
  features,
  current,
  highlighted,
}: {
  name: string;
  price: string;
  features: string[];
  current?: boolean;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-lg border ${
        highlighted
          ? 'border-primary-300 bg-primary-50'
          : current
          ? 'border-green-300 bg-green-50'
          : 'border-gray-200'
      }`}
    >
      <div className="font-semibold text-gray-900">{name}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">
        {price === '0' ? 'Free' : `₹${price}`}
        {price !== '0' && <span className="text-sm font-normal text-gray-500">/mo</span>}
      </div>
      <ul className="mt-3 space-y-1">
        {features.map((f, i) => (
          <li key={i} className="text-sm text-gray-600 flex items-center">
            <span className="mr-1.5 text-green-500">✓</span>
            {f}
          </li>
        ))}
      </ul>
      {current && (
        <div className="mt-3 text-xs font-medium text-green-600">Current plan</div>
      )}
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          defaultChecked={defaultChecked}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
      </label>
    </div>
  );
}
