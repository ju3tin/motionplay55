'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { supabase } from '@/lib/supabase1';   // ← Client version

export default function SolanaSignup() {
  const { publicKey, signMessage, connected, disconnect } = useWallet();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Listen to auth changes
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

      // Request signature from wallet
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      // Convert signature to base64
      const signatureBase64 = Buffer.from(signature).toString('base64');

      // Send to Supabase Web3 Auth
      const { data, error: authError } = await supabase.auth.signInWithWeb3({
        chain: 'solana',
        statement: message,
        signature: signatureBase64,
        publicKey: walletAddress,
      });

      if (authError) throw authError;

      setSuccess(true);
      console.log('✅ User authenticated:', data.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sign up with wallet');
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
          {/* Wallet Connect Button */}
          <div className="flex justify-center">
            <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 transition-all" />
          </div>

          {/* Sign Message Button */}
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

          {/* Messages */}
          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-2xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-900/50 border border-green-700 rounded-2xl text-green-400">
              ✅ Account created successfully!
            </div>
          )}

          {user && (
            <div className="text-center text-sm text-gray-400">
              Logged in as: <span className="text-purple-400 font-mono">{user.id}</span>
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
