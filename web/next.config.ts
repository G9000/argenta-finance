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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    domains: [
      // Common ENS avatar services
      "euc.li",
      "cloudflare-ipfs.com",
      "ipfs.io",
      "gateway.pinata.cloud",
      "infura-ipfs.io",
      "dweb.link",
      "cf-ipfs.com",
      // NFT marketplaces that might be used for avatars
      "opensea.io",
      "lh3.googleusercontent.com",
      "storage.googleapis.com",
      // Arweave
      "arweave.net",
      "www.arweave.net",
    ],
  },
};

export default nextConfig;
