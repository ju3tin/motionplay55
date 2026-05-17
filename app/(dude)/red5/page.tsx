"use client";

import { useState } from "react";

export default function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);

    try {
      const provider =
        (window as any).phantom?.solana ||
        (window as any).solana;

      const mobile = /iPhone|Android/i.test(navigator.userAgent);

      // 🚨 No wallet detected → fallback to WalletConnect / Phantom
      if (!provider) {
        const url =
          "https://phantom.app/ul/browse/" +
          encodeURIComponent(window.location.href);

        window.location.href = mobile
          ? url
          : "https://phantom.app/";

        return;
      }

      await provider.connect();

      const publicKey = provider.publicKey.toString();

      const nonce = Date.now();

      const message = `Login to App\nWallet: ${publicKey}\nNonce: ${nonce}`;

      const encoded = new TextEncoder().encode(message);

      const signed = await provider.signMessage(
        encoded,
        "utf8"
      );

      const res = await fetch("/api/auth/solana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicKey,
          message,
          signature: Array.from(signed.signature),
          nonce,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      localStorage.setItem("token", data.token);

      console.log("Logged in:", data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={login} disabled={loading}>
      {loading ? "Connecting..." : "Login with Wallet"}
    </button>
  );
}
