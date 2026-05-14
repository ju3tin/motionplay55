'use client';

import dynamic from 'next/dynamic';

const WalletAuthContent = dynamic(
  () => import('./WalletAuthContent'),
  { ssr: false }
);

export default function SolanaSignup() {
  return <WalletAuthContent />;
}

export const dynamic = 'force-dynamic';
