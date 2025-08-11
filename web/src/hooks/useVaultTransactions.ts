import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useTransactionStore } from "@/stores/transactionStore";
import { fetchVaultTransactions } from "@/lib/transaction-fetcher";

interface UseVaultTransactionsOptions {
  limit?: number;
}

// Minimal implementation
export function useVaultTransactions(options?: UseVaultTransactionsOptions) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const chainId = publicClient?.chain?.id;
  const prevChainIdRef = useRef<number | undefined>(undefined);
  const { transactions, addTransaction, isLoading, setLoading, clearHistory } =
    useTransactionStore();
  const [error, setError] = useState<Error | null>(null);
  const limit = options?.limit ?? 10;

  const fetchTransactions = useCallback(
    async (opts?: { reset?: boolean; limit?: number }) => {
      if (!address || !publicClient) return;

      setLoading(true);
      setError(null);

      try {
        const effectiveLimit = opts?.limit ?? limit;
        const vaultTransactions = await fetchVaultTransactions(
          publicClient,
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
    [address, publicClient, limit, setLoading, clearHistory, addTransaction]
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
