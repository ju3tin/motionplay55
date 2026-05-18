'use client'

import React, { useState, useMemo, useEffect } from "react"
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, ArrowLeft, Loader2 } from 'lucide-react'
import SignInWithSolanaButton from "@/components/auth/SignInWithSolanaButton"
import OAuthButton from "@/components/auth/OAuthButton"
import { Robot } from '@/components/robot'

import {
  ConnectionProvider,
  WalletProvider,
  useWallet
} from "@solana/wallet-adapter-react"

import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"

function WalletLogin() {
  const wallet = useWallet()
  const router = useRouter()
  const [status, setStatus] = useState('Not connected')

  const handleWalletLogin = async () => {
    if (!wallet.connected) {
      await wallet.connect()
    }

    if (!wallet.publicKey) {
      setStatus('Failed to connect wallet')
      return
    }

    if (!wallet.signMessage) {
      setStatus('Wallet does not support message signing')
      return
    }

    setStatus('Connected: ' + wallet.publicKey.toString())

    try {
      const nonceRes = await fetch(
        `/api/get-nonce?publicKey=${wallet.publicKey.toString()}`
      )

      const nonce = await nonceRes.text()

      const encodedMessage = new TextEncoder().encode(nonce)

      const signedMessage = await wallet.signMessage(encodedMessage)

      const verifyRes = await fetch("/api/verify-signature", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicKey: wallet.publicKey.toString(),
          signedMessage: Array.from(signedMessage),
          nonce,
        }),
      })

      const verifyData = await verifyRes.json()

      if (verifyData.success) {
        setStatus('Authentication successful!')
        router.push('/games')
      } else {
        setStatus('Authentication failed')
      }
    } catch (err) {
      setStatus('Error during wallet login')
      console.error(err)
    }
  }

  return (
    <>
      <Button
        className="w-full h-12 text-base mb-2"
        onClick={handleWalletLogin}
      >
        Connect Phantom Wallet
      </Button>

      <p className="text-sm text-muted-foreground">
        {status}
      </p>
    </>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [scrollT, setScrollT] = useState(0)

  const router = useRouter()
  const supabase = createClient()

  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  )

  useEffect(() => {
    const handleScroll = () => {
      setScrollT(Math.min(1, window.scrollY / 800))
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/games')
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : 'An error occurred'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <div className="min-h-screen flex">

          {/* Left side */}
          <div className="flex-1 flex flex-col justify-center px-8 lg:px-16">
            <div className="w-full max-w-md mx-auto">

              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Link>

              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-foreground" />
                </div>

                <span className="font-serif text-2xl font-bold">
                  MotionPlay
                </span>
              </div>

              <h1 className="font-serif text-3xl font-bold mb-2">
                Welcome back
              </h1>

              <p className="text-muted-foreground mb-8">
                Sign in to continue playing motion games
              </p>

              <form onSubmit={handleLogin} className="space-y-6">

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
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">
                      Password
                    </Label>
                  </div>

                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12"
                  />
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
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>

              <div className="flex items-center my-4">
                <div className="flex-1 h-px bg-gray-300" />

                <span className="px-3 text-gray-500">
                  or
                </span>

                <div className="flex-1 h-px bg-gray-300" />
              </div>

              {/* Wallet login */}
              {/* <WalletLogin /> */}

              <SignInWithSolanaButton
                redirectTo="/profile"
                className="rounded-lg bg-purple-600 px-4 py-2 text-white"
              >
                Connect Wallet
              </SignInWithSolanaButton>

              <OAuthButton
                provider="github"
                className="rounded-lg bg-purple-600 px-4 py-2 text-white"
              >
                Continue with GitHub
              </OAuthButton>

              <OAuthButton
                provider="google"
                className="rounded-lg bg-purple-600 px-4 py-2 text-white"
              >
                Continue with Google
              </OAuthButton>

              <p className="text-center text-sm text-muted-foreground mt-8">
                {"Don't have an account? "}

                <Link
                  href="/auth/sign-up"
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="hidden lg:flex flex-1 bg-secondary/30 relative overflow-hidden items-center justify-center">

            <div className="absolute inset-0">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />

              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 text-center px-12">

              <Robot scrollT={scrollT} />

              <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="w-16 h-16 text-primary" />
              </div>

              <h2 className="font-serif text-3xl font-bold mb-4">
                Move to Play
              </h2>

              <p className="text-muted-foreground max-w-sm">
                Use your body as the controller.
                Our AI-powered pose detection turns
                your movements into game actions.
              </p>
            </div>
          </div>
        </div>
      </WalletProvider>
    </ConnectionProvider>
  )
}
