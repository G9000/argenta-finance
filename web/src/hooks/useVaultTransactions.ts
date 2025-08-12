import { useAccount, useChainId, useBlockNumber, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { SupportedChainId } from "@/constant/chains";
import {
  getUsdcAddress,
  getVaultAddress,
  getVaultDeploymentBlock,
} from "@/constant/contracts";
import { formatUnits, parseAbiItem } from "viem";

interface UseVaultTransactionsOptions {
  limit?: number;
}

export interface VaultTransaction {
  hash: string;
  type: "deposit" | "withdrawal" | "approval";
  amount: string;
  tokenSymbol: string;
  chainId: number;
  timestamp: number;
  blockNumber: number;
  from: string;
  to: string;
}

export function useVaultTransactions(options?: UseVaultTransactionsOptions) {
  const { address } = useAccount();
  const chainId = useChainId();
  const limit = options?.limit ?? 10;

  const { data: currentBlock } = useBlockNumber({
    chainId: chainId as SupportedChainId,
  });

  const publicClient = usePublicClient({
    chainId: chainId as SupportedChainId,
  });

  const {
    data: transactions,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["vaultTransactions", chainId, address, limit],
    queryFn: async () => {
      if (!address || !chainId || !currentBlock || !publicClient) {
        return [];
      }

      const usdcAddress = getUsdcAddress(chainId as SupportedChainId);
      const vaultAddress = getVaultAddress(chainId as SupportedChainId);
      const deploymentBlock = getVaultDeploymentBlock(
        chainId as SupportedChainId
      );

      let allLogs: any[] = [];

      if (chainId === SupportedChainId.SEI_TESTNET) {
        const CHUNK_SIZE = 1800;
        const MAX_ITERATIONS = 10;
        let searchBlock = currentBlock;

        for (let i = 0; i < MAX_ITERATIONS && allLogs.length < limit; i++) {
          const fromBlock = searchBlock - BigInt(CHUNK_SIZE);
          const toBlock = searchBlock;

          if (Number(fromBlock) < deploymentBlock) break;

          try {
            const [depositLogs, withdrawalLogs, approvalLogs] =
              await Promise.all([
                publicClient
                  .getLogs({
                    address: usdcAddress,
                    event: parseAbiItem(
                      "event Transfer(address indexed from, address indexed to, uint256 value)"
                    ),
                    args: { from: address, to: vaultAddress },
                    fromBlock,
                    toBlock,
                  })
                  .catch(() => []),
                publicClient
                  .getLogs({
                    address: usdcAddress,
                    event: parseAbiItem(
                      "event Transfer(address indexed from, address indexed to, uint256 value)"
                    ),
                    args: { from: vaultAddress, to: address },
                    fromBlock,
                    toBlock,
                  })
                  .catch(() => []),
                publicClient
                  .getLogs({
                    address: usdcAddress,
                    event: parseAbiItem(
                      "event Approval(address indexed owner, address indexed spender, uint256 value)"
                    ),
                    args: { owner: address, spender: vaultAddress },
                    fromBlock,
                    toBlock,
                  })
                  .catch(() => []),
              ]);

            allLogs.push(
              ...depositLogs.map((log) => ({
                ...log,
                type: "deposit" as const,
              })),
              ...withdrawalLogs.map((log) => ({
                ...log,
                type: "withdrawal" as const,
              })),
              ...approvalLogs.map((log) => ({
                ...log,
                type: "approval" as const,
              }))
            );
          } catch (error) {
            console.warn(
              `Sei chunk search failed for blocks ${fromBlock}-${toBlock}:`,
              error
            );
          }

          searchBlock = fromBlock - 1n; // Move to next chunk
        }
      } else {
        const fromBlock = BigInt(
          Math.max(Number(currentBlock) - 1999, deploymentBlock)
        );

        const [depositLogs, withdrawalLogs, approvalLogs] = await Promise.all([
          publicClient.getLogs({
            address: usdcAddress,
            event: parseAbiItem(
              "event Transfer(address indexed from, address indexed to, uint256 value)"
            ),
            args: { from: address, to: vaultAddress },
            fromBlock,
            toBlock: "latest",
          }),
          publicClient.getLogs({
            address: usdcAddress,
            event: parseAbiItem(
              "event Transfer(address indexed from, address indexed to, uint256 value)"
            ),
            args: { from: vaultAddress, to: address },
            fromBlock,
            toBlock: "latest",
          }),
          publicClient.getLogs({
            address: usdcAddress,
            event: parseAbiItem(
              "event Approval(address indexed owner, address indexed spender, uint256 value)"
            ),
            args: { owner: address, spender: vaultAddress },
            fromBlock,
            toBlock: "latest",
          }),
        ]);

        // Combine all logs with their types
        allLogs = [
          ...depositLogs.map((log) => ({ ...log, type: "deposit" as const })),
          ...withdrawalLogs.map((log) => ({
            ...log,
            type: "withdrawal" as const,
          })),
          ...approvalLogs.map((log) => ({ ...log, type: "approval" as const })),
        ];
      }

      const sortedLogs = allLogs
        .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
        .slice(0, limit);

      const uniqueBlockNumbers = [
        ...new Set(sortedLogs.map((log) => log.blockNumber)),
      ];

      const blockPromises = uniqueBlockNumbers.map((blockNumber) =>
        publicClient.getBlock({ blockNumber }).catch(() => null)
      );
      const blocks = await Promise.all(blockPromises);

      const blockTimestampMap = new Map<bigint, number>();
      blocks.forEach((block, index) => {
        if (block) {
          blockTimestampMap.set(
            uniqueBlockNumbers[index],
            Number(block.timestamp) * 1000
          );
        }
      });

      // Transform logs into transactions
      const transactions: VaultTransaction[] = sortedLogs.map((log) => {
        const timestamp = blockTimestampMap.get(log.blockNumber) || Date.now();

        let from: string;
        let to: string;

        if (log.type === "approval") {
          const args = log.args as {
            owner?: string;
            spender?: string;
            value?: bigint;
          };
          from = args.owner as string;
          to = args.spender as string;
        } else {
          const args = log.args as {
            from?: string;
            to?: string;
            value?: bigint;
          };
          from = args.from as string;
          to = args.to as string;
        }

        return {
          hash: log.transactionHash,
          type: log.type,
          amount: formatUnits(log.args.value as bigint, 6),
          tokenSymbol: "USDC",
          chainId: chainId!,
          timestamp,
          blockNumber: Number(log.blockNumber),
          from,
          to,
        };
      });

      return transactions;
    },
    enabled: !!address && !!chainId && !!currentBlock && !!publicClient,
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
