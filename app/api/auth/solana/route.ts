import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  const { publicKey, message, signature } = await req.json();

  const msgBytes = new TextEncoder().encode(message);
  const sigBytes = new Uint8Array(signature);

  const pubKey = new PublicKey(publicKey);

  const verified = nacl.sign.detached.verify(
    msgBytes,
    sigBytes,
    pubKey.toBytes()
  );

  if (!verified) {
    return Response.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  // 🔑 Create Supabase-compatible JWT
  const token = jwt.sign(
    {
      sub: publicKey, // user id = wallet address
      role: "authenticated",
    },
    process.env.SUPABASE_JWT_SECRET!,
    {
      expiresIn: "1h",
    }
  );

  return Response.json({
    token,
    wallet: publicKey,
  });
}
