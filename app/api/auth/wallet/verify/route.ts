// app/api/auth/wallet/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { buildSignMessage } from "@/lib/auth/walletUtils";

// Admin client bypasses RLS — only use server-side
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, signature } = await req.json();

    if (!walletAddress || !signature) {
      return NextResponse.json(
        { error: "walletAddress and signature are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminClient = getAdminClient();

    // 1. Fetch and validate nonce
    const { data: nonceRow, error: nonceError } = await supabase
      .from("wallet_nonces")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single();

    if (nonceError || !nonceRow) {
      return NextResponse.json({ error: "Nonce not found" }, { status: 400 });
    }

    if (new Date(nonceRow.expires_at) < new Date()) {
      return NextResponse.json({ error: "Nonce expired" }, { status: 400 });
    }

    // 2. Verify signature using nacl
    const message = buildSignMessage(walletAddress, nonceRow.nonce);
    const messageBytes = new TextEncoder().encode(message);
    const publicKeyBytes = new PublicKey(walletAddress).toBytes();
    const signatureBytes = bs58.decode(signature);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 3. Delete used nonce (single-use)
    await supabase
      .from("wallet_nonces")
      .delete()
      .eq("wallet_address", walletAddress);

    // 4. Find or create user for this wallet
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("solana_wallet", walletAddress)
      .single();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // Create a new Supabase user for this wallet
      const email = `wallet_${walletAddress.toLowerCase()}@wallet.local`;
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password: crypto.randomUUID(), // random password — wallet-only login
          email_confirm: true,
          user_metadata: { solana_wallet: walletAddress },
        });

      if (createError || !newUser.user) {
        console.error("Create user error:", createError);
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 }
        );
      }

      userId = newUser.user.id;

      // Link wallet to profile
      await adminClient
        .from("profiles")
        .update({ solana_wallet: walletAddress })
        .eq("id", userId);
    }

    // 5. Create a magic link session for the user
    const { data: sessionData, error: sessionError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: `wallet_${walletAddress.toLowerCase()}@wallet.local`,
      });

    if (sessionError || !sessionData) {
      console.error("Session error:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      redirectUrl: sessionData.properties?.action_link,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
