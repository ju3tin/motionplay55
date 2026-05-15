"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from '@/lib/supabase/client'

export default function SignUpWithSolana() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient()

  async function handleSolanaSignup() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithWeb3({
        chain: "solana",
        statement: "I accept the Terms of Service at https://example.com/tos",
      });

      if (error) throw error;

      // If you’re not seeing the redirect immediately, it’s still safe to navigate.
      router.push("/profile");
    } catch (e: any) {
      alert(e?.message ?? "Solana sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 100 }}>
      <button onClick={handleSolanaSignup} disabled={loading}>
        {loading ? "Connecting..." : "Sign up with Solana"}
      </button>
    </div>
  );
}
