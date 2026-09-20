import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import NextTopLoader from 'nextjs-toploader';
import { ErrorBoundary } from '@/components';
import { ToastProvider } from '@/components/ui/Toast';
import '../styles/globals.scss';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://academy.legalerrand.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'LegalErrand — The study tool your lecturer never gave you',
    template: '%s | LegalErrand',
  },
  description:
    'AI-native study platform for Nigerian law undergraduates. Break down court cases, simplify legal concepts, and prepare for your exams.',
  keywords: [
    'Nigerian law',
    'law school Nigeria',
    'legal study tool',
    'IRAC framework',
    'case brief',
    'legal research',
    'LegalErrand',
    'law AI',
    'NLS',
    'Nigerian Bar Association',
  ],
  authors: [{ name: 'LegalErrand', url: siteUrl }],
  creator: 'LegalErrand',
  openGraph: {
    title: 'LegalErrand — The study tool your lecturer never gave you',
    description:
      'AI-native study platform for Nigerian law undergraduates. Break down court cases, simplify legal concepts, and prepare for your exams.',
    url: siteUrl,
    siteName: 'LegalErrand',
    images: [{ url: '/social-share.png?v=2', width: 1200, height: 630, alt: 'LegalErrand' }],
    type: 'website',
    locale: 'en_NG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LegalErrand — The study tool your lecturer never gave you',
    description:
      'AI-native study platform for Nigerian law undergraduates. Break down court cases, simplify legal concepts, and prepare for your exams.',
    images: ['/social-share.png?v=2'],
    creator: '@legalerrand',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NextTopLoader color="#D97706" showSpinner={false} />
        <ErrorBoundary>
          <ToastProvider>{children}</ToastProvider>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
