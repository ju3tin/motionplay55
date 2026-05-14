'use client';

import dynamicImport from 'next/dynamic';   // ← renamed import

const WalletAuthContent = dynamicImport(
  () => import('./WalletAuthContent'),
  { ssr: false }
);

export default function SolanaSignup() {
  return <WalletAuthContent />;
}

// Important: Force dynamic rendering
export const dynamic = 'force-dynamic';
