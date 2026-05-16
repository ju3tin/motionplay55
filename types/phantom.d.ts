export {};

declare global {
  interface Window {
    phantom?: {
      solana?: {
        isPhantom: boolean;
        connect: () => Promise<void>;
        disconnect: () => Promise<void>;
        publicKey: {
          toString: () => string;
        };
        signMessage: (
          message: Uint8Array,
          encoding: string
        ) => Promise<{ signature: Uint8Array }>;
      };
    };
  }
}
