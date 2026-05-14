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
       <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0f;
          background-image:
            radial-gradient(ellipse 60% 50% at 20% 20%, rgba(99, 57, 255, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 80%, rgba(0, 200, 150, 0.1) 0%, transparent 60%);
          padding: 24px;
          font-family: 'DM Sans', sans-serif;
        }

        .login-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 48px 40px;
          width: 100%;
          max-width: 420px;
          backdrop-filter: blur(20px);
          box-shadow: 0 40px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo-mark {
          font-size: 36px;
          margin-bottom: 16px;
          display: block;
          background: linear-gradient(135deg, #9945FF, #14F195);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-title {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 8px;
          letter-spacing: -0.5px;
        }

        .login-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.45);
          margin: 0;
          line-height: 1.5;
        }

        .wallet-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          background: linear-gradient(135deg, rgba(153,69,255,0.2), rgba(20,241,149,0.1));
          border: 1px solid rgba(153,69,255,0.4);
          border-radius: 12px;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .wallet-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(153,69,255,0.35), rgba(20,241,149,0.18));
          border-color: rgba(153,69,255,0.7);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(153,69,255,0.2);
        }

        .wallet-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .wallet-icon {
          font-size: 18px;
        }

        .wallet-arrow {
          margin-left: auto;
          opacity: 0.5;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0;
          color: rgba(255,255,255,0.25);
          font-size: 12px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

        .email-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field label {
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          letter-spacing: 0.2px;
        }

        .field input {
          padding: 12px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }

        .field input::placeholder {
          color: rgba(255,255,255,0.2);
        }

        .field input:focus {
          border-color: rgba(153,69,255,0.5);
          background: rgba(153,69,255,0.05);
        }

        .field input:disabled {
          opacity: 0.5;
        }

        .alert {
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.5;
        }

        .alert-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5;
        }

        .alert-success {
          background: rgba(20,241,149,0.08);
          border: 1px solid rgba(20,241,149,0.2);
          color: #14F195;
        }

        .submit-btn {
          padding: 14px;
          background: linear-gradient(135deg, #9945FF, #14F195);
          border: none;
          border-radius: 12px;
          color: #000;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s;
          letter-spacing: 0.3px;
        }

        .submit-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mode-toggle {
          text-align: center;
          margin: 20px 0 0;
          font-size: 13px;
          color: rgba(255,255,255,0.35);
        }

        .mode-toggle button {
          background: none;
          border: none;
          color: #9945FF;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .mode-toggle button:hover {
          color: #14F195;
        }
      `}</style>
    </main>
  );
}
