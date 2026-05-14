import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PublicKey } from '@solana/web3.js'
import nacl from 'tweetnacl'

// Use the service-role key so we can create auth users server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { publicKey, signedMessage, nonce } = await req.json()

    // ── 1. Validate inputs ───────────────────────────────────────────────────
    if (!publicKey || !signedMessage || !nonce) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // ── 2. Verify the signature ──────────────────────────────────────────────
    let pubKey: PublicKey
    try {
      pubKey = new PublicKey(publicKey)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid public key' },
        { status: 400 }
      )
    }

    const messageBytes = new TextEncoder().encode(nonce)
    const signatureBytes = new Uint8Array(signedMessage)
    const pubKeyBytes = pubKey.toBytes()

    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, pubKeyBytes)
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // ── 3. Derive a deterministic email from the public key ──────────────────
    const walletEmail = `${publicKey}@wallet.local`
    // Use the public key as the password (it's public knowledge — auth is via
    // signature verification above, not this password)
    const walletPassword = `wallet_${publicKey}`

    // ── 4. Check if the wallet is already registered ─────────────────────────
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u) => u.email === walletEmail)

    if (existingUser) {
      // ── Already registered → sign them in ─────────────────────────────────
      const { data: signInData, error: signInError } =
        await supabaseAdmin.auth.signInWithPassword({
          email: walletEmail,
          password: walletPassword,
        })

      if (signInError) {
        console.error('Sign-in error:', signInError)
        return NextResponse.json(
          { success: false, error: 'Failed to sign in existing wallet' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'signed_in',
        session: signInData.session,
        user: signInData.user,
      })
    }

    // ── 5. New wallet → create a Supabase auth user ──────────────────────────
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: walletEmail,
        password: walletPassword,
        email_confirm: true, // skip email confirmation for wallet users
        user_metadata: {
          wallet_address: publicKey,
          auth_method: 'solana_wallet',
        },
      })

    if (createError) {
      console.error('Create user error:', createError)
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // ── 6. Sign the new user in immediately ───────────────────────────────────
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: walletEmail,
        password: walletPassword,
      })

    if (signInError) {
      console.error('Post-create sign-in error:', signInError)
      return NextResponse.json(
        { success: false, error: 'User created but failed to sign in' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      action: 'registered',
      session: signInData.session,
      user: signInData.user,
    })
  } catch (err) {
    console.error('register-wallet error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
