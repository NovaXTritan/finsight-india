'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { motion } from 'framer-motion';
import { useThemeStore } from '@/lib/store';
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
  ArrowRight,
  Database,
  Rocket,
  Target,
  Lock,
  Activity,
  AlertTriangle,
  Sun,
  Moon,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

// Verified signal cases from production detection
const SIGNAL_CASES = [
  {
    symbol: 'HDFCBANK',
    type: 'Volume Anomaly',
    zScore: 5.44,
    outcome: '8% decline in following sessions',
    severity: 'critical' as const,
    detail: 'Detected 5.4x average volume with institutional selling pattern before major price correction.',
    date: 'Detected pre-correction',
  },
  {
    symbol: 'HINDUNILVR',
    type: 'Volatility Spike',
    zScore: 3.58,
    outcome: 'Earnings surprise 6 days later',
    severity: 'high' as const,
    detail: 'Unusual options activity and volatility expansion detected 6 days before Q3 earnings announcement.',
    date: '6 days before Q3 earnings',
  },
];

export default function Home() {
  const { token } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const router = useRouter();

  useEffect(() => {
    if (token) router.push('/dashboard');
  }, [token, router]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] overflow-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="nav-glass rounded-xl px-5 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-display font-bold text-[var(--text-primary)]">FinSight</span>
                <span className="badge text-[9px]">INDIA</span>
              </div>
              <div className="hidden md:flex items-center space-x-8 text-sm text-[var(--text-secondary)]">
                <a href="#proof" className="hover:text-[var(--text-primary)] transition-colors">Results</a>
                <a href="#how-it-works" className="hover:text-[var(--text-primary)] transition-colors">How it Works</a>
                <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Features</a>
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-all"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <Link href="/login" className="btn-ghost text-sm hidden sm:inline-flex">Login</Link>
                <Link href="/register" className="btn-primary text-xs sm:text-sm !py-2 !px-3 sm:!px-4">Get Started</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-14 sm:pb-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center space-x-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-full px-3.5 py-1.5 mb-8">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            <span className="text-xs text-[var(--text-secondary)]">
              93% of individual F&O traders lose money
              <span className="text-[var(--text-muted)]"> — SEBI, Sep 2024</span>
            </span>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-3xl sm:text-4xl md:text-display-xl font-display text-[var(--text-primary)] mb-6 leading-[1.1]">
            Detect Market Anomalies
            <br />
            <span className="gradient-text">Before They Move</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-base md:text-lg text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed">
            Statistical anomaly detection for Indian equities. FinSight computes Z-scores across volume,
            price, and volatility to surface signals that precede major moves — verified against real market outcomes.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn-primary text-base px-7 py-3.5 flex items-center space-x-2 group">
              <Rocket className="h-4 w-4" />
              <span>Start Free</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="#proof" className="btn-secondary text-base px-7 py-3.5 flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>See Real Signals</span>
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 flex items-center justify-center space-x-5 text-xs text-[var(--text-muted)]">
            <div className="flex items-center space-x-1.5">
              <Lock className="h-3 w-3" />
              <span>No credit card</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Database className="h-3 w-3" />
              <span>Real SEBI data</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Shield className="h-3 w-3" />
              <span>Verified outcomes</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <div className="gradient-divider" />

      {/* Signal Case Studies */}
      <section id="proof" className="relative z-10 container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
        >
          <motion.div variants={fadeUp} className="text-center mb-12">
            <span className="text-caption text-[var(--text-muted)] uppercase font-semibold tracking-widest">Verified Results</span>
            <h2 className="text-display-lg font-display text-[var(--text-primary)] mt-3 mb-3">
              Real Signals, <span className="gradient-text">Real Outcomes</span>
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              These anomalies were detected by FinSight&apos;s statistical engine and verified against subsequent market data.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {SIGNAL_CASES.map((signal) => (
              <motion.div key={signal.symbol} variants={fadeUp}>
                <div className={`card p-6 h-full ${
                  signal.severity === 'critical' ? '!border-red-500/20' : '!border-amber-500/20'
                }`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        signal.severity === 'critical'
                          ? 'bg-red-500/10 border border-red-500/15'
                          : 'bg-amber-500/10 border border-amber-500/15'
                      }`}>
                        <Activity className={`h-5 w-5 ${
                          signal.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-display font-semibold text-[var(--text-primary)] font-mono">{signal.symbol}</h3>
                        <p className="text-xs text-[var(--text-muted)]">{signal.type}</p>
                      </div>
                    </div>
                    <div className={signal.severity === 'critical' ? 'severity-critical' : 'severity-high'}>
                      Z: {signal.zScore}
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">{signal.detail}</p>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)]">
                    <div className="flex items-center space-x-1.5">
                      <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">{signal.outcome}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">{signal.date}</span>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* CTA Card */}
            <motion.div variants={fadeUp}>
              <div className="card-accent p-6 h-full flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-2">Your Watchlist Next</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-5">
                  Add your stocks and get real-time anomaly alerts with Z-score analysis.
                </p>
                <Link href="/register" className="btn-primary text-sm">
                  Start Free
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Key metrics strip */}
          <motion.div variants={fadeUp} className="mt-10 max-w-5xl mx-auto">
            <div className="card p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { value: 'Z > 3.0', label: 'Signal Threshold', icon: Target },
                  { value: '5.44', label: 'Highest Z-Score', icon: Activity },
                  { value: 'NSE + BSE', label: 'Exchange Coverage', icon: Database },
                  { value: '<1 min', label: 'Detection Speed', icon: Zap },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="w-9 h-9 mx-auto mb-2 rounded-lg bg-primary-500/10 border border-primary-500/15 flex items-center justify-center">
                      <stat.icon className="h-4 w-4 text-primary-400" />
                    </div>
                    <div className="text-lg font-bold gradient-text font-mono">{stat.value}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <div className="gradient-divider" />

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
        >
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-caption text-[var(--text-muted)] uppercase font-semibold tracking-widest">Methodology</span>
            <h2 className="text-display-lg font-display text-[var(--text-primary)] mt-3 mb-3">
              How <span className="gradient-text">Detection</span> Works
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Statistical analysis, not black-box AI. Every signal has a measurable Z-score and verifiable outcome.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Database, title: 'Data Ingestion', desc: 'SEBI filings, exchange feeds, corporate actions', step: '01' },
                { icon: Brain, title: 'Z-Score Analysis', desc: 'Multi-timeframe statistical deviation computation', step: '02' },
                { icon: Target, title: 'Signal Scoring', desc: 'Severity classification with confidence thresholds', step: '03' },
                { icon: Bell, title: 'Actionable Alerts', desc: 'Dashboard signals with decision framework', step: '04' },
              ].map((step, i) => (
                <motion.div key={i} variants={fadeUp} className="relative">
                  {i < 3 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-[var(--border-default)] z-0" />
                  )}
                  <div className="relative z-10 card p-5 text-center h-full">
                    <div className="text-[10px] font-mono font-bold text-primary-400 mb-2">{step.step}</div>
                    <div className="w-11 h-11 mx-auto mb-3 rounded-lg bg-primary-500/10 border border-primary-500/15 flex items-center justify-center">
                      <step.icon className="h-5 w-5 text-primary-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{step.title}</h3>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <div className="gradient-divider" />

      {/* Features - Bento Grid */}
      <section id="features" className="relative z-10 container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-50px' }}
        >
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-caption text-[var(--text-muted)] uppercase font-semibold tracking-widest">Capabilities</span>
            <h2 className="text-display-lg font-display text-[var(--text-primary)] mt-3 mb-3">
              Built for <span className="gradient-text">Indian Markets</span>
            </h2>
            <p className="text-[var(--text-secondary)] max-w-2xl mx-auto">
              Institutional-grade tools designed specifically for NSE and BSE listed equities
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              {
                icon: Brain,
                title: 'Statistical Anomaly Detection',
                description: 'Z-score based detection across volume, price, and volatility. No black boxes — every signal has a measurable statistical deviation.',
                highlight: true,
              },
              {
                icon: BarChart3,
                title: 'FII/DII Flow Tracking',
                description: 'Track institutional money flows in real-time. Know when foreign and domestic investors shift positions before the crowd notices.',
                highlight: true,
              },
              {
                icon: Zap,
                title: 'Real-time Market Data',
                description: 'Live data for Nifty 50, Sensex, Bank Nifty, and India VIX with sub-minute latency.',
              },
              {
                icon: Bell,
                title: 'Signal Dashboard',
                description: 'Severity-scored alerts with ignore/monitor/review/execute decision framework.',
              },
              {
                icon: Shield,
                title: 'Backtesting Engine',
                description: 'Test strategies against historical data with configurable parameters and risk metrics.',
              },
              {
                icon: Target,
                title: 'Outcome Tracking',
                description: 'Every signal is tracked post-detection. The system learns what works and what doesn\'t.',
              },
            ].map((feature, i) => (
              <motion.div key={i} variants={fadeUp}>
                <div className={`card p-6 h-full ${feature.highlight ? '!border-primary-500/15' : ''}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                    feature.highlight
                      ? 'bg-primary-500/12 border border-primary-500/20'
                      : 'bg-[var(--bg-muted)] border border-[var(--border-default)]'
                  }`}>
                    <feature.icon className="h-5 w-5 text-primary-400" />
                  </div>
                  <h3 className="text-base font-display font-semibold text-[var(--text-primary)] mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <div className="gradient-divider" />

      {/* CTA */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] as const }}
        >
          <div
            className="rounded-2xl p-6 sm:p-10 md:p-14 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.06) 0%, rgba(99, 102, 241, 0.04) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.12)',
            }}
          >
            <h2 className="text-display-lg font-display text-[var(--text-primary)] mb-4">
              Start Detecting Anomalies
            </h2>
            <p className="text-base text-[var(--text-secondary)] mb-8 max-w-xl mx-auto">
              Free tier includes 5 watchlist symbols, real-time anomaly detection, and full market data access.
            </p>
            <Link href="/register" className="btn-primary text-base px-8 py-3.5 inline-flex items-center space-x-2 group">
              <Rocket className="h-4 w-4" />
              <span>Create Free Account</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-xs text-[var(--text-muted)] mt-4 flex items-center justify-center space-x-1.5">
              <Lock className="h-3 w-3" />
              <span>No credit card required</span>
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border-default)]">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-primary-500 flex items-center justify-center">
                <TrendingUp className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-display font-bold text-[var(--text-primary)]">FinSight India</span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-[var(--text-muted)]">
              <span>Built by Divyanshu Kumar</span>
              <a
                href="https://novaxtritan.github.io/novaxtritanxmetamorphosis/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-primary-500 hover:text-primary-400 transition-colors"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Portfolio
              </a>
              <a
                href="https://www.linkedin.com/in/divyanshukumar27"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-primary-500 hover:text-primary-400 transition-colors"
              >
                <Linkedin className="h-3 w-3 mr-1" />
                LinkedIn
              </a>
            </div>
            <p className="text-[var(--text-muted)] text-xs">
              &copy; {new Date().getFullYear()} FinSight India
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
