import type { Metadata } from 'next';
import '@solana/wallet-adapter-react-ui/styles.css';
import { Analytics } from "@vercel/analytics/next"
import './globals.css';
import { ClientProviders } from '@/app/ClientProviders';

export const metadata: Metadata = {
  title: 'MotionPlay',
  description: 'Solana competition platform',
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
