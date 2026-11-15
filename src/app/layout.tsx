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

export const viewport: Viewport = { themeColor: '#0d1117', viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <header className="tabbar">
          <nav aria-label={SHELL_COPY.navLabel}>
            <Link className="tab-home" href="/">
              {SHELL_COPY.navHome}
            </Link>
            <Link className="tab-session" href="/session">
              {SHELL_COPY.navSession}
            </Link>
            <Link className="tab-cards" href="/cards">
              {SHELL_COPY.navCards}
            </Link>
          </nav>
        </header>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}