"use client";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet, WalletProvider } from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
} from "@solana/wallet-adapter-wallets";

import { clusterApiUrl, Connection } from "@solana/web3.js";

export default function WalletConnect() {
  const [status, setStatus] = useState("Not connected");
  const wallet = useWallet();

  const connectWallet = async () => {
    if (!wallet.connected) {
      await wallet.connect();
    }

    const publicKey = wallet.publicKey.toString();
    setStatus(`Connected: ${publicKey}`);

    // Step 1: Get nonce from API
    const nonceRes = await fetch(`/api/get-nonce?publicKey=${publicKey}`);
    const nonce = await nonceRes.text();

    // Step 2: Sign nonce
    const encodedMessage = new TextEncoder().encode(nonce);
    const signedMessage = await wallet.signMessage(encodedMessage);

    // Step 3: Verify signature
    const verifyRes = await fetch("/api/verify-signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey,
        signedMessage: Array.from(signedMessage),
        nonce,
      }),
    });

    const verifyData = await verifyRes.json();
    setStatus(verifyData.message);
  };

  return (
    <WalletProvider wallets={[new PhantomWalletAdapter()]}>
      <div>
        <button onClick={connectWallet}>Connect Phantom Wallet</button>
        <p>{status}</p>
      </div>
    </WalletProvider>
  );
}
