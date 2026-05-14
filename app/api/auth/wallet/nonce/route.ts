// app/api/auth/wallet/nonce/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSignMessage } from "@/lib/auth/walletUtils";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const nonce = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const { error } = await supabase
      .from("wallet_nonces")
      .upsert(
        { wallet_address: walletAddress, nonce, expires_at: expiresAt },
        { onConflict: "wallet_address" }
      );

    if (error) {
      console.error("Nonce upsert error:", error);
      return NextResponse.json({ error: "Failed to generate nonce" }, { status: 500 });
    }

    return NextResponse.json({ nonce, message: buildSignMessage(walletAddress, nonce) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
