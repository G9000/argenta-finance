import { SupportedChainId } from "./contracts";

export const SEPOLIA_CHAIN_ID = SupportedChainId.ETH_SEPOLIA;
export const SEI_TESTNET_CHAIN_ID = SupportedChainId.SEI_TESTNET;

export const EXPLORER_ENABLED_CHAIN_IDS = [
  SEPOLIA_CHAIN_ID,
  SEI_TESTNET_CHAIN_ID,
] as const;

export type ExplorerEnabledChainId =
  (typeof EXPLORER_ENABLED_CHAIN_IDS)[number];
