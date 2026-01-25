'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { TrendingUp, Shield, Zap, BarChart3, Bell, Brain, Github, Linkedin, ExternalLink } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-primary-500" />
            <span className="text-2xl font-bold text-white">FinSight</span>
            <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">INDIA</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          AI-Powered Market Intelligence
          <br />
          <span className="text-primary-500">for Indian Traders</span>
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          Detect market anomalies, track FII/DII flows, and get AI-driven signals.
          All in one platform designed for Nifty, Sensex, and Indian stocks.
        </p>
        <div className="flex justify-center space-x-4">
          <Link
            href="/register"
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
          >
            Start Free Trial
          </Link>
          <Link
            href="#features"
            className="border border-gray-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-gray-800 transition-colors"
          >
            Learn More
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-16 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-500">100+</div>
            <div className="text-gray-400">Data Sources</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-500">20+</div>
            <div className="text-gray-400">Nifty Stocks</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-500">24/7</div>
            <div className="text-gray-400">AI Monitoring</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Everything You Need in One Platform
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
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
      <section className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Simple, Transparent Pricing
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
      <footer className="border-t border-gray-800 mt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="h-6 w-6 text-primary-500" />
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
                <li><Link href="/login" className="hover:text-primary-500 transition-colors">Login</Link></li>
                <li><Link href="/register" className="hover:text-primary-500 transition-colors">Register</Link></li>
                <li><Link href="#features" className="hover:text-primary-500 transition-colors">Features</Link></li>
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
                  className="flex items-center text-gray-400 hover:text-primary-500 transition-colors"
                >
                  <ExternalLink className="h-5 w-5 mr-1" />
                  <span className="text-sm">Portfolio</span>
                </a>
                <a
                  href="https://www.linkedin.com/in/divyanshukumar27"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-gray-400 hover:text-primary-500 transition-colors"
                >
                  <Linkedin className="h-5 w-5 mr-1" />
                  <span className="text-sm">LinkedIn</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between">
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
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-primary-500/50 transition-colors">
      <div className="text-primary-500 mb-4">{icon}</div>
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
      className={`bg-gray-800/50 border rounded-xl p-6 ${
        popular ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-700'
      }`}
    >
      {popular && (
        <div className="text-xs font-semibold text-primary-500 mb-2">MOST POPULAR</div>
      )}
      <h3 className="text-xl font-semibold text-white">{tier}</h3>
      <div className="mt-4 mb-6">
        <span className="text-4xl font-bold text-white">&#8377;{price}</span>
        <span className="text-gray-400">/month</span>
      </div>
      <ul className="space-y-3 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center text-gray-300">
            <svg
              className="h-5 w-5 text-primary-500 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`block w-full text-center py-2 rounded-lg transition-colors ${
          popular
            ? 'bg-primary-600 hover:bg-primary-700 text-white'
            : 'border border-gray-600 text-white hover:bg-gray-700'
        }`}
      >
        Get Started
      </Link>
    </div>
  );
}
