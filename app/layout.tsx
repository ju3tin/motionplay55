import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import '@solana/wallet-adapter-react-ui/styles.css';
import './globals.css';

// Never render wallet providers on the server — they need browser APIs
const Providers = dynamic(
  () => import('../providers').then((m) => m.Providers),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'MotionPlay',
  description: 'Solana competition platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}