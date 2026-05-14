'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { supabase } from '@/lib/supabase';
import { PublicKey } from '@solana/web3.js';

export default function SolanaSignup() {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Listen to Supabase auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleWalletAuth = async () => {
    if (!publicKey || !signMessage) {
      setError("Wallet not connected or doesn't support message signing");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const message = `Sign this message to authenticate with Solana\n\nWallet: ${publicKey.toBase58()}\nTimestamp: ${Date.now()}`;

      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      const { data, error: authError } = await supabase.auth.signInWithWeb3({
        chain: 'solana',
        statement: message,           // Important: include the statement
        // You can pass specific wallet provider if needed
        // wallet: window.phantom?.solana,
      });

      if (authError) throw authError;

      console.log('Authenticated user:', data.user);
      alert('Successfully signed up / logged in with Solana wallet!');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="max-w-md w-full p-8 rounded-2xl bg-gray-900 border border-gray-800">
        <h1 className="text-3xl font-bold text-center mb-2">Create Account</h1>
        <p className="text-gray-400 text-center mb-8">
          Connect your Solana wallet to sign up
        </p>

        <div className="space-y-6">
          {/* Wallet Connect Button */}
          <div className="flex justify-center">
            <WalletMultiButton className="bg-purple-600 hover:bg-purple-700 transition-colors" />
          </div>

          {connected && publicKey && (
            <button
              onClick={handleWalletAuth}
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold text-lg disabled:opacity-50 hover:brightness-110 transition"
            >
              {loading ? 'Signing...' : 'Sign Message & Create Account'}
            </button>
          )}

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {user && (
            <div className="p-4 bg-green-900/50 border border-green-700 rounded-xl">
              <p className="text-green-400 font-medium">✅ Authenticated as:</p>
              <p className="text-sm break-all mt-1">{user.id}</p>
              <button
                onClick={() => supabase.auth.signOut()}
                className="mt-4 text-sm text-red-400 hover:text-red-500"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          No password required • Powered by Supabase + Solana
        </p>
      </div>
    </div>
  );
}