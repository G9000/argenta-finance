import { useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  writeContract,
  waitForTransactionReceipt,
  simulateContract,
} from "@wagmi/core";
import { erc20Abi } from "viem";
import type { Hash } from "viem";
import PQueue from "p-queue";

import { SupportedChainId, getSupportedChainMeta } from "@/constant/chains";
import { simpleVaultAbi } from "@/generated/wagmi";
import { wagmiConfig } from "@/wagmi";
import {
  parseAmountToBigInt,
  validateChainOperation,
  isUserRejection,
} from "@/lib/vault-operations";
import {
  useOperationsStore,
  getChainTransactions,
  initializeOperationsStore,
} from "@/stores/operationsStore";

interface QueueConfig {
  concurrency?: number;
  interval?: number;
  intervalCap?: number;
}

interface UseMultiChainOperationsConfig {
  queueConfig?: QueueConfig;
}

export interface UseMultiChainOperationsReturn {
  queueApproval: (chainId: SupportedChainId, amount: string) => void;
  queueDeposit: (chainId: SupportedChainId, amount: string) => void;
  queueApprovalAndDeposit: (chainId: SupportedChainId, amount: string) => void;
  queueBatchOperations: (
    chainAmounts: Array<{ chainId: SupportedChainId; amount: string }>
  ) => void;
  clearQueue: () => void;
  cancelQueue: () => void;
}

const DEFAULT_QUEUE_CONFIG: Required<QueueConfig> = {
  concurrency: Number(process.env.NEXT_PUBLIC_QUEUE_CONCURRENCY) || 1,
  interval: Number(process.env.NEXT_PUBLIC_QUEUE_INTERVAL) || 100,
  intervalCap: Number(process.env.NEXT_PUBLIC_QUEUE_INTERVAL_CAP) || 1,
};

/**
 * Orchestrates multi-chain approval/deposit operations with a background queue.
 *
 * Flow overview
 * 1) Queueing
 *    - queueApproval(chainId, amount) → enqueue approval
 *    - queueDeposit(chainId, amount) → enqueue deposit
 *    - queueApprovalAndDeposit(chainId, amount) → sequences both (approval then deposit) for a chain
 *    - queueBatchOperations([{ chainId, amount }, ...]) → sequences operations per chain in order
 *
 * 2) Execution (per operation)
 *    - setChainOperationState(chainId, "approval" | "deposit") before wallet confirm
 *    - writeContract returns hash → setChainOperationState(chainId, "confirming", hash); storeTransactionHash
 *    - waitForTransactionReceipt success → storeConfirmedTransactionHash; setChainCompleted
 *    - approval success also calls setLastApprovedAmount for future allowance checks
 *    - on error/cancel → clearTransactionHash; setChainError; in-flight cleared
 *
 * 3) Resume after refresh
 *    - initializeOperationsStore() on mount → reconcilePendingTransactions()
 *      marks chains as confirming if unconfirmed hashes are found in storage
 *
 * Queue
 * - PQueue controls concurrency and optional rate limiting (interval/intervalCap)
 * - updateProcessingState keeps a derived isProcessingQueue flag in the store
 */
