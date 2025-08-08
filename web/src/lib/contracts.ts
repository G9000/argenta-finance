import type { Address } from 'viem'
import { sepolia } from 'viem/chains'
import { seiTestnet, type SupportedChainId } from '@/lib/chains'

export const SIMPLE_VAULT_ADDRESS_BY_CHAIN_ID = {
  [sepolia.id]: '0xaaaac415c0719cff6BAe3816FE244589442db46C',
  [seiTestnet.id]: '0xaaaac415c0719cff6BAe3816FE244589442db46C',
} as const satisfies Record<SupportedChainId, Address>

export const SIMPLE_VAULT_DEPLOYMENT_BLOCK_BY_CHAIN_ID = {
  [sepolia.id]: 7011573,
  [seiTestnet.id]: 137259626,
} as const satisfies Record<SupportedChainId, number>

export const USDC_ADDRESS_BY_CHAIN_ID = {
  [sepolia.id]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  [seiTestnet.id]: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
} as const satisfies Record<SupportedChainId, Address>

export const USDC_DECIMALS = 6 as const

export const BLOCK_EXPLORER_BY_CHAIN_ID = {
  [sepolia.id]: 'https://sepolia.etherscan.io',
  [seiTestnet.id]: 'https://seitrace.com/?chain=testnet',
} as const satisfies Record<SupportedChainId, string>

export function getSimpleVaultAddress(chainId: SupportedChainId): Address {
  return SIMPLE_VAULT_ADDRESS_BY_CHAIN_ID[chainId]
}

export function getUsdcAddress(chainId: SupportedChainId): Address {
  return USDC_ADDRESS_BY_CHAIN_ID[chainId]
}

export function getBlockExplorerBaseUrl(chainId: SupportedChainId): string {
  return BLOCK_EXPLORER_BY_CHAIN_ID[chainId]
}


