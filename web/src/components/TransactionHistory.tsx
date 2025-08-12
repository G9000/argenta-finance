"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useVaultTransactions } from "@/hooks/useVaultTransactions";
import { TransactionItem } from "./ui/TransactionItem";
import { TransactionListSkeleton } from "./ui/TransactionListSkeleton";
import { RefreshCw } from "lucide-react";
import { EmptyTransactionState } from "./ui/EmptyTransactionState";

export function TransactionHistory() {
  const { transactions, isLoading, refetch, hasTransactions } =
    useVaultTransactions();

  if (isLoading && !hasTransactions) {
    return <TransactionListSkeleton />;
  }

  if (!hasTransactions) {
    return <EmptyTransactionState onFetch={refetch} isLoading={isLoading} />;
  }

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-white">
          RECENT ACTIVITY [{transactions.length}]
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex items-center justify-center size-7 border border-teal-500/40 hover:border-teal-300/70 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-br from-teal-500/10 to-purple-700/10 hover:from-teal-400/20 hover:to-purple-600/20 transition-colors group"
          aria-label="Refresh"
          title="Refresh"
        >
          <RefreshCw
            size={16}
            className={`text-teal-300 ${
              isLoading
                ? "animate-spin"
                : "group-hover:rotate-45 transition-transform"
            }`}
          />
        </button>
      </div>

      <div className="space-y-2">
        {transactions.map((tx) => (
          <TransactionItem
            key={tx.hash}
            id={tx.hash}
            hash={tx.hash}
            type={tx.type}
            status="confirmed"
            amount={tx.amount}
            tokenSymbol={tx.tokenSymbol}
            chainId={tx.chainId}
            timestamp={tx.timestamp}
            blockNumber={tx.blockNumber}
            from={tx.from}
            to={tx.to}
          />
        ))}
      </div>
    </div>
  );
}
