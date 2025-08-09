import type { Address } from 'viem'

export enum SupportedChainId {
  ETH_SEPOLIA = 11155111,
  SEI_TESTNET = 1328,
}

export const CHAIN_TO_CHAIN_NAME: Record<SupportedChainId, string> = {
  [SupportedChainId.ETH_SEPOLIA]: "Ethereum Sepolia",
  [SupportedChainId.SEI_TESTNET]: "Sei Testnet",
}

export const USDC_ADDRESSES: Record<SupportedChainId, Address> = {
  [SupportedChainId.ETH_SEPOLIA]: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  [SupportedChainId.SEI_TESTNET]: "0x4fCF1784B31630811181f670Aea7A7bEF803eaED",
}

export const VAULT_ADDRESSES: Record<SupportedChainId, Address> = {
  [SupportedChainId.ETH_SEPOLIA]: "0xaaaac415c0719cff6BAe3816FE244589442db46C",
  [SupportedChainId.SEI_TESTNET]: "0xaaaac415c0719cff6BAe3816FE244589442db46C",
}

export const VAULT_DEPLOYMENT_BLOCKS: Record<SupportedChainId, number> = {
  [SupportedChainId.ETH_SEPOLIA]: 7011573,
  [SupportedChainId.SEI_TESTNET]: 137259626,
}

export const BLOCK_EXPLORERS: Record<SupportedChainId, string> = {
  [SupportedChainId.ETH_SEPOLIA]: "https://sepolia.etherscan.io",
  [SupportedChainId.SEI_TESTNET]: "https://seitrace.com/?chain=testnet",
}

export const USDC_DECIMALS = 6 as const

export function getUsdcAddress(chainId: SupportedChainId): Address {
  return USDC_ADDRESSES[chainId]
}

export function getVaultAddress(chainId: SupportedChainId): Address {
  return VAULT_ADDRESSES[chainId]
}

export function getChainName(chainId: SupportedChainId): string {
  return CHAIN_TO_CHAIN_NAME[chainId]
}

export function getBlockExplorerUrl(chainId: SupportedChainId): string {
  return BLOCK_EXPLORERS[chainId]
}

export function getVaultDeploymentBlock(chainId: SupportedChainId): number {
  return VAULT_DEPLOYMENT_BLOCKS[chainId]
}


