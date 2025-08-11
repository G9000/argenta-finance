import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { useTransactionStore } from "@/stores/transactionStore";
import { fetchVaultTransactions } from "@/lib/transaction-fetcher";
import { SupportedChainId } from "@/constant/contracts";

interface UseVaultTransactionsOptions {
  limit?: number;
}

// Minimal implementation
export function useVaultTransactions(options?: UseVaultTransactionsOptions) {
  const { address } = useAccount();
  const chainId = useChainId();
  const prevChainIdRef = useRef<number | undefined>(undefined);
  const { transactions, addTransaction, isLoading, setLoading, clearHistory } =
    useTransactionStore();
  const [error, setError] = useState<Error | null>(null);
  const limit = options?.limit ?? 10;

  const fetchTransactions = useCallback(
    async (opts?: { reset?: boolean; limit?: number }) => {
      if (!address || !chainId) return;

      setLoading(true);
      setError(null);

      try {
        const effectiveLimit = opts?.limit ?? limit;
        const vaultTransactions = await fetchVaultTransactions(
          chainId as SupportedChainId,
          address,
          effectiveLimit
        );
        if (opts?.reset) {
          clearHistory();
        }

        // To keep newest on top, iterate from oldest -> newest.
        for (const transaction of [...vaultTransactions].reverse()) {
          addTransaction({
            hash: transaction.hash,
            type: transaction.type,
            status: "confirmed",
            amount: transaction.amount,
            tokenSymbol: transaction.tokenSymbol,
            chainId: transaction.chainId,
            timestamp: transaction.timestamp,
            blockNumber: transaction.blockNumber,
            from: transaction.from,
            to: transaction.to,
          });
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [address, chainId, limit, setLoading, clearHistory, addTransaction]
  );

  useEffect(() => {
    if (!chainId) return;
    const prev = prevChainIdRef.current;
    if (prev !== undefined && prev !== chainId) {
      fetchTransactions({ reset: true });
    }
    prevChainIdRef.current = chainId;
  }, [chainId, clearHistory, fetchTransactions]);

  return {
    transactions,
    isLoading,
    fetchTransactions,
    hasTransactions: transactions.length > 0,
    error,
  };
}
