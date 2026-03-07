'use client';

import Link from 'next/link';
import { TrendingUp, ArrowLeft, Shield, FileText, Scale } from 'lucide-react';

export default function PrivacyPage() {
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
              <Shield className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-display-lg font-display font-bold text-[var(--text-primary)]">Privacy Policy</h1>
              <p className="text-sm text-[var(--text-muted)]">Last updated: March 2026</p>
            </div>
          </div>
          <div className="gradient-divider" />
        </div>

        <div className="card p-6 md:p-8 space-y-8">
          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">1. Introduction</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              FinSight India (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Service&rdquo;) respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read this policy carefully. If you do not agree with the terms of this policy, please do not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">2. Information We Collect</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Account Information</h3>
                <p>When you register for an account, we collect:</p>
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li>Email address</li>
                  <li>Password (stored as a bcrypt hash; we never store plain-text passwords)</li>
                  <li>Account creation date and tier information</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Usage Data</h3>
                <p>We automatically collect certain information when you use the Service:</p>
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li>Watchlist symbols and portfolio holdings you add</li>
                  <li>Backtest configurations and results</li>
                  <li>API request logs (for rate limiting and abuse prevention)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Technical Data</h3>
                <p>Standard technical information collected via server logs:</p>
                <ul className="list-disc pl-5 space-y-1.5 mt-2">
                  <li>IP address and approximate location</li>
                  <li>Browser type and version</li>
                  <li>Device type and operating system</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">3. How We Use Your Information</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Create and manage your account</li>
                <li>Provide anomaly detection signals for your watchlist securities</li>
                <li>Process backtesting requests and store results</li>
                <li>Enforce rate limits and service tier restrictions</li>
                <li>Monitor and improve the performance and reliability of the Service</li>
                <li>Prevent abuse, fraud, and unauthorized access</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">4. Data Storage and Security</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
              <p>Your data is stored in a PostgreSQL database hosted on Neon (cloud infrastructure). We implement the following security measures:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Passwords are hashed using bcrypt before storage</li>
                <li>Authentication is handled via JWT (JSON Web Tokens) with expiration</li>
                <li>All communication between client and server uses HTTPS/TLS encryption</li>
                <li>Database connections use SSL and connection pooling</li>
                <li>API endpoints are protected with authentication middleware</li>
              </ul>
              <p>While we strive to use commercially acceptable means to protect your information, no method of transmission over the Internet or method of electronic storage is 100% secure.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">5. Data Sharing and Disclosure</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
              <p>We do not sell, trade, or rent your personal information to third parties. We may share information only in the following circumstances:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-[var(--text-primary)]">Service Providers:</strong> We use third-party services (cloud hosting, database providers) that may process your data on our behalf, subject to their own privacy policies.</li>
                <li><strong className="text-[var(--text-primary)]">Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities.</li>
                <li><strong className="text-[var(--text-primary)]">Protection of Rights:</strong> We may disclose information to protect our rights, property, or safety, or that of our users or the public.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">6. Cookies and Local Storage</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              FinSight India uses browser localStorage to persist your authentication state and user preferences. We do not use third-party tracking cookies or advertising cookies. Authentication tokens are stored locally on your device and are used solely to maintain your session.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">7. Your Rights</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-3">
              <p>You have the right to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="text-[var(--text-primary)]">Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong className="text-[var(--text-primary)]">Correction:</strong> Request correction of inaccurate personal data.</li>
                <li><strong className="text-[var(--text-primary)]">Deletion:</strong> Request deletion of your account and associated data.</li>
                <li><strong className="text-[var(--text-primary)]">Data Portability:</strong> Request your data in a structured, machine-readable format.</li>
              </ul>
              <p>To exercise any of these rights, contact us through the platform or reach out to the project maintainer.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">8. Data Retention</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              We retain your personal data for as long as your account is active or as needed to provide you the Service. If you request account deletion, we will remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., fraud prevention). Anonymized and aggregated data may be retained indefinitely for analytical purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">9. Third-Party Links</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              The Service may contain links to third-party websites or services (e.g., exchange websites, news sources). We are not responsible for the privacy practices of these third parties. We encourage you to read the privacy policies of any third-party sites you visit.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">10. Children&apos;s Privacy</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child under 18 has provided us with personal data, we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">11. Changes to This Policy</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date. You are advised to review this page periodically for any changes. Continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-[var(--text-primary)] mb-3">12. Contact</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              If you have any questions or concerns about this Privacy Policy, please contact us through the FinSight India platform or reach out to the project maintainer.
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