export function useMultiChainOperations(
  config?: UseMultiChainOperationsConfig
): UseMultiChainOperationsReturn {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();

  const addToQueue = useOperationsStore((s) => s.addToQueue);
  const removeFromQueue = useOperationsStore((s) => s.removeFromQueue);
  const setProcessingState = useOperationsStore((s) => s.setProcessingState);
  const setInFlightChainId = useOperationsStore((s) => s.setInFlightChainId);
  const setChainOperationState = useOperationsStore(
    (s) => s.setChainOperationState
  );
  const setChainError = useOperationsStore((s) => s.setChainError);
  const setChainCompleted = useOperationsStore((s) => s.setChainCompleted);
  const storeTx = useOperationsStore((s) => s.storeTransactionHash);
  const storeTxConfirmed = useOperationsStore(
    (s) => s.storeConfirmedTransactionHash
  );
  const clearTx = useOperationsStore((s) => s.clearTransactionHash);
  const setLastApprovedAmount = useOperationsStore(
    (s) => s.setLastApprovedAmount
  );

  const operationIdRef = useRef(0);
  const abortersRef = useRef<Set<AbortController>>(new Set());
  const queueRef = useRef<PQueue | undefined>(undefined);

  if (!queueRef.current) {
    const queueConfig = { ...DEFAULT_QUEUE_CONFIG, ...config?.queueConfig };
    queueRef.current = new PQueue({
      concurrency: queueConfig.concurrency,
      ...(queueConfig.interval !== undefined &&
        queueConfig.intervalCap !== undefined && {
          interval: queueConfig.interval,
          intervalCap: queueConfig.intervalCap,
        }),
    });
  }
  const operationQueue = queueRef.current;

  const isAlreadyQueued = useCallback(
    (
      chainId: SupportedChainId,
      type: "approval" | "deposit",
      amount: string
    ) => {
      return useOperationsStore
        .getState()
        .operationQueue.some(
          (op) =>
            op.chainId === chainId && op.type === type && op.amount === amount
        );
    },
    []
  );

  useEffect(() => {
    const updateProcessingState = () => {
      const isProcessing =
        operationQueue.size > 0 || operationQueue.pending > 0;
      setProcessingState(isProcessing);
    };

    operationQueue.on("idle", updateProcessingState);
    operationQueue.on("add", updateProcessingState);

    return () => {
      operationQueue.off("idle", updateProcessingState);
      operationQueue.off("add", updateProcessingState);
    };
  }, [operationQueue, setProcessingState]);

  useEffect(() => {
    return () => {
      abortersRef.current.forEach((controller) => controller.abort());
      abortersRef.current.clear();
      operationQueue.clear();
      operationQueue.pause();
    };
  }, [operationQueue]);

  // Initialize pending transaction reconciliation on mount
  useEffect(() => {
    initializeOperationsStore();
  }, []);

  /**
   * Ensures the wallet is on the target chain before submitting a tx.
   * - Throws a user-friendly error when user rejects network switch.
   */
  const ensureChainSwitch = useCallback(
    async (targetChainId: SupportedChainId) => {
      try {
        if (!switchChainAsync) throw new Error("Chain switching not available");
        if (currentChainId === targetChainId) return;
        const res = await switchChainAsync({ chainId: targetChainId });
        if (res.id !== targetChainId)
          throw new Error("Wallet did not switch chains");
      } catch (error) {
        if (isUserRejection(error)) {
          throw new Error("Network switch cancelled by user");
        }
        throw error;
      }
    },
    [currentChainId, switchChainAsync]
  );

  /**
   * Execute a single chain operation (approval | deposit) end-to-end.
   *
   * Steps
   * 1) Pre checks (address, abort signal) and set in-flight chain
   * 2) Validate contracts/amount and optionally simulate for clearer failures
   * 3) setChainOperationState(chainId, operationType) before wallet confirm
   * 4) writeContract → hash
   *    - setChainOperationState(chainId, "confirming", hash)
   *    - storeTransactionHash(chainId, operationType, hash)
   * 5) waitForTransactionReceipt(hash)
   *    - on success: storeConfirmedTransactionHash; setChainCompleted
   *    - if approval: setLastApprovedAmount
   *    - invalidate allowance/balance queries
   * 6) on error/cancel: clearTransactionHash; setChainError; clear in-flight
   */
  const executeChainOperation = useCallback(
    async (
      chainId: SupportedChainId,
      operationType: "approval" | "deposit",
      amount: string,
      preSignTimeoutMs: number = 60000
    ): Promise<Hash> => {
      const abortController = new AbortController();
      abortersRef.current.add(abortController);

      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, preSignTimeoutMs);

      try {
        if (abortController.signal.aborted) {
          throw new Error("Operation cancelled");
        }

        setInFlightChainId(chainId);

        if (!address) {
          console.error(`[executeChainOperation] ❌ Wallet not connected!`);
          throw new Error("Wallet not connected");
        }

        const { usdcAddress, vaultAddress } = validateChainOperation(chainId);
        const amountWei = parseAmountToBigInt(amount, chainId);

        if (amountWei <= 0n) {
          throw new Error("Amount must be greater than 0");
        }

        if (abortController.signal.aborted) {
          throw new Error("Operation cancelled");
        }

        await ensureChainSwitch(chainId);
        setChainOperationState(chainId, operationType);

        const chainConfig = getSupportedChainMeta(chainId);

        if (abortController.signal.aborted) {
          throw new Error("Operation cancelled");
        }

        // Preflight simulation for clearer failures
        if (operationType === "approval") {
          await simulateContract(wagmiConfig, {
            address: usdcAddress,
            abi: erc20Abi,
            functionName: "approve",
            args: [vaultAddress, amountWei],
            chainId,
          });
        } else {
          await simulateContract(wagmiConfig, {
            address: vaultAddress,
            abi: simpleVaultAbi,
            functionName: "deposit",
            args: [usdcAddress, amountWei],
            chainId,
          });
        }

        if (abortController.signal.aborted) {
          throw new Error("Operation cancelled");
        }

        const hash = await writeContract(wagmiConfig, {
          address: operationType === "approval" ? usdcAddress : vaultAddress,
          abi: operationType === "approval" ? erc20Abi : simpleVaultAbi,
          functionName: operationType === "approval" ? "approve" : "deposit",
          args:
            operationType === "approval"
              ? [vaultAddress, amountWei]
              : [usdcAddress, amountWei],
          chain: chainConfig,
        });

        // Clear timeout after successful signing - avoid aborting confirmed transactions
        clearTimeout(timeoutId);

        setChainOperationState(chainId, "confirming", hash);
        storeTx(chainId, operationType, hash);

        if (abortController.signal.aborted) {
          throw new Error("Operation cancelled");
        }

        const receipt = await Promise.race([
          waitForTransactionReceipt(wagmiConfig, {
            hash,
            chainId,
          }),
          new Promise<never>((_, reject) => {
            const onAbort = () => reject(new Error("Operation cancelled"));
            abortController.signal.addEventListener("abort", onAbort, {
              once: true,
            });
          }),
        ]);

        if (receipt.status !== "success") {
          clearTx(chainId, operationType);
          setInFlightChainId(null);
          setChainError(chainId, "Transaction reverted", false);
          return Promise.reject(new Error("Transaction reverted"));
        }

        storeTxConfirmed(chainId, operationType, hash);
        setChainCompleted(chainId, operationType, hash);
        setInFlightChainId(null);

        // Track approved amount for future allowance checks
        if (operationType === "approval") {
          setLastApprovedAmount(chainId, amountWei);
        }

        try {
          queryClient.invalidateQueries({
            predicate: (query) => {
              const queryKey = query.queryKey as any[];
              return (
                Array.isArray(queryKey) &&
                (queryKey.includes("allowance") ||
                  queryKey.includes("balance") ||
                  queryKey.includes("vaultBalance"))
              );
            },
          });
        } catch {}

        return hash;
      } catch (error) {
        const isUserCancel = isUserRejection(error);
        const isCancellation =
          error instanceof Error && error.message === "Operation cancelled";

        // Surface consistent error messages
        let errorMessage = `${operationType} failed`;
        if (isCancellation) {
          errorMessage = "Operation cancelled";
        } else if (isUserCancel) {
          errorMessage = "Cancelled by user";
        } else if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (message.includes("simulation") || message.includes("preflight")) {
            errorMessage = `Preflight failed: ${error.message}`;
          } else if (
            message.includes("user rejected") ||
            message.includes("user denied")
          ) {
            errorMessage = "Cancelled by user";
          } else if (message.includes("reverted")) {
            errorMessage = "Transaction reverted";
          } else if (message.includes("network switch")) {
            errorMessage = error.message;
          } else {
            errorMessage = `Transaction submission failed: ${error.message}`;
          }
        }

        setChainError(chainId, errorMessage, isUserCancel || isCancellation);
        clearTx(chainId, operationType);
        setInFlightChainId(null);

        throw error;
      } finally {
        abortersRef.current.delete(abortController);
      }
    },
    [
      address,
      ensureChainSwitch,
      setInFlightChainId,
      setChainOperationState,
      setChainError,
      setChainCompleted,
      storeTx,
      storeTxConfirmed,
      clearTx,
      setLastApprovedAmount,
      queryClient,
    ]
  );

  /**
   * Enqueue a single approval for a chain.
   * - De-dupes by (chainId, type, amount).
   * - Job sets priority higher than deposit to ensure correct sequencing.
   */
  const queueApproval = useCallback(
    (chainId: SupportedChainId, amount: string) => {
      if (isAlreadyQueued(chainId, "approval", amount)) return;

      const id = `approval-${chainId}-${++operationIdRef.current}`;

      addToQueue({
        chainId,
        type: "approval",
        amount,
        priority: 2,
        id,
      });

      operationQueue.add(
        async () => {
          try {
            await executeChainOperation(chainId, "approval", amount);
          } finally {
            removeFromQueue(id);
          }
        },
        { priority: 2 }
      );
    },
    [
      operationQueue,
      executeChainOperation,
      addToQueue,
      removeFromQueue,
      isAlreadyQueued,
    ]
  );

  /**
   * Enqueue a single deposit for a chain.
   * - De-dupes by (chainId, type, amount).
   */
  const queueDeposit = useCallback(
    (chainId: SupportedChainId, amount: string) => {
      if (isAlreadyQueued(chainId, "deposit", amount)) return;

      const id = `deposit-${chainId}-${++operationIdRef.current}`;

      addToQueue({
        chainId,
        type: "deposit",
        amount,
        priority: 1,
        id,
      });

      operationQueue.add(
        async () => {
          try {
            await executeChainOperation(chainId, "deposit", amount);
          } finally {
            removeFromQueue(id);
          }
        },
        { priority: 1 }
      );
    },
    [
      operationQueue,
      executeChainOperation,
      addToQueue,
      removeFromQueue,
      isAlreadyQueued,
    ]
  );

  /**
   * Enqueue approval then deposit for a chain.
   * - Skips approval if lastApprovedAmount >= amountWei.
   * - Runs both steps within a single PQueue job to keep order.
   */
  const queueApprovalAndDeposit = useCallback(
    (chainId: SupportedChainId, amount: string) => {
      console.log(
        "[queueApprovalAndDeposit] Adding operations for chain",
        chainId,
        "amount",
        amount
      );

      const transactions = getChainTransactions(chainId);
      const amountWei = parseAmountToBigInt(amount, chainId);
      const lastApprovedAmount = BigInt(
        transactions?.lastApprovedAmount ?? "0"
      );
      const needsApproval = lastApprovedAmount < amountWei;

      const approvalId = needsApproval
        ? `approval-${chainId}-${++operationIdRef.current}`
        : null;
      const depositId = `deposit-${chainId}-${++operationIdRef.current}`;

      if (needsApproval && approvalId) {
        addToQueue({
          chainId,
          type: "approval",
          amount,
          priority: 2,
          id: approvalId,
        });
      }
      addToQueue({
        chainId,
        type: "deposit",
        amount,
        priority: 1,
        id: depositId,
      });

      operationQueue.add(
        async () => {
          try {
            if (needsApproval) {
              await executeChainOperation(chainId, "approval", amount);
              if (approvalId) {
                removeFromQueue(approvalId);
              }
            }
            await executeChainOperation(chainId, "deposit", amount);
          } finally {
            removeFromQueue(depositId);
          }
        },
        { priority: 2 }
      );
    },
    [operationQueue, executeChainOperation, addToQueue, removeFromQueue]
  );

  /**
   * Enqueue many chains; within each chain the order is preserved
   * (approval → deposit), across chains priority staggers by index.
   */
  const queueBatchOperations = useCallback(
    (chainAmounts: Array<{ chainId: SupportedChainId; amount: string }>) => {
      chainAmounts.forEach(({ chainId, amount }, chainIndex) => {
        const basePriority = chainIndex * 10;

        const transactions = getChainTransactions(chainId);
        const amountWei = parseAmountToBigInt(amount, chainId);
        const lastApprovedAmount = BigInt(
          transactions.lastApprovedAmount ?? "0"
        );
        const needsApproval = lastApprovedAmount < amountWei;

        // Prevent duplicate operations
        if (
          isAlreadyQueued(chainId, "approval", amount) ||
          isAlreadyQueued(chainId, "deposit", amount)
        ) {
          return;
        }

        const approvalId = needsApproval
          ? `approval-${chainId}-${++operationIdRef.current}`
          : null;
        const depositId = `deposit-${chainId}-${++operationIdRef.current}`;

        if (needsApproval && approvalId) {
          addToQueue({
            chainId,
            type: "approval",
            amount,
            priority: basePriority + 2,
            id: approvalId,
          });
        }
        addToQueue({
          chainId,
          type: "deposit",
          amount,
          priority: basePriority + 1,
          id: depositId,
        });

        // Single job per chain to ensure approval completes before deposit
        operationQueue.add(
          async () => {
            try {
              if (needsApproval) {
                await executeChainOperation(chainId, "approval", amount);
                if (approvalId) {
                  removeFromQueue(approvalId);
                }
              }
              await executeChainOperation(chainId, "deposit", amount);
            } finally {
              removeFromQueue(depositId);
            }
          },
          { priority: basePriority + 2 }
        );
      });
    },
    [
      operationQueue,
      executeChainOperation,
      addToQueue,
      removeFromQueue,
      isAlreadyQueued,
    ]
  );

  const clearStoreQueue = useOperationsStore((s) => s.clearQueue);

  /**
   * Clear all queued jobs and mirror that in the store.
   */
  const clearQueue = useCallback(() => {
    operationQueue.clear();
    clearStoreQueue();
  }, [operationQueue, clearStoreQueue]);

  /**
   * Abort any in-flight work, clear queue/state, and pause the queue.
   * Resumes the queue after cleanup for future operations.
   */
  const cancelQueue = useCallback(() => {
    // Cancel any ongoing operations
    abortersRef.current.forEach((controller) => controller.abort());
    abortersRef.current.clear();

    // Clear the p-queue
    operationQueue.clear();
    operationQueue.pause();

    // Clear store state
    clearStoreQueue();
    setProcessingState(false);
    setInFlightChainId(null);

    // Resume queue for future operations
    operationQueue.start();
  }, [operationQueue, clearStoreQueue, setProcessingState, setInFlightChainId]);

  return {
    queueApproval,
    queueDeposit,
    queueApprovalAndDeposit,
    queueBatchOperations,
    clearQueue,
    cancelQueue,
  };
}
