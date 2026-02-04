'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  BarChart3,
  Bell,
  Brain,
  Linkedin,
  ExternalLink,
  Check,
  Sparkles,
  Activity,
  Eye,
  Filter,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Radio,
  Cpu,
  Database,
  LineChart,
  Target,
  Clock,
  DollarSign,
  Users,
  Rocket,
  Play,
  Volume2,
  CircleDot,
} from 'lucide-react';

// Simulated stock data for animations
const DEMO_STOCKS = [
  { symbol: 'RELIANCE', price: 2847.50, change: 2.4 },
  { symbol: 'TCS', price: 3892.15, change: -0.8 },
  { symbol: 'HDFCBANK', price: 1623.80, change: 1.2 },
  { symbol: 'INFY', price: 1456.25, change: 3.1 },
  { symbol: 'ICICIBANK', price: 1089.45, change: -1.5 },
];

const ANOMALY_TYPES = [
  { type: 'Volume Spike', icon: Activity, color: 'text-orange-400', desc: '3.2x average volume detected' },
  { type: 'Price Breakout', icon: TrendingUp, color: 'text-green-400', desc: 'Breaking 52-week high' },
  { type: 'Unusual Activity', icon: AlertTriangle, color: 'text-yellow-400', desc: 'Institutional accumulation' },
  { type: 'RSI Divergence', icon: LineChart, color: 'text-blue-400', desc: 'Bullish divergence forming' },
];

