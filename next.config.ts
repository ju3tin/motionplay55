import type { NextConfig } from 'next';
 
const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@solana/web3.js', '@coral-xyz/anchor');
    }
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};
 
export default nextConfig;
 