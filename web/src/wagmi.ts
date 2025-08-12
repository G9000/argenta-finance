import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet, metaMaskWallet } from "@rainbow-me/rainbowkit/wallets";
import { http } from "viem";
import type { Config } from "wagmi";
import { SUPPORTED_CHAIN_CONFIGS, SupportedChainId } from "./constant/chains";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "ff8637d90895d98b162fd1e0d743e5be";
if (!walletConnectProjectId) {
  throw new Error(
    "Environment variable NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID must be defined"
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "Argenta",
  projectId: walletConnectProjectId,
  chains: SUPPORTED_CHAIN_CONFIGS,
  transports: {
    [SupportedChainId.ETH_SEPOLIA]: http(),
    [SupportedChainId.SEI_TESTNET]: http(),
  },
  wallets: [
    {
      groupName: "Recommended",
      // Some issue regarding indexedDB
      //https://github.com/rainbow-me/rainbowkit/issues/2476
      wallets: [
        injectedWallet,
        ...(typeof indexedDB !== "undefined" ? [metaMaskWallet] : []),
      ],
    },
  ],
  ssr: true,
}) as Config;
