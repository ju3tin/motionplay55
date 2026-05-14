// lib/auth/useWalletAuth.ts
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface WalletAuthState {
  loading: boolean;
  error: string | null;
}

export function useWalletAuth() {
  const [state, setState] = useState<WalletAuthState>({
    loading: false,
    error: null,
  });
  const router = useRouter();

  const signInWithWallet = useCallback(async () => {
    setState({ loading: true, error: null });

    try {
      // 1. Check for Phantom wallet
      const provider = getPhantomProvider();
      if (!provider) {
        setState({
          loading: false,
          error:
            "Phantom wallet not found. Please install it from phantom.com.",
        });
        return;
      }

      // 2. Connect wallet
      const resp = await provider.connect();
      const walletAddress = resp.publicKey.toString();

      // 3. Request nonce from server
      const nonceRes = await fetch("/api/auth/wallet/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      if (!nonceRes.ok) {
        throw new Error("Failed to get nonce");
      }

      const { message } = await nonceRes.json();

      // 4. Sign the message
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await provider.signMessage(encodedMessage, "utf8");
      const signature = bs58Encode(signedMessage.signature);

      // 5. Verify signature with server
      const verifyRes = await fetch("/api/auth/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, signature }),
      });

      if (!verifyRes.ok) {
        const { error } = await verifyRes.json();
        throw new Error(error || "Signature verification failed");
      }

      const { redirectUrl } = await verifyRes.json();

      // 6. Redirect to complete magic-link session
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Wallet authentication failed";
      setState({ loading: false, error: message });
    }
  }, [router]);

  const clearError = () => setState((s) => ({ ...s, error: null }));

  return { ...state, signInWithWallet, clearError };
}

function getPhantomProvider(): PhantomProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const win = window as WindowWithPhantom;
  if ("phantom" in win) {
    const provider = win.phantom?.solana;
    if (provider?.isPhantom) return provider;
  }
  return undefined;
}

// Minimal bs58 encoder (avoids a full library import on client)
function bs58Encode(bytes: Uint8Array): string {
  const ALPHABET =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; ++j) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = "";
  for (let k = 0; bytes[k] === 0 && k < bytes.length - 1; ++k) str += "1";
  for (let q = digits.length - 1; q >= 0; --q) str += ALPHABET[digits[q]];
  return str;
}

// Types
interface PhantomProvider {
  isPhantom: boolean;
  connect(): Promise<{ publicKey: { toString(): string } }>;
  signMessage(
    message: Uint8Array,
    encoding: string
  ): Promise<{ signature: Uint8Array }>;
}

interface WindowWithPhantom {
  phantom?: { solana?: PhantomProvider };
}
