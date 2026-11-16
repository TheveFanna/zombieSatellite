import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'zombieSatellite',
    short_name: 'zombieSat',
    description:
      'Pass predictions, pointing and a simulated Doppler beacon for a catalog of zombie satellites, from public TLE data.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: '#05070d',
    background_color: '#05070d',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
