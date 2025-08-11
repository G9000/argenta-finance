import { PublicClient, formatUnits } from "viem";
import {
  getUsdcAddress,
  getVaultAddress,
  getVaultDeploymentBlock,
  SupportedChainId,
} from "@/constant/contracts";

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

async function safeGetLogs(
  publicClient: PublicClient,
  params: Parameters<typeof publicClient.getLogs>[0]
) {
  try {
    return await publicClient.getLogs(params as any);
  } catch (e: any) {
    const msg = e?.message || "";
    if (/block range too large/i.test(msg)) {
      const originalFrom = (params as any)?.fromBlock as bigint;
      const currentBlock = await publicClient.getBlockNumber();
      const mid = (currentBlock + originalFrom) / 2n;
      return await publicClient.getLogs({ ...params, fromBlock: mid } as any);
    }
    throw e;
  }
}

async function getLogsForRange(
  publicClient: PublicClient,
  options: {
    usdcAddress: `0x${string}`;
    vaultAddress: `0x${string}`;
    userAddress: `0x${string}`;
    fromBlock: bigint;
    toBlock: bigint | "latest";
  }
) {
  const { usdcAddress, vaultAddress, userAddress, fromBlock, toBlock } =
    options;

  const [vaultDeposits, vaultWithdrawals, vaultApprovals] = await Promise.all([
    safeGetLogs(publicClient, {
      address: usdcAddress,
      event: {
        type: "event",
        name: "Transfer",
        inputs: [
          { type: "address", indexed: true, name: "from" },
          { type: "address", indexed: true, name: "to" },
          { type: "uint256", indexed: false, name: "value" },
        ],
      },
      fromBlock,
      toBlock,
      args: { from: userAddress, to: vaultAddress },
    }),
    safeGetLogs(publicClient, {
      address: usdcAddress,
      event: {
        type: "event",
        name: "Transfer",
        inputs: [
          { type: "address", indexed: true, name: "from" },
          { type: "address", indexed: true, name: "to" },
          { type: "uint256", indexed: false, name: "value" },
        ],
      },
      fromBlock,
      toBlock,
      args: { from: vaultAddress, to: userAddress },
    }),
    safeGetLogs(publicClient, {
      address: usdcAddress,
      event: {
        type: "event",
        name: "Approval",
        inputs: [
          { type: "address", indexed: true, name: "owner" },
          { type: "address", indexed: true, name: "spender" },
          { type: "uint256", indexed: false, name: "value" },
        ],
      },
      fromBlock,
      toBlock,
      args: { owner: userAddress, spender: vaultAddress },
    }),
  ]);

  return [...vaultDeposits, ...vaultWithdrawals, ...vaultApprovals];
}

