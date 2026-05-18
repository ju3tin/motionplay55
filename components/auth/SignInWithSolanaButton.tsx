"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SignInWithSolanaButtonProps = {
  redirectTo?: string;
  className?: string;
  statement?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
};

export default function SignInWithSolanaButton({
  redirectTo = "/profile",
  className,
  statement = "I accept the Terms of Service at https://example.com/tos",
  onSuccess,
  onError,
  children,
}: SignInWithSolanaButtonProps) {
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSolanaSignup() {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithWeb3({
        chain: "solana",
        statement,
      });

      if (error) throw error;

      onSuccess?.();

      router.push(redirectTo);
    } catch (err: any) {
      onError?.(err);

      alert(err?.message ?? "Solana sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSolanaSignup}
      disabled={loading}
      className={className}
    >
      {loading
        ? "Connecting..."
        : children ?? "Sign up with Solana"}
    </button>
  );
}
