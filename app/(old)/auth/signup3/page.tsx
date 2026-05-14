'use client'

import React, { useState, useMemo } from "react"
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from "@solana/wallet-adapter-react"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"

// ─── Wallet Sign-Up Component ────────────────────────────────────────────────

function WalletSignUp() {
  const wallet = useWallet()
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleWalletSignUp = async () => {
    setIsLoading(true)
    setStatus(null)

    try {
      // Must select the adapter before connecting, otherwise WalletNotSelectedError
      if (!wallet.connected) {
        if (!wallet.wallet) {
          // Manually select Phantom before calling connect()
          wallet.select('Phantom' as any)
          // Give the adapter a tick to register the selection
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
        await wallet.connect()
      }

      if (!wallet.publicKey) {
        setStatus('Failed to connect wallet')
        setIsLoading(false)
        return
      }

      if (!wallet.signMessage) {
        setStatus('Wallet does not support message signing')
        setIsLoading(false)
        return
      }

      // 1. Get nonce from API
      const nonceRes = await fetch(
        `/api/get-nonce?publicKey=${wallet.publicKey.toString()}`
      )
      const nonce = await nonceRes.text()

      // 2. Sign nonce
      const encodedMessage = new TextEncoder().encode(nonce)
      const signedMessage = await wallet.signMessage(encodedMessage)

      // 3. Register wallet with API
      const registerRes = await fetch('/api/register-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: wallet.publicKey.toString(),
          signedMessage: Array.from(signedMessage),
          nonce,
        }),
      })
      const registerData = await registerRes.json()

      if (registerData.success) {
        setStatus('Wallet registered successfully!')
        router.push('/games')
      } else {
        setStatus(registerData.error ?? 'Registration failed')
      }
    } catch (err) {
      console.error(err)
      setStatus('Error during wallet sign-up')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 text-base"
        onClick={handleWalletSignUp}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting…
          </>
        ) : (
          'Sign up with Phantom Wallet'
        )}
      </Button>
      {status && (
        <p
          className={`text-sm text-center ${
            status.includes('successfully')
              ? 'text-green-600'
              : 'text-muted-foreground'
          }`}
        >
          {status}
        </p>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) throw signUpError

      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength = (pw: string) => {
    if (!pw) return null
    if (pw.length < 6) return { label: 'Weak', color: 'bg-red-400', width: 'w-1/4' }
    if (pw.length < 10) return { label: 'Fair', color: 'bg-yellow-400', width: 'w-2/4' }
    if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
      return { label: 'Good', color: 'bg-blue-400', width: 'w-3/4' }
    return { label: 'Strong', color: 'bg-green-500', width: 'w-full' }
  }

  const strength = passwordStrength(password)

  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider wallets={wallets} autoConnect={false}>
        <div className="min-h-screen flex">
          {/* ── Left – Visual Panel ───────────────────────────────────── */}
          <div className="hidden lg:flex flex-1 bg-secondary/30 relative overflow-hidden items-center justify-center">
            <div className="absolute inset-0">
              <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 text-center px-12">
              <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="w-16 h-16 text-primary" />
              </div>
              <h2 className="font-serif text-3xl font-bold mb-4">
                Start Moving, Start Playing
              </h2>
              <p className="text-muted-foreground max-w-sm">
                Create your account and join a community of players who use their
                body as the controller. AI pose detection — no extra hardware needed.
              </p>

              {/* Feature bullets */}
              <ul className="mt-8 space-y-3 text-left max-w-xs mx-auto">
                {[
                  'AI-powered full-body motion tracking',
                  'Earn rewards on Solana',
                  'Play with friends in real-time',
                ].map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Right – Form Panel ────────────────────────────────────── */}
          <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12">
            <div className="w-full max-w-md mx-auto">
              {/* Back */}
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Link>

              {/* Logo */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-serif text-2xl font-bold">MotionPlay</span>
              </div>

              {success ? (
                /* ── Success State ──────────────────────────────────── */
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="font-serif text-2xl font-bold mb-2">Check your inbox</h2>
                  <p className="text-muted-foreground mb-6">
                    We sent a confirmation link to{' '}
                    <span className="text-foreground font-medium">{email}</span>.
                    Click it to activate your account.
                  </p>
                  <Link href="/auth/login">
                    <Button variant="outline" className="w-full h-12">
                      Back to Sign in
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  {/* ── Form Header ─────────────────────────────────── */}
                  <h1 className="font-serif text-3xl font-bold mb-2">Create account</h1>
                  <p className="text-muted-foreground mb-8">
                    Join MotionPlay and start playing with your body
                  </p>

                  {/* ── Email / Password Form ───────────────────────── */}
                  <form onSubmit={handleSignUp} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="your_username"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-12"
                        autoComplete="username"
                      />
                    </div>

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
                        autoComplete="email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Min. 8 characters"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12"
                        autoComplete="new-password"
                      />
                      {/* Strength bar */}
                      {strength && (
                        <div className="space-y-1">
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Password strength:{' '}
                            <span className="font-medium text-foreground">
                              {strength.label}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Repeat your password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`h-12 ${
                          confirmPassword && confirmPassword !== password
                            ? 'border-destructive focus-visible:ring-destructive'
                            : ''
                        }`}
                        autoComplete="new-password"
                      />
                      {confirmPassword && confirmPassword !== password && (
                        <p className="text-xs text-destructive">Passwords do not match</p>
                      )}
                    </div>

                    {error && (
                      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 text-base"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating account…
                        </>
                      ) : (
                        'Create account'
                      )}
                    </Button>
                  </form>

                  {/* OR separator */}
                  <div className="flex items-center my-5">
                    <div className="flex-1 h-px bg-gray-300" />
                    <span className="px-3 text-gray-500 text-sm">or</span>
                    <div className="flex-1 h-px bg-gray-300" />
                  </div>

                  {/* Solana Wallet Sign-Up */}
                  <WalletSignUp />

                  {/* Sign in link */}
                  <p className="text-center text-sm text-muted-foreground mt-8">
                    Already have an account?{' '}
                    <Link
                      href="/auth/login"
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </WalletProvider>
    </ConnectionProvider>
  )
}