// Due to time constraint and breavity, minimal version with adaptive backfill for Sei
export async function fetchVaultTransactions(
  publicClient: PublicClient,
  userAddress: `0x${string}`,
  limit: number = 10
): Promise<VaultTransaction[]> {
  if (!publicClient.chain)
    throw new Error("Public client chain is not available");

  const chainId = publicClient.chain.id as SupportedChainId;
  const usdcAddress = getUsdcAddress(chainId);
  const vaultAddress = getVaultAddress(chainId);
  const deploymentBlock = getVaultDeploymentBlock(chainId);

  const currentBlock = await publicClient.getBlockNumber();
  const MAX_SPAN = 1999;

  // For Sei, we need adaptive backfill due to sparse transactions
  const isSei = chainId === SupportedChainId.SEI_TESTNET;
  let allCollectedLogs: any[] = [];

  if (isSei) {
    // Adaptive backfill: search backwards in chunks until we find enough events
    const CHUNK_SIZE = 1800; // Safe margin under 2000 block limit
    const MAX_ITERATIONS = 10; // Prevent infinite loops
    let searchBlock = currentBlock;

    for (
      let i = 0;
      i < MAX_ITERATIONS && allCollectedLogs.length < limit;
      i++
    ) {
      const fromBlock = searchBlock - BigInt(CHUNK_SIZE);
      const toBlock = searchBlock;

      // Don't search before deployment
      if (Number(fromBlock) < deploymentBlock) break;

      const chunkLogs = await getLogsForRange(publicClient, {
        usdcAddress,
        vaultAddress,
        userAddress,
        fromBlock,
        toBlock,
      });

      allCollectedLogs.push(...chunkLogs);
      searchBlock = fromBlock - 1n; // Move to next chunk
    }
  } else {
    // For other chains, use simple recent block range
    const tentativeFrom = Number(currentBlock) - MAX_SPAN;
    const effectiveFrom = Math.max(tentativeFrom, deploymentBlock);
    let fromBlock = BigInt(effectiveFrom);

    const span = Number(currentBlock - fromBlock);
    if (span + 1 > 2000) {
      fromBlock = currentBlock - BigInt(1999);
    }

    allCollectedLogs = await getLogsForRange(publicClient, {
      usdcAddress,
      vaultAddress,
      userAddress,
      fromBlock,
      toBlock: "latest",
    });
  }

  const allLogs = allCollectedLogs
    .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
    .slice(0, limit);

  const transactions: VaultTransaction[] = [];

  const uniqueBlockNumbers = [
    ...new Set(
      allLogs
        .map((l) => l.blockNumber)
        .filter((bn): bn is bigint => bn !== undefined && bn !== null)
    ),
  ];

  const blockMap = new Map<bigint, any>();
  if (uniqueBlockNumbers.length) {
    const blocks = await Promise.all(
      uniqueBlockNumbers.map((bn) =>
        publicClient.getBlock({ blockNumber: bn }).catch((e) => {
          console.error("Failed to fetch block", bn.toString(), e);
          return undefined;
        })
      )
    );
    blocks.forEach((blk, idx) => {
      if (blk) blockMap.set(uniqueBlockNumbers[idx], blk);
    });
  }

  for (const logRaw of allLogs) {
    const log: any = logRaw as any;
    const block = blockMap.get(log.blockNumber!);
    if (!block) continue; // skip if block fetch failed
    const args = log.args || {};
    const isTransferEvent = "from" in args && "to" in args;
    const isApprovalEvent = "owner" in args && "spender" in args;

    if (isTransferEvent) {
      const transferArgs = args as {
        from?: string;
        to?: string;
        value?: bigint;
      };

      const isDeposit =
        transferArgs.from === userAddress && transferArgs.to === vaultAddress;
      const isWithdrawal =
        transferArgs.from === vaultAddress && transferArgs.to === userAddress;

      if (!isDeposit && !isWithdrawal) {
        continue; // ignore unrelated transfers within queried block range
      }

      const transactionType = isDeposit ? "deposit" : "withdrawal";

      transactions.push({
        hash: log.transactionHash!,
        type: transactionType,
        amount: formatUnits(transferArgs.value as bigint, 6),
        tokenSymbol: "USDC",
        chainId: publicClient.chain!.id,
        timestamp: Number(block.timestamp) * 1000,
        blockNumber: Number(log.blockNumber),
        from: transferArgs.from as string,
        to: transferArgs.to as string,
      });
    } else if (isApprovalEvent) {
      const approvalArgs = args as {
        owner?: string;
        spender?: string;
        value?: bigint;
      };

      transactions.push({
        hash: log.transactionHash!,
        type: "approval",
        amount: formatUnits(approvalArgs.value as bigint, 6),
        tokenSymbol: "USDC",
        chainId: publicClient.chain!.id,
        timestamp: Number(block.timestamp) * 1000,
        blockNumber: Number(log.blockNumber),
        from: approvalArgs.owner as string,
        to: approvalArgs.spender as string,
      });
    }
  }

  return transactions.sort((a, b) => b.timestamp - a.timestamp);
}
