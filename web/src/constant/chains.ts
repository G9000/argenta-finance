import { sepolia, seiTestnet, type Chain } from "viem/chains";

export const SupportedChainId = {
  ETH_SEPOLIA: sepolia.id,
  SEI_TESTNET: seiTestnet.id,
} as const;

export type SupportedChainId =
  (typeof SupportedChainId)[keyof typeof SupportedChainId];

const CHAIN_META = {
  [SupportedChainId.ETH_SEPOLIA]: sepolia,
  [SupportedChainId.SEI_TESTNET]: seiTestnet,
} as const satisfies Record<SupportedChainId, Chain>;

export const SUPPORTED_CHAINS = Object.values(
  SupportedChainId
) as SupportedChainId[];
export const SUPPORTED_CHAIN_CONFIGS = [sepolia, seiTestnet] as const;

export const SupportedChainIds = Object.fromEntries(
  Object.entries(CHAIN_META).map(([k, c]) => [k, c.id])
) as Record<SupportedChainId, number>;

export const SupportedChainNames = Object.fromEntries(
  Object.entries(CHAIN_META).map(([k, c]) => [k, c.name])
) as Record<SupportedChainId, string>;

const CHAIN_ICON_URL = {
  [SupportedChainId.ETH_SEPOLIA]: "/tokens/eth-logo.svg",
  [SupportedChainId.SEI_TESTNET]: "/tokens/sei-logo.svg",
} as const satisfies Record<SupportedChainId, string>;

export function getChainIconUrl(id: SupportedChainId): string {
  return CHAIN_ICON_URL[id];
}

export function getSupportedChainMeta(id: SupportedChainId): Chain {
  return CHAIN_META[id];
}

export function getBlockExplorerUrl(id: SupportedChainId): string | undefined {
  return CHAIN_META[id].blockExplorers?.default?.url;
}
export function addressUrl(
  id: SupportedChainId,
  addr: string
): string | undefined {
  const base = getBlockExplorerUrl(id);
  return base ? `${base}/address/${addr}` : undefined;
}
export function txUrl(id: SupportedChainId, hash: string): string | undefined {
  const base = getBlockExplorerUrl(id);
  return base ? `${base}/tx/${hash}` : undefined;
}

export function isSupportedChainId(
  chainId: number
): chainId is SupportedChainId {
  return Object.values(SupportedChainId).includes(chainId as SupportedChainId);
}

export function getChainName(chainId: SupportedChainId): string {
  return CHAIN_META[chainId].name;
}
