'use client';

import { useAuthStore } from '@/lib/store';
import { Settings, User, Shield, Bell, CreditCard, Check, Crown, Zap, Sparkles } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="glass-card-dashboard p-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-primary-500 to-purple-600 rounded-xl shadow-glow">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500">Manage your account and preferences</p>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="glass-card-dashboard overflow-hidden">
        <div className="px-6 py-4 border-b border-primary-100/50 bg-gradient-to-r from-primary-50/50 to-purple-50/50 flex items-center space-x-2">
          <User className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-purple-500 rounded-full flex items-center justify-center ring-4 ring-primary-100">
              <span className="text-2xl font-bold text-white">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <div className="text-xl font-semibold text-gray-900">{user?.name}</div>
              <div className="text-sm text-gray-500">{user?.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary-100/50">
            <div className="p-4 bg-gradient-to-r from-primary-50/50 to-purple-50/50 rounded-xl">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Member Since
              </label>
              <div className="text-gray-900 font-medium">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '-'}
              </div>
            </div>
            <div className="p-4 bg-gradient-to-r from-primary-50/50 to-purple-50/50 rounded-xl">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Current Plan
              </label>
              <div className="text-gray-900 font-medium capitalize flex items-center">
                {user?.tier === 'premium' && <Crown className="h-4 w-4 text-yellow-500 mr-1" />}
                {user?.tier === 'pro' && <Zap className="h-4 w-4 text-primary-500 mr-1" />}
                {user?.tier} Plan
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="glass-card-dashboard overflow-hidden">
        <div className="px-6 py-4 border-b border-primary-100/50 bg-gradient-to-r from-primary-50/50 to-purple-50/50 flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-gray-900 capitalize">
                  {user?.tier} Plan
                </span>
                <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-primary-100 to-purple-100 text-primary-700 rounded-full font-medium">
                  Current
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>{user?.watchlist_count} / {user?.tier_limit} watchlist symbols used</span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden w-48">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (user?.watchlist_count || 0) >= (user?.tier_limit || 1)
                        ? 'bg-gradient-to-r from-red-500 to-red-400'
                        : 'bg-gradient-to-r from-primary-500 to-purple-500'
                    }`}
                    style={{ width: `${((user?.watchlist_count || 0) / (user?.tier_limit || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            {user?.tier === 'free' && (
              <button className="btn-glass-primary flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Upgrade to Pro</span>
              </button>
            )}
          </div>

          {/* Tier Comparison */}
          <div className="grid grid-cols-3 gap-4">
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
      <div className="glass-card-dashboard overflow-hidden">
        <div className="px-6 py-4 border-b border-primary-100/50 bg-gradient-to-r from-primary-50/50 to-purple-50/50 flex items-center space-x-2">
          <Bell className="h-5 w-5 text-primary-600" />
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
      <div className="glass-card-dashboard overflow-hidden">
        <div className="px-6 py-4 border-b border-primary-100/50 bg-gradient-to-r from-primary-50/50 to-purple-50/50 flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>
        <div className="p-6">
          <button className="btn-glass-secondary">
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
      className={`p-5 rounded-xl border transition-all ${
        highlighted
          ? 'border-primary-300 bg-gradient-to-br from-primary-50 to-purple-50 shadow-glow'
          : current
          ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50'
          : 'border-gray-200 bg-white hover:border-primary-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-center space-x-2">
        <span className="font-semibold text-gray-900">{name}</span>
        {highlighted && (
          <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-full font-medium">
            Popular
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-2">
        {price === '0' ? 'Free' : `₹${price}`}
        {price !== '0' && <span className="text-sm font-normal text-gray-500">/mo</span>}
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((f, i) => (
          <li key={i} className="text-sm text-gray-600 flex items-center">
            <Check className="h-4 w-4 mr-2 text-green-500" />
            {f}
          </li>
        ))}
      </ul>
      {current && (
        <div className="mt-4 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-full inline-flex items-center">
          <Check className="h-3 w-3 mr-1" />
          Current plan
        </div>
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
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/50 to-primary-50/30 rounded-xl">
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
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-gradient-to-r peer-checked:from-primary-500 peer-checked:to-purple-500"></div>
      </label>
    </div>
  );
}
