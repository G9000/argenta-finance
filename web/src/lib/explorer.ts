import { SupportedChainId } from "@/constant/chains";
import type { Hash } from "viem";

/**
 * Get the block explorer URL for a given chain
 */
export function getExplorerUrl(chainId: SupportedChainId): string {
  switch (chainId) {
    case SupportedChainId.ETH_SEPOLIA:
      return "https://sepolia.etherscan.io";
    case SupportedChainId.SEI_TESTNET:
      return "https://seitrace.com"; // Sei testnet explorer
    default:
      return "https://etherscan.io";
  }
}

/**
 * Get the full transaction URL for a given chain and transaction hash
 */
export function getTransactionUrl(
  chainId: SupportedChainId,
  txHash: Hash
): string {
  const baseUrl = getExplorerUrl(chainId);
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get a shortened version of a transaction hash for display
 */
export function shortenTxHash(txHash: Hash): string {
  return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
}
