'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { authApi } from '@/lib/api';
import { Settings, User, Shield, Bell, CreditCard, Check, Crown, Zap, Sparkles, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-primary-500 rounded-xl">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
            <p className="text-[var(--text-secondary)]">Manage your account and preferences</p>
          </div>
        </div>
      </div>

      {/* Profile Section */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-overlay)] flex items-center space-x-2">
          <User className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Profile</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-500/20 border border-primary-500/30 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-400">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <div className="text-xl font-semibold text-[var(--text-primary)]">{user?.name}</div>
              <div className="text-sm text-[var(--text-secondary)]">{user?.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-primary)]">
            <div className="p-4 bg-[var(--bg-overlay)] rounded-xl">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Member Since
              </label>
              <div className="text-[var(--text-primary)] font-medium">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '-'}
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-overlay)] rounded-xl">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Current Plan
              </label>
              <div className="text-[var(--text-primary)] font-medium capitalize flex items-center">
                {user?.tier === 'premium' && <Crown className="h-4 w-4 text-yellow-500 mr-1" />}
                {user?.tier === 'pro' && <Zap className="h-4 w-4 text-primary-500 mr-1" />}
                {user?.tier} Plan
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-overlay)] flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Subscription</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-[var(--text-primary)] capitalize">
                  {user?.tier} Plan
                </span>
                <span className="px-2 py-0.5 text-xs bg-primary-500/20 text-primary-400 rounded-full font-medium">
                  Current
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
                  <span>{user?.watchlist_count} / {user?.tier_limit} watchlist symbols used</span>
                </div>
                <div className="mt-2 h-2 bg-[var(--bg-overlay)] rounded-full overflow-hidden w-48">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (user?.watchlist_count || 0) >= (user?.tier_limit || 1)
                        ? 'bg-red-500'
                        : 'bg-primary-500'
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
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-overlay)] flex items-center space-x-2">
          <Bell className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Notifications</h2>
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
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-overlay)] flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary-400" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Security</h2>
        </div>
        <div className="p-6">
          <button
            className="btn-glass-secondary"
            onClick={() => setShowChangePassword(true)}
          >
            Change Password
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
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
          ? 'border-primary-500/40 bg-primary-500/10'
          : current
          ? 'border-green-500/40 bg-green-500/10'
          : 'border-[var(--border-primary)] bg-[var(--bg-overlay)] hover:border-primary-500/30'
      }`}
    >
      <div className="flex items-center space-x-2">
        <span className="font-semibold text-[var(--text-primary)]">{name}</span>
        {highlighted && (
          <span className="px-2 py-0.5 text-xs bg-primary-500 text-white rounded-full font-medium">
            Popular
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)] mt-2">
        {price === '0' ? 'Free' : `₹${price}`}
        {price !== '0' && <span className="text-sm font-normal text-[var(--text-secondary)]">/mo</span>}
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((f, i) => (
          <li key={i} className="text-sm text-[var(--text-secondary)] flex items-center">
            <Check className="h-4 w-4 mr-2 text-green-400" />
            {f}
          </li>
        ))}
      </ul>
      {current && (
        <div className="mt-4 px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-full inline-flex items-center">
          <Check className="h-3 w-3 mr-1" />
          Current plan
        </div>
      )}
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-6 animate-page-enter">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-500/20 rounded-lg">
              <Lock className="h-5 w-5 text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Change Password</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--bg-overlay)] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-green-400">Password changed successfully!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input-glass pr-10"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-glass"
                placeholder="Minimum 8 characters"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-glass"
                placeholder="Confirm new password"
                required
                minLength={8}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <span className="text-xs text-red-400 mt-1">Passwords do not match</span>
              )}
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 btn-glass-secondary py-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || newPassword !== confirmPassword || newPassword.length < 8}
                className="flex-1 btn-glass-primary py-3 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Change Password</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
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
    <div className="flex items-center justify-between p-4 bg-[var(--bg-overlay)] rounded-xl">
      <div>
        <div className="font-medium text-[var(--text-primary)]">{label}</div>
        <div className="text-sm text-[var(--text-secondary)]">{description}</div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          defaultChecked={defaultChecked}
        />
        <div className="w-11 h-6 bg-[var(--bg-primary)] border border-[var(--border-primary)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-transparent after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-muted)] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 peer-checked:after:bg-white"></div>
      </label>
    </div>
  );
}