export default function Home() {
  const { isAuthenticated, token, fetchUser } = useAuthStore();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [showSignal, setShowSignal] = useState(false);
  const [tickerOffset, setTickerOffset] = useState(0);
  const [detectedAnomaly, setDetectedAnomaly] = useState(0);
  const [scanningStock, setScanningStock] = useState(0);
  const [pulseRing, setPulseRing] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUser().then(() => {
        if (useAuthStore.getState().isAuthenticated) {
          router.push('/dashboard');
        }
      });
    }
  }, [token, fetchUser, router]);

  // Animate the "How it works" steps
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Animate stock ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerOffset((prev) => prev - 1);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Animate scanning effect
  useEffect(() => {
    const interval = setInterval(() => {
      setScanningStock((prev) => (prev + 1) % DEMO_STOCKS.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Animate anomaly detection
  useEffect(() => {
    const interval = setInterval(() => {
      setDetectedAnomaly((prev) => (prev + 1) % ANOMALY_TYPES.length);
      setPulseRing(true);
      setTimeout(() => setPulseRing(false), 500);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Show signal after delay
  useEffect(() => {
    const timer = setTimeout(() => setShowSignal(true), 2000);
    return () => clearTimeout(timer);
  }, []);

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
              <Link href="/login" className="btn-glass-ghost">
                Login
              </Link>
              <Link href="/register" className="btn-glass-primary text-sm">
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Live Demo */}
      <section className="relative z-10 container mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Hero Text */}
          <div className="animate-page-enter">
            <div className="inline-flex items-center space-x-2 glass-card px-4 py-2 mb-8">
              <div className="relative">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
              </div>
              <span className="text-sm text-gray-300">Live AI Monitoring Active</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Never Miss a
              <br />
              <span className="gradient-text">Market Signal</span>
              <br />
              Again
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-xl">
              Our AI continuously scans 100+ data points across Indian markets,
              detecting anomalies and opportunities before they become obvious.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/register"
                className="btn-glass-primary text-lg px-8 py-4 shine-effect flex items-center space-x-2"
              >
                <Rocket className="h-5 w-5" />
                <span>Start Free Trial</span>
              </Link>
              <Link
                href="#how-it-works"
                className="btn-glass-secondary text-lg px-8 py-4 flex items-center space-x-2"
              >
                <Play className="h-5 w-5" />
                <span>See How It Works</span>
              </Link>
            </div>
          </div>

          {/* Right: Live Demo Animation */}
          <div className="relative">
            <div className="glass-card-dark p-6 rounded-2xl overflow-hidden">
              {/* Scanning Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Cpu className="h-5 w-5 text-primary-400" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                  <span className="text-white font-medium">AI Scanner Active</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Real-time</span>
                </div>
              </div>

              {/* Stock List with Scanning Animation */}
              <div className="space-y-2 mb-4">
                {DEMO_STOCKS.map((stock, i) => (
                  <div
                    key={stock.symbol}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all duration-300 ${
                      scanningStock === i
                        ? 'bg-primary-500/20 border border-primary-500/50'
                        : 'bg-white/5'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {scanningStock === i && (
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
                      )}
                      <span className={`font-medium ${scanningStock === i ? 'text-white' : 'text-gray-300'}`}>
                        {stock.symbol}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-white">₹{stock.price.toLocaleString()}</span>
                      <span className={`flex items-center ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stock.change >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                        {Math.abs(stock.change)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detected Anomaly Alert */}
              <div className={`relative p-4 rounded-xl bg-gradient-to-r from-primary-500/20 to-purple-500/20 border border-primary-500/30 transition-all duration-500 ${pulseRing ? 'scale-[1.02]' : ''}`}>
                {pulseRing && (
                  <div className="absolute inset-0 rounded-xl border-2 border-primary-400 animate-ping opacity-50" />
                )}
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500`}>
                    {(() => {
                      const Icon = ANOMALY_TYPES[detectedAnomaly].icon;
                      return <Icon className="h-5 w-5 text-white" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-semibold">Signal Detected!</span>
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                        NEW
                      </span>
                    </div>
                    <p className={`text-sm ${ANOMALY_TYPES[detectedAnomaly].color}`}>
                      {ANOMALY_TYPES[detectedAnomaly].type}: {ANOMALY_TYPES[detectedAnomaly].desc}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      RELIANCE.NS • {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Stats */}
            <div className="absolute -bottom-4 -left-4 glass-card px-4 py-3 animate-float">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <div className="text-white font-bold">73%</div>
                  <div className="text-xs text-gray-400">Win Rate</div>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 glass-card px-4 py-3 animate-float" style={{ animationDelay: '1s' }}>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-primary-400" />
                </div>
                <div>
                  <div className="text-white font-bold">24/7</div>
                  <div className="text-xs text-gray-400">Monitoring</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Market Ticker */}
      <section className="relative z-10 py-6 overflow-hidden border-y border-white/10 bg-black/20">
        <div className="flex items-center whitespace-nowrap animate-marquee">
          {[...DEMO_STOCKS, ...DEMO_STOCKS, ...DEMO_STOCKS].map((stock, i) => (
            <div key={i} className="flex items-center space-x-6 mx-8">
              <span className="text-white font-medium">{stock.symbol}</span>
              <span className="text-gray-300">₹{stock.price.toLocaleString()}</span>
              <span className={`flex items-center ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.change}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works - Animated Flow */}
      <section id="how-it-works" className="relative z-10 container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            How <span className="gradient-text-static">Signal Detection</span> Works
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Our AI processes millions of data points in real-time to find opportunities you'd miss
          </p>
        </div>

        {/* Visual Flow Diagram */}
        <div className="max-w-5xl mx-auto">
          {/* Steps */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { icon: Database, title: 'Data Collection', desc: '100+ sources', color: 'from-blue-500 to-cyan-500' },
              { icon: Brain, title: 'AI Analysis', desc: 'Pattern recognition', color: 'from-purple-500 to-pink-500' },
              { icon: Filter, title: 'Signal Filtering', desc: 'Quality scoring', color: 'from-orange-500 to-yellow-500' },
              { icon: Bell, title: 'Smart Alerts', desc: 'Actionable insights', color: 'from-green-500 to-emerald-500' },
            ].map((step, i) => (
              <div key={i} className="relative">
                {/* Connector Line */}
                {i < 3 && (
                  <div className="absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-white/20 to-white/5 z-0">
                    <div
                      className={`h-full bg-gradient-to-r ${step.color} transition-all duration-500`}
                      style={{ width: activeStep > i ? '100%' : '0%' }}
                    />
                  </div>
                )}

                <div
                  className={`relative z-10 glass-card-dark p-6 text-center transition-all duration-500 ${
                    activeStep === i ? 'scale-105 glow-border' : 'opacity-70'
                  }`}
                >
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg ${
                    activeStep === i ? 'animate-pulse' : ''
                  }`}>
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">{step.title}</h3>
                  <p className="text-sm text-gray-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Animated Data Flow Visualization */}
          <div className="glass-card-dark p-8 rounded-2xl mt-12">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              {/* Input: Raw Data */}
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-4">RAW DATA INPUT</div>
                <div className="space-y-2">
                  {['Price Data', 'Volume', 'FII/DII Flows', 'News Feed', 'Technical Indicators'].map((item, i) => (
                    <div
                      key={item}
                      className="glass-card px-4 py-2 text-sm text-gray-300 animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    >
                      <div className="flex items-center justify-between">
                        <span>{item}</span>
                        <Activity className="h-4 w-4 text-primary-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle: AI Processing */}
              <div className="text-center">
                <div className="relative w-40 h-40 mx-auto">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-primary-500/30 animate-spin-slow" />
                  {/* Middle ring */}
                  <div className="absolute inset-4 rounded-full border-4 border-purple-500/40 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
                  {/* Inner core */}
                  <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-glow-lg">
                    <Brain className="h-12 w-12 text-white animate-pulse" />
                  </div>
                  {/* Data particles */}
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-primary-400 rounded-full animate-orbit"
                      style={{
                        top: '50%',
                        left: '50%',
                        transform: `rotate(${i * 60}deg) translateX(70px)`,
                        animationDelay: `${i * 0.3}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-400">AI PROCESSING</div>
                <div className="text-xs text-primary-400 mt-1">Analyzing patterns...</div>
              </div>

              {/* Output: Signals */}
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-4">ACTIONABLE SIGNALS</div>
                <div className="space-y-2">
                  {[
                    { type: 'Buy Signal', stock: 'RELIANCE', conf: '87%', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
                    { type: 'Caution', stock: 'TCS', conf: '72%', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
                    { type: 'Opportunity', stock: 'INFY', conf: '91%', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
                  ].map((signal, i) => (
                    <div
                      key={i}
                      className={`glass-card px-4 py-3 border ${signal.color} animate-slide-up`}
                      style={{ animationDelay: `${i * 0.3}s` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className={`text-sm font-medium ${signal.color.split(' ')[0]}`}>{signal.type}</div>
                          <div className="text-xs text-gray-400">{signal.stock}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">{signal.conf}</div>
                          <div className="text-xs text-gray-400">confidence</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition - Before/After */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Trading <span className="gradient-text-static">Without</span> vs <span className="gradient-text-static">With</span> FinSight
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            See the difference AI-powered insights make in your trading journey
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Without FinSight */}
          <div className="glass-card-dark p-8 border border-red-500/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Without FinSight</h3>
                <p className="text-sm text-red-400">Manual & Reactive</p>
              </div>
            </div>
            <ul className="space-y-4">
              {[
                'Manually checking multiple websites',
                'Missing signals during market hours',
                'Emotional trading decisions',
                'No systematic approach',
                'Late to institutional moves',
                'Information overload',
              ].map((item, i) => (
                <li key={i} className="flex items-start space-x-3 text-gray-400">
                  <div className="mt-1 w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-red-400 text-xs">✗</span>
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* With FinSight */}
          <div className="glass-card-dark p-8 border border-green-500/20 glow-border">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">With FinSight</h3>
                <p className="text-sm text-green-400">Automated & Proactive</p>
              </div>
            </div>
            <ul className="space-y-4">
              {[
                'AI scans everything 24/7 for you',
                'Instant alerts on your phone',
                'Data-driven decisions',
                'Systematic signal filtering',
                'Early detection of big moves',
                'Only actionable insights',
              ].map((item, i) => (
                <li key={i} className="flex items-start space-x-3 text-gray-300">
                  <div className="mt-1 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-green-400" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Powerful <span className="gradient-text-static">Features</span> for Smart Trading
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
            highlight
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
            title="Risk Management"
            description="Backtest strategies, set stop-losses, and manage position sizes with our built-in tools."
          />
          <FeatureCard
            icon={<Target className="h-8 w-8" />}
            title="Outcome Learning"
            description="We track what happens after each signal. The system learns and improves over time."
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 container mx-auto px-6 py-16">
        <div className="glass-card-dark p-12 rounded-3xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard number="100+" label="Data Sources" icon={Database} />
            <StatCard number="20+" label="Nifty Stocks" icon={TrendingUp} />
            <StatCard number="24/7" label="AI Monitoring" icon={Cpu} />
            <StatCard number="<1s" label="Alert Speed" icon={Zap} />
          </div>
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

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="glass-card p-12 rounded-3xl text-center glow-border">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Trade Smarter?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of Indian traders who use FinSight to make better decisions.
            Start your free trial today.
          </p>
          <Link
            href="/register"
            className="btn-glass-primary text-lg px-10 py-4 inline-flex items-center space-x-2 shine-effect"
          >
            <Rocket className="h-5 w-5" />
            <span>Get Started Free</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-sm text-gray-400 mt-4">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-20">
        <div className="container mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
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
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/login" className="hover:text-primary-400 transition-colors">Login</Link></li>
                <li><Link href="/register" className="hover:text-primary-400 transition-colors">Register</Link></li>
                <li><Link href="#features" className="hover:text-primary-400 transition-colors">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-primary-400 transition-colors">How It Works</Link></li>
              </ul>
            </div>
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

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes orbit {
          0% { opacity: 0; transform: rotate(0deg) translateX(70px) scale(0); }
          50% { opacity: 1; transform: rotate(180deg) translateX(70px) scale(1); }
          100% { opacity: 0; transform: rotate(360deg) translateX(70px) scale(0); }
        }
        .animate-orbit {
          animation: orbit 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
      `}</style>
    </div>
  );
}

function StatCard({ number, label, icon: Icon }: { number: string; label: string; icon: any }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center">
        <Icon className="h-7 w-7 text-primary-400" />
      </div>
      <div className="text-4xl font-bold gradient-text mb-2">{number}</div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div className={`glass-card-dark p-6 card-hover-lift group ${highlight ? 'glow-border' : ''}`}>
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
        <span className="text-4xl font-bold text-white">₹{price}</span>
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
