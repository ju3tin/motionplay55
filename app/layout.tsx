import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
// Wallet adapter CSS must live in the root layout, not in providers
import '@solana/wallet-adapter-react-ui/styles.css';
import { Providers } from '../providers';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MotionPlay',
  description: 'Solana competition platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}