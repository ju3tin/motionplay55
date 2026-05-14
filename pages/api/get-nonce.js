import crypto from "crypto";

export default function handler(req, res) {
  const { publicKey } = req.query;
  if (!publicKey) return res.status(400).send("Missing publicKey");

  // Generate a random nonce
  const nonce = crypto.randomBytes(16).toString("hex");

  // TODO: Save nonce with publicKey in DB or memory for verification
  res.status(200).send(nonce);
}
