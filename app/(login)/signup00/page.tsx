'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase1';

// Dynamically import the entire wallet-dependent component
const WalletAuthContent = dynamic(
  () => import('./WalletAuthContent'),
  { ssr: false }
);

export default function SolanaSignup() {
  return (
    <div className="min-h-screen bg-gray-950">
      <WalletAuthContent />
    </div>
  );
}
