'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { TrendingUp, Shield, Zap, BarChart3, Bell, Brain, Linkedin, ExternalLink, Check, Sparkles } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, token, fetchUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (token) {
      fetchUser().then(() => {
        if (useAuthStore.getState().isAuthenticated) {
          router.push('/dashboard');
        }
      });
    }
  }, [token, fetchUser, router]);

  return (
    <div className="min-h-screen bg-app-gradient bg-mesh-overlay overflow-hidden">
      {/* Animated Glow Orbs */}
      <div className="glow-orb w-96 h-96 top-20 -left-48 opacity-60" />
      <div className="glow-orb w-80 h-80 top-1/3 right-0 opacity-40" style={{ animationDelay: '2s' }} />
      <div className="glow-orb w-64 h-64 bottom-20 left-1/4 opacity-50" style={{ animationDelay: '4s' }} />

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-6">
        <div className="glass-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-500 blur-lg opacity-50" />
                <TrendingUp className="relative h-9 w-9 text-primary-400" />
              </div>
              <span className="text-2xl font-bold text-white">FinSight</span>
              <span className="badge-glow text-[10px]">INDIA</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="btn-glass-ghost"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="btn-glass-primary text-sm"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto animate-page-enter">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 glass-card px-4 py-2 mb-8">
            <Sparkles className="h-4 w-4 text-primary-400" />
            <span className="text-sm text-gray-300">Powered by AI for Indian Markets</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            AI-Powered Market
            <br />
            <span className="gradient-text">Intelligence</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Detect market anomalies, track FII/DII flows, and get AI-driven signals.
            All in one platform designed for Nifty, Sensex, and Indian stocks.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/register"
              className="btn-glass-primary text-lg px-8 py-4 shine-effect"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="btn-glass-secondary text-lg px-8 py-4"
            >
              Learn More
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto stagger-children">
            <StatCard number="100+" label="Data Sources" />
            <StatCard number="20+" label="Nifty Stocks" />
            <StatCard number="24/7" label="AI Monitoring" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Everything You Need in <span className="gradient-text-static">One Platform</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Built for Indian retail investors who want institutional-grade tools
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          <FeatureCard
            icon={<Brain className="h-8 w-8" />}
            title="AI Anomaly Detection"
            description="Our AI agent analyzes volume spikes, price movements, and volatility to identify trading opportunities."
          />
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8" />}
            title="FII/DII Tracking"
            description="Real-time institutional flow data. Know when foreign and domestic investors are buying or selling."
          />
          <FeatureCard
            icon={<Bell className="h-8 w-8" />}
            title="Smart Alerts"
            description="Get notified about signals that matter. Our AI learns from outcomes to improve signal quality."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8" />}
            title="Real-time Data"
            description="Live market data for Nifty 50, Sensex, Bank Nifty, and India VIX. Always stay updated."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8" />}
            title="Behavioral Protection"
            description="Avoid FOMO and panic selling. Our system helps protect you from emotional trading mistakes."
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8" />}
            title="Outcome Learning"
            description="We track what happens after each signal. The system learns and improves over time."
          />
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Simple, <span className="gradient-text-static">Transparent</span> Pricing
          </h2>
          <p className="text-gray-400">Start free, upgrade when you need more</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto stagger-children">
          <PricingCard
            tier="Free"
            price="0"
            features={[
              '5 watchlist symbols',
              'Basic screener',
              'EOD data',
              'News feed',
              '1 portfolio',
            ]}
          />
          <PricingCard
            tier="Pro"
            price="499"
            popular
            features={[
              '25 watchlist symbols',
              'Full screener',
              'Real-time data',
              'FII/DII alerts',
              'Bulk deal alerts',
              '5 portfolios',
            ]}
          />
          <PricingCard
            tier="Premium"
            price="999"
            features={[
              'Unlimited watchlist',
              'All Pro features',
              'F&O analytics',
              'Backtesting',
              'AI analysis',
              'API access',
              'Priority support',
            ]}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="h-6 w-6 text-primary-400" />
                <span className="text-lg font-bold text-white">FinSight India</span>
              </div>
              <p className="text-gray-400 text-sm">
                AI-powered market intelligence platform for Indian retail investors.
                Real-time anomaly detection, FII/DII tracking, and smart signals.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/login" className="hover:text-primary-400 transition-colors">Login</Link></li>
                <li><Link href="/register" className="hover:text-primary-400 transition-colors">Register</Link></li>
                <li><Link href="#features" className="hover:text-primary-400 transition-colors">Features</Link></li>
              </ul>
            </div>

            {/* Developer */}
            <div>
              <h4 className="text-white font-semibold mb-4">Developer</h4>
              <p className="text-gray-400 text-sm mb-3">Created by Divyanshu Kumar</p>
              <div className="flex space-x-4">
                <a
                  href="https://novaxtritan.github.io/novaxtritanxmetamorphosis/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-gray-400 hover:text-primary-400 transition-colors"
                >
                  <ExternalLink className="h-5 w-5 mr-1" />
                  <span className="text-sm">Portfolio</span>
                </a>
                <a
                  href="https://www.linkedin.com/in/divyanshukumar27"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-gray-400 hover:text-primary-400 transition-colors"
                >
                  <Linkedin className="h-5 w-5 mr-1" />
                  <span className="text-sm">LinkedIn</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} FinSight India. Built with AI.
            </p>
            <p className="text-gray-500 text-sm mt-2 md:mt-0">
              Made with care for Indian retail investors
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="glass-card p-6 text-center card-hover-glow">
      <div className="text-4xl font-bold gradient-text mb-2">{number}</div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card-dark p-6 card-hover-lift group">
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative text-primary-400 group-hover:text-primary-300 transition-colors">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function PricingCard({
  tier,
  price,
  features,
  popular,
}: {
  tier: string;
  price: string;
  features: string[];
  popular?: boolean;
}) {
  return (
    <div
      className={`glass-card-dark p-6 relative ${
        popular ? 'glow-border animate-pulse-glow' : ''
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="badge-glow">MOST POPULAR</span>
        </div>
      )}
      <h3 className="text-xl font-semibold text-white mt-2">{tier}</h3>
      <div className="mt-4 mb-6">
        <span className="text-4xl font-bold text-white">&#8377;{price}</span>
        <span className="text-gray-400">/month</span>
      </div>
      <ul className="space-y-3 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center text-gray-300">
            <div className="mr-2 w-5 h-5 rounded-full bg-primary-500/20 flex items-center justify-center">
              <Check className="h-3 w-3 text-primary-400" />
            </div>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`block w-full text-center py-3 rounded-xl font-semibold transition-all ${
          popular
            ? 'btn-glass-primary'
            : 'border border-white/20 text-white hover:bg-white/10'
        }`}
      >
        Get Started
      </Link>
    </div>
  );
}
