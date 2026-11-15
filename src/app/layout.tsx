import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { SHELL_COPY } from '../components/shell/copy';
import ServiceWorkerRegistrar from '../components/shell/service-worker-registrar';
import './globals.css';

export const metadata: Metadata = {
  title: 'zombieSatellite',
  description: 'Pass predictions for seven zombie satellites from public TLE data.',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'zombieSat', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = { themeColor: '#0d1117' };

const headerStyle = { maxWidth: '40rem', margin: '0 auto', padding: '0.5rem 1rem 0' } as const;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={headerStyle}>
          <nav aria-label={SHELL_COPY.navLabel}>
            <Link href="/">{SHELL_COPY.navHome}</Link> · <Link href="/session">{SHELL_COPY.navSession}</Link> ·{' '}
            <Link href="/cards">{SHELL_COPY.navCards}</Link>
          </nav>
        </header>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
