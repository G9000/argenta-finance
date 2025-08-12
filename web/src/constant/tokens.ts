import { getAddress } from "viem";
import { SupportedChainId } from "./chains";

export type TokenSymbol = "USDC";

export interface TokenInfo {
  readonly address: `0x${string}`;
  readonly symbol: TokenSymbol;
  readonly name: string;
  readonly decimals: number;
  readonly logoURI: string;
  readonly chainId: SupportedChainId;
}

export const TOKENS_BY_CHAIN = {
  [SupportedChainId.ETH_SEPOLIA]: {
    USDC: {
      address: getAddress("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"),
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logoURI: "/tokens/usdc-logo.svg",
      chainId: SupportedChainId.ETH_SEPOLIA,
    },
  },
  [SupportedChainId.SEI_TESTNET]: {
    USDC: {
      address: getAddress("0x4fCF1784B31630811181f670Aea7A7bEF803eaED"),
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      logoURI: "/tokens/usdc-logo.svg",
      chainId: SupportedChainId.SEI_TESTNET,
    },
  },
} as const satisfies Record<SupportedChainId, Record<TokenSymbol, TokenInfo>>;

export function getToken(
  chainId: SupportedChainId,
  symbol: TokenSymbol
): TokenInfo | undefined {
  return TOKENS_BY_CHAIN[chainId]?.[symbol];
}
export function getUsdc(chainId: SupportedChainId): TokenInfo {
  return TOKENS_BY_CHAIN[chainId].USDC;
}
