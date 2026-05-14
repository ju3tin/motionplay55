import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

export default async function handler(req, res) {
  const { publicKey, signedMessage, nonce } = req.body;

  if (!publicKey || !signedMessage || !nonce) {
    return res.status(400).json({ message: "Missing parameters" });
  }

  const signatureUint8 = Uint8Array.from(signedMessage);
  const messageUint8 = new TextEncoder().encode(nonce);

  const isValid = nacl.sign.detached.verify(
    messageUint8,
    signatureUint8,
    new PublicKey(publicKey).toBytes()
  );

  if (!isValid) {
    return res.status(401).json({ message: "Signature invalid" });
  }

  // TODO: Create Supabase session using service role key if needed
  res.status(200).json({ message: "Authentication successful!" });
}
