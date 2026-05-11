import type { Metadata } from 'next';
import '@solana/wallet-adapter-react-ui/styles.css';
import { Analytics } from "@vercel/analytics/next"
import './globals.css';
import { ClientProviders } from '@/app/ClientProviders';

export const metadata: Metadata = {
  metadataBase: new URL('https://motionplay.vercel.app'),

  title: {
    default: 'MotionPlay',
    template: '%s | MotionPlay',
  },

  description: 'Solana competition platform',

  keywords: [
    'Solana',
    'crypto competitions',
    'web3 gaming',
    'blockchain',
    'MotionPlay',
  ],

  authors: [{ name: 'MotionPlay' }],
  creator: 'MotionPlay',
  publisher: 'MotionPlay',

  openGraph: {
    title: 'MotionPlay',
    description: 'Solana competition platform',
    url: 'https://motionplay.vercel.app',
    siteName: 'MotionPlay',
    images: [
      {
        url: '/og-image.png', // put in /public
        width: 1200,
        height: 630,
        alt: 'MotionPlay',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'MotionPlay',
    description: 'Solana competition platform',
    creator: '@motionplay',
    images: ['/og-image.png'],
  },

  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },

  robots: {
    index: true,
    follow: true,
  },

  alternates: {
    canonical: 'https://motionplay.vercel.app',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
      <Analytics />
    </html>
  );
}
