import { useAccount, useChainId } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { fetchVaultTransactions } from "@/lib/transaction-fetcher";
import { SupportedChainId } from "@/constant/contracts";

interface UseVaultTransactionsOptions {
  limit?: number;
}

export function useVaultTransactions(options?: UseVaultTransactionsOptions) {
  const { address } = useAccount();
  const chainId = useChainId();
  const limit = options?.limit ?? 10;

  const {
    data: transactions,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["vaultTransactions", chainId, address, limit],
    queryFn: async () => {
      if (!address || !chainId) {
        return [];
      }
      return await fetchVaultTransactions(
        chainId as SupportedChainId,
        address,
        limit
      );
    },
    enabled: !!address && !!chainId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    transactions: transactions ?? [],
    isLoading,
    error,
    refetch,
    isRefetching,
    hasTransactions: (transactions?.length ?? 0) > 0,
  };
}
