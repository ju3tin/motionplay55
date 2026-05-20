"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import {
  useWallet,
} from "@solana/wallet-adapter-react";

import {
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";

type Props = {
  redirectTo?: string;
  className?: string;
  statement?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
};

export default function SignInWithSolanaButton({
  redirectTo = "/profile",
}: Props) {
  const [loading, setLoading] =
    useState(false);

  const router = useRouter();

  const supabase = createClient();

  const {
    connected,
    publicKey,
    connect,
  } = useWallet();

  async function handleLogin() {
    try {
      setLoading(true);

      // IMPORTANT FOR MOBILE
      if (!connected) {
        await connect();
      }

      const { error } =
        await supabase.auth.signInWithWeb3({
          chain: "solana",
          statement:
            "Sign in to the app",
        });

      if (error) {
        throw error;
      }

      router.push(redirectTo);
    } catch (err: any) {
      console.error(err);

      alert(
        err?.message ??
          "Solana login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Wallet Selector */}
      <WalletMultiButton />

      {/* Login */}
      <button
        onClick={handleLogin}
        disabled={loading || !connected}
        className="
          rounded-lg
          bg-black
          px-4
          py-2
          text-white
          disabled:opacity-50
        "
      >
        {loading
          ? "Connecting..."
          : connected
          ? `Login ${
              publicKey
                ?.toBase58()
                .slice(0, 4)
            }...`
          : "Connect Wallet First"}
      </button>
    </div>
  );
}
