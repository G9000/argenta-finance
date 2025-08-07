import { defineChain } from "viem";
import { sepolia } from "viem/chains";

export const seiTestnet = defineChain({
  id: 1328,
  name: "Sei Testnet",
  network: "sei-testnet",
  nativeCurrency: { name: "Sei", symbol: "SEI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evm-rpc-testnet.sei-apis.com"] },
    public: { http: ["https://evm-rpc-testnet.sei-apis.com"] },
  },
  blockExplorers: {
    default: { name: "SeiTrace", url: "https://seitrace.com/?chain=testnet" },
  },
});

export const appChains = [sepolia, seiTestnet] as const;

export type SupportedChainId = typeof appChains[number]["id"];


