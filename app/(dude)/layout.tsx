"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
//  BackpackWalletAdapter,
} from "@solana/wallet-adapter-wallets";

export default function SolanaProvider({ children }: any) {
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  //  new BackpackWalletAdapter(),
  ];

  return (
    <ConnectionProvider endpoint="https://api.devnet.solana.com">
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
