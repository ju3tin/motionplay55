"use client";

import { useState, useTransition } from "react";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth/actions";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";

// Define mode type
type Mode = "signin" | "signup";

// Define result type for authentication actions
type ActionResult =
  | { success: string; error?: undefined }
  | { error: string; success?: undefined };

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const { loading: walletLoading, error: walletError, signInWithWallet, clearError } =
    useWalletAuth();

  const isLoading = isPending || walletLoading;

  // --------------------------
  // Handle email form submission
  // --------------------------
  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const action = mode === "signin" ? signInWithEmail : signUpWithEmail;
      const result: ActionResult = await action(formData);

      // Type-safe result handling
      if ("error" in result) {
        setMessage({ type: "error", text: result.error });
      } else if ("success" in result) {
        setMessage({ type: "success", text: result.success });
      }
    });
  }

  // --------------------------
  // Display messages
  // --------------------------
  const displayError = walletError || (message?.type === "error" ? message.text : null);
  const displaySuccess = message?.type === "success" ? message.text : null;

  return (
    <main className="login-root">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="logo-mark">◎</div>
          <h1 className="login-title">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="login-subtitle">
            {mode === "signin"
              ? "Sign in with your email or Solana wallet"
              : "Get started with your email or Solana wallet"}
          </p>
        </div>

        {/* Wallet Button */}
        <button
          className="wallet-btn"
          onClick={() => { clearError(); signInWithWallet(); }}
          disabled={isLoading}
        >
          <span className="wallet-icon">👻</span>
          <span>{walletLoading ? "Waiting for wallet…" : "Continue with Phantom"}</span>
          {!walletLoading && <span className="wallet-arrow">→</span>}
        </button>

        {/* Divider */}
        <div className="divider">
          <span>or continue with email</span>
        </div>

        {/* Email Form */}
        <form className="email-form" onSubmit={handleEmailSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="••••••••"
              disabled={isLoading}
              minLength={8}
            />
          </div>

          {/* Messages */}
          {displayError && (
            <div className="alert alert-error" role="alert">
              {displayError}
            </div>
          )}
          {displaySuccess && (
            <div className="alert alert-success" role="alert">
              {displaySuccess}
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isPending
              ? "Loading…"
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        {/* Mode toggle */}
        <p className="mode-toggle">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => { setMessage(null); setMode("signup"); }}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => { setMessage(null); setMode("signin"); }}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>

      {/* Styles (unchanged from your version) */}
      <style jsx>{/* Your CSS here */}</style>
    </main>
  );
}
