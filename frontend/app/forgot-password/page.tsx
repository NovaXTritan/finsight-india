'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { TrendingUp, Mail, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setResetLink('');
    setIsLoading(true);

    try {
      const res = await authApi.forgotPassword(email);
      // Extract reset link if present in message
      const linkMatch = res.message.match(/\/reset-password\?token=\S+/);
      if (linkMatch) {
        setResetLink(linkMatch[0]);
        setSuccess('Reset link generated! Click the link below to reset your password.');
      } else {
        setSuccess(res.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-page-enter">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-3">
            <TrendingUp className="h-10 w-10 text-primary-500" />
            <div>
              <span className="text-3xl font-bold text-[var(--text-primary)]">FinSight</span>
              <span className="badge-glow text-[10px] ml-2">INDIA</span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Forgot Password</h1>
            <p className="text-[var(--text-secondary)]">
              Enter your email and we&apos;ll generate a reset link
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center space-x-3 animate-slide-down">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start space-x-3 animate-slide-down">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-green-400 text-sm">{success}</span>
                {resetLink && (
                  <Link
                    href={resetLink}
                    className="block mt-3 text-primary-400 hover:text-primary-300 text-sm font-medium underline transition-colors"
                  >
                    Click here to reset your password
                  </Link>
                )}
              </div>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-12"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-4 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
