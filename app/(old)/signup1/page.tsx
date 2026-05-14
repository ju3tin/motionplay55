'use client'

import React, { useState, useMemo } from "react"
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, ArrowLeft, Loader2 } from 'lucide-react'

import {
  ConnectionProvider,
  WalletProvider,
  useWallet
} from "@solana/wallet-adapter-react"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"
import bs58 from 'bs58'
import nacl from 'tweetnacl'

function WalletSignup() {
  const wallet = useWallet()
  const router = useRouter()
  const [status, setStatus] = useState('Not connected')

  const handleWalletSignup = async () => {
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
      const walletAddress = wallet.publicKey.toString()

      // 1. Request a nonce from backend
      const nonceRes = await fetch(`/api/nonce?wallet=${walletAddress}`)
      const nonce = await nonceRes.text()

      // 2. Sign the nonce with wallet
      const encodedMessage = new TextEncoder().encode(nonce)
      const signedMessage = await wallet.signMessage(encodedMessage)
      const signature = bs58.encode(signedMessage)

      // 3. Send signed message to backend to create user
      const signupRes = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddress, signature }),
      })
      const signupData = await signupRes.json()

      if (signupData.success) {
        setStatus('✅ Wallet signup successful!')
        router.push('/games')
      } else {
        setStatus('❌ Signup failed')
      }

    } catch (err) {
      console.error(err)
      setStatus('❌ Error during wallet signup')
    }
  }

  return (
    <>
      <Button
        className="w-full h-12 text-base mb-2"
        onClick={handleWalletSignup}
      >
        Connect Phantom Wallet
      </Button>
      <p className="text-sm text-muted-foreground">{status}</p>
    </>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <div className="min-h-screen flex">
          {/* Left side - Form */}
          <div className="flex-1 flex flex-col justify-center px-8 lg:px-16">
            <div className="w-full max-w-md mx-auto">
              {/* Back link */}
              <Link 
                href="/auth/login" 
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>

              {/* Logo */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-serif text-2xl font-bold">MotionPlay</span>
              </div>

              {/* Form Header */}
              <h1 className="font-serif text-3xl font-bold mb-2">Sign up</h1>
              <p className="text-muted-foreground mb-8">
                Connect your wallet to create a new MotionPlay account
              </p>

              {/* SOLANA WALLET SIGNUP */}
              <WalletSignup />

              {/* Login link */}
              <p className="text-center text-sm text-muted-foreground mt-8">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-primary hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </div>
          </div>

          {/* Right side - Visual */}
          <div className="hidden lg:flex flex-1 bg-secondary/30 relative overflow-hidden items-center justify-center">
            <div className="absolute inset-0">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
            </div>
            
            <div className="relative z-10 text-center px-12">
              <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="w-16 h-16 text-primary" />
              </div>
              <h2 className="font-serif text-3xl font-bold mb-4">Move to Play</h2>
              <p className="text-muted-foreground max-w-sm">
                Use your body as the controller. Our AI-powered pose detection turns 
                your movements into game actions.
              </p>
            </div>
          </div>
        </div>
      </WalletProvider>
    </ConnectionProvider>
  )
}
