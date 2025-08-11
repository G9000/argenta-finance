import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  trustWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { sepolia, seiTestnet } from "viem/chains";
import { http } from "viem";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!walletConnectProjectId) {
  throw new Error(
    "Environment variable NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID must be defined"
  );
}

const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";
const SEI_TESTNET_RPC_URL =
  process.env.NEXT_PUBLIC_SEI_TESTNET_RPC_URL ||
  "https://evm-rpc-testnet.sei-apis.com";

const appChains = [
  {
    ...sepolia,
    rpcUrls: {
      default: {
        http: [SEPOLIA_RPC_URL],
      },
    },
  },
  {
    ...seiTestnet,
    rpcUrls: {
      default: {
        http: [SEI_TESTNET_RPC_URL],
      },
    },
  },
] as const;

export const wagmiConfig = getDefaultConfig({
  appName: "Argenta",
  projectId: walletConnectProjectId,
  chains: appChains,
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC_URL),
    [seiTestnet.id]: http(SEI_TESTNET_RPC_URL),
  },
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
