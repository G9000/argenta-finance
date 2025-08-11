import { sepolia, seiTestnet } from "viem/chains";

export const appChains = [
  {
    ...sepolia,
    rpcUrls: {
      default: {
        http: [
          process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
            "https://ethereum-sepolia-rpc.publicnode.com",
        ],
      },
    },
  },
  {
    ...seiTestnet,
    rpcUrls: {
      default: {
        http: [
          process.env.NEXT_PUBLIC_SEI_TESTNET_RPC_URL ||
            "https://evm-rpc-testnet.sei-apis.com",
        ],
      },
    },
  },
] as const;
