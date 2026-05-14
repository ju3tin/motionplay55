// lib/auth/walletUtils.ts

export function buildSignMessage(wallet: string, nonce: string): string {
  return `Sign this message to authenticate with your Solana wallet.\n\nWallet: ${wallet}\nNonce: ${nonce}\n\nThis request will not trigger a blockchain transaction or cost any fees.`;
}
