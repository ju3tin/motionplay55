'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase1';

// Dynamically import WalletMultiButton to disable SSR
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function SolanaSignup() {
  const { publicKey, signMessage, connected } = useWallet();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Auth state listener
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setSuccess(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignUp = async () => {
    if (!publicKey || !signMessage) {
      setError("Please connect your Solana wallet first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();
      const timestamp = Date.now();

      const message = `Sign this message to create your account\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;

      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      const { data, error: authError } = await supabase.auth.signInWithWeb3({
        chain: 'solana',
        statement: message,
        signature,
      });

      if (authError) throw authError;

      setSuccess(true);
      console.log('✅ Successfully authenticated:', data.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate with wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-400">Connect your Solana wallet to get started</p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 transition-all" />
          </div>

          {connected && publicKey && (
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 
                         rounded-2xl font-semibold text-lg disabled:opacity-70 
                         hover:brightness-110 transition-all duration-200"
            >
              {loading ? 'Signing Message...' : 'Sign Message & Create Account'}
            </button>
          )}

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-2xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-900/50 border border-green-700 rounded-2xl text-green-400 text-center">
              ✅ Account created successfully!
            </div>
          )}

          {user && (
            <div className="text-center text-sm text-gray-400">
              Logged in as: <span className="text-purple-400 font-mono break-all">{user.id}</span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-10">
          No email or password required • Secured by Solana + Supabase
        </p>
      </div>
    </div>
  );
}
