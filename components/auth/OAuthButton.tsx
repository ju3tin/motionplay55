"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Provider = "github" | "google";

type OAuthButtonProps = {
  provider: Provider;
  children: React.ReactNode;
  className?: string;
  redirectTo?: string;
};

export default function OAuthButton({
  provider,
  children,
  className,
  redirectTo = `${window.location.origin}/auth/callback`,
}: OAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleLogin() {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      alert(err?.message ?? "Authentication failed");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className={className}
    >
      {loading ? "Connecting..." : children}
    </button>
  );
}
