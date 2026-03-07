'use client';

import Link from 'next/link';
import { TrendingUp, ArrowLeft, Scale, FileText, Shield, AlertTriangle } from 'lucide-react';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="nav-glass rounded-xl px-5 py-2.5">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-display font-bold text-[var(--text-primary)]">FinSight</span>
                <span className="badge text-[9px]">INDIA</span>
              </Link>
              <Link href="/" className="btn-ghost text-sm flex items-center space-x-1.5">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Home</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-12 max-w-3xl animate-page-enter">
        <div className="mb-10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
              <Scale className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-display-lg font-display font-bold text-[var(--text-primary)]">Investment Disclaimer</h1>
              <p className="text-sm text-[var(--text-muted)]">Last updated: March 2026</p>
            </div>
          </div>
          <div className="gradient-divider" />
        </div>

        {/* Core Disclaimer Banner */}
        <div className="rounded-xl p-5 md:p-6 mb-8 border border-amber-500/20" style={{ background: 'rgba(245, 158, 11, 0.06)' }}>
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-sm md:text-base text-amber-200/90 leading-relaxed font-medium">
              FinSight provides statistical anomaly detection for educational and informational purposes only. This is not investment advice, not a recommendation to buy or sell any security, and not a substitute for professional financial guidance. Past signal performance does not predict future results. The creators are not SEBI-registered Research Analysts. Trade at your own risk.
            </p>
          </div>
        </div>

        <div className="card p-6 md:p-8 space-y-8">
          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">1. Not Investment Advice</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              All content, data, signals, analysis, and information provided by FinSight India is for educational and informational purposes only. Nothing on this platform constitutes investment advice, financial advice, trading advice, or any other type of advice. You should not treat any of the platform&apos;s content as such. FinSight India does not recommend that any security, portfolio of securities, transaction, or investment strategy is suitable for any specific person.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">2. No SEBI Registration</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              The creators and operators of FinSight India are not registered with the Securities and Exchange Board of India (SEBI) as Research Analysts, Investment Advisors, or in any other capacity. The platform does not hold any license or registration from SEBI or any other financial regulatory body. The signals and analysis provided should not be construed as recommendations from a registered professional.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">3. Statistical Nature of Signals</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
              <p>FinSight India uses statistical methods (Z-score analysis) to detect anomalies in market data. It is important to understand:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>A statistical anomaly is not a prediction. It indicates that a data point deviates significantly from its historical average.</li>
                <li>High Z-scores do not guarantee future price movements in any direction.</li>
                <li>Anomalies may be caused by benign factors (e.g., index rebalancing, block deals, corporate actions) that have no predictive value.</li>
                <li>The absence of an anomaly does not mean a security is safe or stable.</li>
                <li>Detection models are based on historical patterns and may not account for unprecedented market events.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">4. Past Performance</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Any references to past signal detections and their subsequent market outcomes are provided for illustrative and educational purposes only. Past performance of any signal, strategy, or the platform as a whole is not indicative of future results. The financial markets are inherently unpredictable, and historical patterns may not repeat. Backtesting results are hypothetical and do not represent actual trading.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">5. Market Data Accuracy</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
              <p>Market data displayed on FinSight India is sourced from third-party providers (including Yahoo Finance and NSE feeds). We do not guarantee:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>The accuracy, completeness, or timeliness of any market data.</li>
                <li>That data will be available without interruption.</li>
                <li>That prices reflect real-time market conditions (data may be delayed).</li>
              </ul>
              <p>Always verify market data with your broker or an official exchange source before making any trading decisions.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">6. Risk of Trading</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
              <p>Trading in securities involves substantial risk of loss. Please consider the following:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You may lose some or all of your invested capital.</li>
                <li>Futures and Options (F&O) trading carries particularly high risk. As per SEBI&apos;s study (September 2024), 93% of individual F&O traders incurred losses.</li>
                <li>Leveraged trading amplifies both gains and losses.</li>
                <li>Market conditions can change rapidly due to economic, political, or global events.</li>
                <li>Liquidity risk may prevent you from exiting positions at desired prices.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">7. Your Responsibility</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
              <p>By using FinSight India, you acknowledge and agree that:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>All investment and trading decisions are solely your own responsibility.</li>
                <li>You should consult with a qualified, SEBI-registered financial advisor before making any investment decisions.</li>
                <li>You will conduct your own research and due diligence before trading any security.</li>
                <li>You will not rely solely on FinSight India&apos;s signals or analysis for making trading decisions.</li>
                <li>You understand and accept the risks associated with securities trading.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">8. Limitation of Liability</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Under no circumstances shall FinSight India, its creators, contributors, or affiliates be held liable for any loss or damage, including without limitation any financial loss, direct or indirect, arising from the use of or reliance on information, signals, or analysis provided by the platform. This includes but is not limited to trading losses, lost profits, loss of data, or any consequential, incidental, or special damages.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">9. Academic and Research Context</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              FinSight India was developed as a research project exploring statistical anomaly detection in Indian equity markets. The platform demonstrates the application of quantitative methods to market data analysis. It is intended to serve as an educational tool and a proof-of-concept for statistical detection techniques, not as a commercial trading system.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">10. Regulatory Compliance</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Users are responsible for ensuring their use of FinSight India complies with all applicable laws and regulations, including SEBI regulations, the Securities Contracts (Regulation) Act, 1956, and any other relevant Indian financial regulations. The platform is not designed to facilitate insider trading, market manipulation, or any other illegal activity.
            </p>
          </section>
        </div>

        {/* Related Legal Pages */}
        <div className="mt-10">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Related Legal Pages</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/terms" className="card p-5 flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)] flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-primary-400 transition-colors">Terms of Service</p>
                <p className="text-xs text-[var(--text-muted)]">Rules governing use of FinSight</p>
              </div>
            </Link>
            <Link href="/privacy" className="card p-5 flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)] flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-primary-400 transition-colors">Privacy Policy</p>
                <p className="text-xs text-[var(--text-muted)]">How we handle your data</p>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-default)] mt-12">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-md bg-primary-500 flex items-center justify-center">
                <TrendingUp className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-display font-bold text-[var(--text-primary)]">FinSight India</span>
            </div>
            <p className="text-[var(--text-muted)] text-xs">
              &copy; {new Date().getFullYear()} FinSight India. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
