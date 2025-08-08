import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  trustWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { appChains } from "@/lib/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!walletConnectProjectId) {
  throw new Error(
    "Environment variable NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID must be defined"
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "Argenta",
  projectId: walletConnectProjectId,
  chains: appChains,
  wallets: [
    {
      groupName: "Recommended",
      // Some issue regarding indexedDB
      //https://github.com/rainbow-me/rainbowkit/issues/2476
      wallets: [
        injectedWallet,
        ...(typeof indexedDB !== "undefined"
          ? [trustWallet, metaMaskWallet, walletConnectWallet]
          : []),
      ],
    },
  ],
  ssr: true,
});