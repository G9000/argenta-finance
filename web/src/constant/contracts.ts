import type { Address } from "viem";
import { SupportedChainId } from "./chains";

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

export function getUsdcAddress(chainId: SupportedChainId): Address {
  return USDC_ADDRESSES[chainId];
}

export function getVaultAddress(chainId: SupportedChainId): Address {
  return VAULT_ADDRESSES[chainId];
}

export function getVaultDeploymentBlock(chainId: SupportedChainId): number {
  return VAULT_DEPLOYMENT_BLOCKS[chainId];
}
