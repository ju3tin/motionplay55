"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);

    try {
      const provider = window.phantom?.solana;

      if (!provider?.isPhantom) {
        alert("Install Phantom wallet");
        return;
      }

      // Connect wallet
      await provider.connect();

      const publicKey = provider.publicKey.toString();

      const message = `Login to Supabase\nWallet: ${publicKey}\nNonce: ${Date.now()}`;

      const encodedMessage = new TextEncoder().encode(message);

      const signed = await provider.signMessage(
        encodedMessage,
        "utf8"
      );

      const res = await fetch("/api/auth/solana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey,
          message,
          signature: Array.from(signed.signature),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Set Supabase session using custom JWT
      await supabase.auth.setSession({
        access_token: data.token,
        refresh_token: "",
      });

      console.log("Logged in:", data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={login} disabled={loading}>
      {loading ? "Connecting..." : "Login with Phantom"}
    </button>
  );
}
