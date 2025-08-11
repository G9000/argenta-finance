import React from "react";
import { TransactionStatusIcon } from "./TransactionStatusIcon";
import {
  getChainName,
  getBlockExplorerUrl,
  SupportedChainId,
} from "@/constant/contracts";
import { SEPOLIA_CHAIN_ID, SEI_TESTNET_CHAIN_ID } from "@/constant/chains";
import { getTokenLogo, getChainLogo } from "@/lib/tokens";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export interface TransactionItemProps {
  id: string;
  hash: string;
  type: "deposit" | "withdrawal" | "approval";
  status: "pending" | "confirmed" | "failed" | "cancelled";
  amount?: string;
  tokenSymbol?: string;
  chainId: number;
  timestamp: number;
  blockNumber?: number;
  from?: string;
  to?: string;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

function getExplorerUrl(chainId: number, hash: string): string | undefined {
  if (chainId === SEPOLIA_CHAIN_ID || chainId === SEI_TESTNET_CHAIN_ID) {
    const baseUrl = getBlockExplorerUrl(chainId as SupportedChainId);
    return `${baseUrl}/tx/${hash}`;
  }
  return undefined;
}

export function TransactionItem({
  id,
  hash,
  type,
  status,
  amount,
  tokenSymbol,
  chainId,
  timestamp,
}: TransactionItemProps) {
  const explorerUrl = getExplorerUrl(chainId, hash);
  const chainName =
    chainId === SEPOLIA_CHAIN_ID || chainId === SEI_TESTNET_CHAIN_ID
      ? getChainName(chainId as SupportedChainId)
      : `Chain ${chainId}`;
  const tokenLogo = tokenSymbol ? getTokenLogo(tokenSymbol) : "";
  const chainLogo = getChainLogo(chainId);
  const formattedType =
    type === "approval"
      ? "Approve"
      : type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div
      key={id}
      className="flex flex-col md:flex-row md:items-center justify-between p-3 border border-white/10 hover:bg-white/5 transition-colors bg-white/[0.01] backdrop-blur-sm"
    >
      <div className="flex items-center space-x-3">
        <div className="flex -space-x-2 items-center">
          {chainLogo && (
            <Image
              src={chainLogo}
              alt={""}
              width={20}
              height={20}
              className="rounded-full ring-1 ring-white/10 bg-white/5"
            />
          )}
          {tokenLogo && (
            <Image
              src={tokenLogo}
              alt={""}
              width={20}
              height={20}
              className="rounded-full ring-1 ring-white/10 bg-white/5"
            />
          )}
        </div>
        <TransactionStatusIcon status={status} />

        <div className="space-y-0.5 uppercase font-mono">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-white">{formattedType}</span>
            <span className="text-gray-500 flex items-center gap-1">
              <span className="hidden sm:inline">on</span> {chainName}
            </span>
          </div>
          <div className="text-[10px] text-gray-400">
            {formatTimeAgo(timestamp)}
          </div>
        </div>
      </div>

      <div className="text-right space-y-0.5">
        {amount && tokenSymbol && (
          <div className="text-sm text-white font-medium tracking-tight">
            {amount} <span className="text-gray-300">{tokenSymbol}</span>
          </div>
        )}
        {explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-teal-400 hover:text-teal-300 transition-colors inline-flex items-center gap-1"
            aria-label="View on block explorer"
            title="View on block explorer"
          >
            <ArrowUpRight size={14} strokeWidth={1.75} />
          </a>
        ) : (
          <span className="text-xs text-gray-500 inline-flex items-center gap-1 cursor-not-allowed select-none">
            NO EXPLORER
          </span>
        )}
      </div>
    </div>
  );
}
