import type { Address } from "viem";

export enum SupportedChainId {
  ETH_SEPOLIA = 11155111,
  SEI_TESTNET = 1328,
}

export const SUPPORTED_CHAINS = [
  SupportedChainId.ETH_SEPOLIA,
  SupportedChainId.SEI_TESTNET,
] as const;

export function isSupportedChainId(
  chainId: number
): chainId is SupportedChainId {
  return SUPPORTED_CHAINS.includes(chainId as SupportedChainId);
}

export const CHAIN_TO_CHAIN_NAME = {
  [SupportedChainId.ETH_SEPOLIA]: "Ethereum Sepolia",
  [SupportedChainId.SEI_TESTNET]: "Sei Testnet",
} as const satisfies Record<SupportedChainId, string>;

export const USDC_ADDRESSES = {
  [SupportedChainId.ETH_SEPOLIA]: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  [SupportedChainId.SEI_TESTNET]: "0x4fCF1784B31630811181f670Aea7A7bEF803eaED",
} as const satisfies Record<SupportedChainId, Address>;

export const VAULT_ADDRESSES = {
  [SupportedChainId.ETH_SEPOLIA]: "0xaaaac415c0719cff6BAe3816FE244589442db46C",
  [SupportedChainId.SEI_TESTNET]: "0xaaaac415c0719cff6BAe3816FE244589442db46C",
} as const satisfies Record<SupportedChainId, Address>;

export const VAULT_DEPLOYMENT_BLOCKS = {
  [SupportedChainId.ETH_SEPOLIA]: 7011573,
  [SupportedChainId.SEI_TESTNET]: 137259626,
} as const satisfies Record<SupportedChainId, number>;

export const BLOCK_EXPLORERS = {
  [SupportedChainId.ETH_SEPOLIA]: "https://sepolia.etherscan.io",
  [SupportedChainId.SEI_TESTNET]: "https://seitrace.com/?chain=testnet",
} as const satisfies Record<SupportedChainId, string>;

export const USDC_DECIMALS = 6 as const;
export const ETH_DECIMALS = 18 as const;

export function getUsdcAddress(chainId: SupportedChainId): Address {
  return USDC_ADDRESSES[chainId];
}

export function getVaultAddress(chainId: SupportedChainId): Address {
  return VAULT_ADDRESSES[chainId];
}

export function getChainName(chainId: SupportedChainId): string {
  return CHAIN_TO_CHAIN_NAME[chainId];
}

export function getBlockExplorerUrl(chainId: SupportedChainId): string {
  return BLOCK_EXPLORERS[chainId];
}

export function getVaultDeploymentBlock(chainId: SupportedChainId): number {
  return VAULT_DEPLOYMENT_BLOCKS[chainId];
}
