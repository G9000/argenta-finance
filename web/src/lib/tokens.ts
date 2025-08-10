// Token logos - using local assets for brevity
export const TOKEN_LOGOS: Record<string, string> = {
  USDC: "/tokens/usdc-logo.svg",
  ETH: "/tokens/eth-logo.svg",
  SEI: "/tokens/sei-logo.svg",
};

// Chain logos for background display
export const CHAIN_LOGOS: Record<number, string> = {
  11155111: "/tokens/eth-logo.svg",
  1328: "/tokens/sei-logo.svg",
};

export function getTokenLogo(symbol: string, logoURI?: string): string {
  return logoURI || TOKEN_LOGOS[symbol.toUpperCase()] || "";
}

export function getChainLogo(chainId: number): string {
  return CHAIN_LOGOS[chainId] || "";
}
