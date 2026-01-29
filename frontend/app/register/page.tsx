'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { TrendingUp, Eye, EyeOff, Loader2, Check, User, Mail, Lock, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await register(email, password, name);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    }
  };

  const passwordStrength = () => {
    if (password.length === 0) return { score: 0, text: '', color: 'bg-gray-700' };
    if (password.length < 6) return { score: 1, text: 'Weak', color: 'bg-red-500' };
    if (password.length < 8) return { score: 2, text: 'Fair', color: 'bg-yellow-500' };
    if (password.length < 12) return { score: 3, text: 'Good', color: 'bg-primary-500' };
    return { score: 4, text: 'Strong', color: 'bg-green-500' };
  };

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-app-gradient bg-mesh-overlay flex items-center justify-center p-4">
      {/* Animated Glow Orbs */}
      <div className="glow-orb w-80 h-80 top-10 -right-20 opacity-40" />
      <div className="glow-orb w-64 h-64 bottom-10 left-10 opacity-30" style={{ animationDelay: '3s' }} />

      <div className="w-full max-w-md relative z-10 animate-page-enter">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500 blur-lg opacity-50 group-hover:opacity-70 transition-opacity" />
              <TrendingUp className="relative h-12 w-12 text-primary-400" />
            </div>
            <div>
              <span className="text-3xl font-bold text-white">FinSight</span>
              <span className="badge-glow text-[10px] ml-2">INDIA</span>
            </div>
          </Link>
        </div>

        {/* Register Card */}
        <div className="glass-card-dark p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
            <p className="text-gray-400">Start your free trial today</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center space-x-3 animate-slide-down">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-glass pl-12"
                  placeholder="Divyanshu Kumar"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-glass pl-12"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-glass pl-12 pr-12"
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {/* Password strength indicator with gradient */}
              {password.length > 0 && (
                <div className="mt-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength.score ? strength.color : 'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">{strength.text}</p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-glass-primary py-4 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create Free Account</span>
              )}
            </button>
          </form>

          {/* Benefits */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-gray-400 mb-3">Free tier includes:</p>
            <ul className="space-y-2">
              {['5 watchlist symbols', 'Basic anomaly detection', 'Market news feed', 'FII/DII data'].map(
                (benefit) => (
                  <li key={benefit} className="flex items-center text-sm text-gray-300">
                    <div className="mr-2 w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-400" />
                    </div>
                    {benefit}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          By creating an account, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
