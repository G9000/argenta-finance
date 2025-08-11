"use client";

import React, { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useVaultTransactions } from "@/hooks/useVaultTransactions";
import { TransactionItem } from "./ui/TransactionItem";
import { TransactionListSkeleton } from "./ui/TransactionListSkeleton";
import { RefreshCw } from "lucide-react";
import { EmptyTransactionState } from "./ui/EmptyTransactionState";

export function TransactionHistory() {
  const { address } = useAccount();
  const { transactions, isLoading, fetchTransactions, hasTransactions } =
    useVaultTransactions();

  const prevAddressRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!address) return;
    if (prevAddressRef.current !== address) {
      fetchTransactions({ reset: true });
      prevAddressRef.current = address;
      return;
    }

    if (!hasTransactions) {
      fetchTransactions();
    }
  }, [address, hasTransactions, fetchTransactions]);

  if (isLoading && !hasTransactions) {
    return <TransactionListSkeleton />;
  }

  if (!hasTransactions) {
    return (
      <EmptyTransactionState
        onFetch={fetchTransactions}
        isLoading={isLoading}
      />
    );
  }

  return (
    <div className="space-y-3 font-mono">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-white">
          RECENT ACTIVITY [{transactions.length}]
        </div>
        <button
          onClick={() => fetchTransactions()}
          disabled={isLoading}
          className="inline-flex items-center justify-center h-7 w-7 rounded-md border border-teal-500/40 hover:border-teal-300/70 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-br from-teal-500/10 to-purple-700/10 hover:from-teal-400/20 hover:to-purple-600/20 transition-colors group"
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
            key={tx.id}
            id={tx.id}
            hash={tx.hash}
            type={tx.type}
            status={tx.status}
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
