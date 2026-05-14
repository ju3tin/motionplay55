// app/(login)/signup00/SignupClient.tsx
'use client';

import React, { useState, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, Loader2 } from 'lucide-react';

import {
  ConnectionProvider,
  WalletProvider,
  useWallet
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import { PublicKey } from '@solana/web3.js';

function WalletLogin() {
  const wallet = useWallet();
  const router = useRouter();
  const [status, setStatus] = useState('Not connected');

  const handleWalletLogin = async () => {
    try {
      if (!wallet.connected) {
        await wallet.connect();
      }
      if (!wallet.publicKey) {
        setStatus('Failed to connect wallet');
        return;
      }
      if (!wallet.signMessage) {
        setStatus('Wallet does not support message signing');
        return;
      }

      setStatus('Connected: ' + wallet.publicKey.toString());

      // Get nonce
      const nonceRes = await fetch(`/api/get-nonce?publicKey=${wallet.publicKey.toString()}`);
      const nonce = await nonceRes.text();

      // Sign message
      const encodedMessage = new TextEncoder().encode(nonce);
      const signedMessage = await wallet.signMessage(encodedMessage);

      // Verify
      const verifyRes = await fetch("/api/verify-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey: wallet.publicKey.toString(),
          signedMessage: Array.from(signedMessage),
          nonce,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        setStatus('Authentication successful!');
        router.push('/games');
      } else {
        setStatus('Authentication failed');
      }
    } catch (err) {
      setStatus('Error during wallet login');
      console.error(err);
    }
  };

  return (
    <>
      <Button
        className="w-full h-12 text-base mb-2"
        onClick={handleWalletLogin}
      >
        Connect Phantom Wallet
      </Button>
      <p className="text-sm text-muted-foreground text-center">{status}</p>
    </>
  );
}

export default function SignupClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      alert("Check your email to confirm your account!");
      // router.push('/games'); // or redirect to verification page
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <div className="min-h-screen flex">
          {/* Left side - Form */}
          <div className="flex-1 flex flex-col justify-center px-8 lg:px-16">
            <div className="w-full max-w-md mx-auto">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Link>

              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-serif text-2xl font-bold">MotionPlay</span>
              </div>

              <h1 className="font-serif text-3xl font-bold mb-2">Create Account</h1>
              <p className="text-muted-foreground mb-8">
                Join to start playing motion games
              </p>

              {/* Email Signup Form */}
              <form onSubmit={handleEmailSignup} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              {/* OR Divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="px-3 text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-300" />
              </div>

              {/* Wallet Login */}
              <WalletLogin />

              <p className="text-center text-sm text-muted-foreground mt-8">
                Already have an account?{' '}
                <Link href="/auth/sign-in" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          {/* Right side visual */}
          <div className="hidden lg:flex flex-1 bg-secondary/30 relative overflow-hidden items-center justify-center">
            {/* ... your visual content ... */}
          </div>
        </div>
      </WalletProvider>
    </ConnectionProvider>
  );
}
