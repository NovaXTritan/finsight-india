import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from './theme-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FinSight India - AI-Powered Market Intelligence',
  description: 'Unified market intelligence platform for Indian retail investors. Detect anomalies, track signals, and make informed trading decisions.',
  keywords: ['stock market', 'india', 'nifty', 'sensex', 'trading', 'signals', 'FII', 'DII'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
