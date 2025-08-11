import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
    NEXT_PUBLIC_SEI_TESTNET_RPC_URL:
      process.env.NEXT_PUBLIC_SEI_TESTNET_RPC_URL,
  },
};

export default nextConfig;
