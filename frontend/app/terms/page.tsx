'use client';

import Link from 'next/link';
import { TrendingUp, ArrowLeft, FileText, Shield, Scale } from 'lucide-react';

export default function TermsPage() {
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
              <FileText className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-display-lg font-display font-bold text-[var(--text-primary)]">Terms of Service</h1>
              <p className="text-sm text-[var(--text-muted)]">Last updated: March 2026</p>
            </div>
          </div>
          <div className="gradient-divider" />
        </div>

        <div className="card p-6 md:p-8 space-y-8">
          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">1. Acceptance of Terms</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              By accessing or using FinSight India (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to all of these terms, you may not access or use the Service. These terms apply to all visitors, users, and others who access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">2. Description of Service</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              FinSight India is a statistical anomaly detection platform for Indian equities. The Service provides Z-score based analysis across volume, price, and volatility metrics for securities listed on the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE). The Service is provided for educational and informational purposes only and does not constitute investment advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">3. User Accounts</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
              <p>When you create an account with us, you must provide accurate and complete information. You are responsible for:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Maintaining the security of your account and password.</li>
                <li>All activities that occur under your account.</li>
                <li>Notifying us immediately of any unauthorized use of your account.</li>
              </ul>
              <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in abusive behavior.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">4. Acceptable Use</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Use the Service for any unlawful purpose or in violation of any applicable regulations, including SEBI regulations.</li>
                <li>Attempt to reverse-engineer, decompile, or extract the source code or algorithms of the Service.</li>
                <li>Scrape, crawl, or use automated means to access the Service beyond the provided API or interface.</li>
                <li>Redistribute, resell, or sublicense the data, signals, or analysis provided by the Service without written permission.</li>
                <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">5. Intellectual Property</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              The Service, including its original content, features, functionality, design, and underlying algorithms, is owned by FinSight India and is protected by intellectual property laws. Our trademarks and trade dress may not be used in connection with any product or service without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">6. Service Tiers and Limitations</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
              <p>FinSight India offers free and premium tiers. Free accounts are subject to limitations including:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Maximum number of watchlist symbols.</li>
                <li>Rate limits on API requests.</li>
                <li>Access to certain advanced features may be restricted.</li>
              </ul>
              <p>We reserve the right to modify tier features and limitations at any time with reasonable notice.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">7. Data Accuracy and Availability</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              While we strive to provide accurate and timely market data, we do not guarantee the accuracy, completeness, or availability of any data or analysis. Market data is sourced from third-party providers and may be delayed. The Service may experience downtime for maintenance or due to circumstances beyond our control. We are not liable for any losses resulting from data inaccuracies or service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">8. Disclaimer of Warranties</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              The Service is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis, without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">9. Limitation of Liability</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              In no event shall FinSight India, its creators, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation loss of profits, data, or other intangible losses, resulting from your use of or inability to use the Service. This includes any trading losses incurred based on signals or analysis provided by the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">10. Changes to Terms</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days&apos; notice prior to any new terms taking effect. Continued use of the Service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">11. Governing Law</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service shall be subject to the exclusive jurisdiction of the courts in New Delhi, India.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">12. Contact</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              If you have any questions about these Terms, please contact us through the FinSight India platform or reach out to the project maintainer.
            </p>
          </section>
        </div>

        {/* Related Legal Pages */}
        <div className="mt-10">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Related Legal Pages</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/privacy" className="card p-5 flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)] flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-primary-400 transition-colors">Privacy Policy</p>
                <p className="text-xs text-[var(--text-muted)]">How we handle your data</p>
              </div>
            </Link>
            <Link href="/disclaimer" className="card p-5 flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-lg bg-[var(--bg-muted)] border border-[var(--border-default)] flex items-center justify-center">
                <Scale className="h-4 w-4 text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-primary-400 transition-colors">Investment Disclaimer</p>
                <p className="text-xs text-[var(--text-muted)]">Important risk disclosures</p>
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
