import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import { useDebouncedCallback } from "use-debounce";
import { Mutex } from "async-mutex";

import { SupportedChainId, getSupportedChainMeta } from "@/constant/chains";
import { simpleVaultAbi } from "@/generated/wagmi";
import { wagmiConfig } from "@/wagmi";
import {
  parseAmountToBigInt,
  validateChainOperation,
  isUserRejection,
} from "@/lib/vault-operations";

type OperationType = "approval" | "deposit" | "confirming";

interface ChainTransactions {
  approvalTxHash?: Hash;
  depositTxHash?: Hash;
  approvalConfirmedTxHash?: Hash;
  depositConfirmedTxHash?: Hash;
}

interface ChainOperationState {
  isOperating: boolean;
  operationType: OperationType | null;
  txHash: Hash | null;
  error: string | null;
  isUserCancellation: boolean;
  lastCompleted?: "approval" | "deposit" | null;
  lastErrorAt?: number;
}

interface ChainOperation {
  chainId: SupportedChainId;
  type: "approval" | "deposit";
  amount: string;
  priority: number;
  id: string;
}

interface MultiChainOperationState {
  chainOperations: Record<SupportedChainId, ChainOperationState>;
  operationQueue: ChainOperation[];
  isProcessingQueue: boolean;
  chainTransactions: Record<SupportedChainId, ChainTransactions>;
  inFlightChainId: SupportedChainId | null;
}

export interface UseMultiChainOperationsReturn {
  queueApproval: (chainId: SupportedChainId, amount: string) => void;
  queueDeposit: (chainId: SupportedChainId, amount: string) => void;
  queueApprovalAndDeposit: (chainId: SupportedChainId, amount: string) => void;
  queueBatchOperations: (
    chainAmounts: Array<{ chainId: SupportedChainId; amount: string }>
  ) => void;
  processQueue: () => Promise<void>;
  clearQueue: () => void;

  getChainState: (chainId: SupportedChainId) => ChainOperationState;
  getChainTransactions: (chainId: SupportedChainId) => ChainTransactions;
  isChainOperating: (chainId: SupportedChainId) => boolean;
  isAnyChainOperating: boolean;
  isProcessingQueue: boolean;
  queueLength: number;

  clearError: (chainId: SupportedChainId) => void;
  clearAllErrors: () => void;

  cancelQueue: () => void;
  inFlightChainId?: SupportedChainId | null;
}

const DEFAULT_CHAIN_STATE: ChainOperationState = {
  isOperating: false,
  operationType: null,
  txHash: null,
  error: null,
  isUserCancellation: false,
  lastCompleted: null,
};

export function useMultiChainOperations(): UseMultiChainOperationsReturn {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();

  const operationIdRef = useRef(0);

  const [state, setState] = useState<MultiChainOperationState>({
    chainOperations: {} as Record<SupportedChainId, ChainOperationState>,
    operationQueue: [],
    isProcessingQueue: false,
    chainTransactions: {} as Record<SupportedChainId, ChainTransactions>,
    inFlightChainId: null,
  });

  // Mounted/processing guards for async setState safety
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize p-queue for operation processing
  const operationQueue = useMemo(
    () =>
      new PQueue({
        concurrency: 1,
        interval: 100,
        intervalCap: 1,
      }),
    []
  );

  // Initialize mutex for race condition prevention
  const processingMutex = useMemo(() => new Mutex(), []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear the p-queue on unmount
      operationQueue.clear();
      operationQueue.pause();
    };
  }, [operationQueue]);

  const safeSetState = useCallback(
    (updater: (p: MultiChainOperationState) => MultiChainOperationState) => {
      if (mountedRef.current) setState(updater);
    },
    []
  );

  const getChainState = useCallback(
    (chainId: SupportedChainId): ChainOperationState => {
      return state.chainOperations[chainId] || { ...DEFAULT_CHAIN_STATE };
    },
    [state.chainOperations]
  );

  const getChainTransactions = useCallback(
    (chainId: SupportedChainId): ChainTransactions => {
      return state.chainTransactions[chainId] || {};
    },
    [state.chainTransactions]
  );

  const isChainOperating = useCallback(
    (chainId: SupportedChainId): boolean => {
      return getChainState(chainId).isOperating;
    },
    [getChainState]
  );

  const isAnyChainOperating = Object.values(state.chainOperations).some(
    (chainState) => chainState.isOperating
  );

  const setChainOperationState = useCallback(
    (
      chainId: SupportedChainId,
      type: OperationType,
      txHash: Hash | null = null
    ) => {
      safeSetState((prev) => ({
        ...prev,
        chainOperations: {
          ...prev.chainOperations,
          [chainId]: {
            ...prev.chainOperations[chainId], // preserve lastCompleted/lastErrorAt
            isOperating: true,
            operationType: type,
            txHash,
            error: null,
            isUserCancellation: false,
          },
        },
      }));
    },
    [safeSetState]
  );

  const setChainError = useCallback(
    (
      chainId: SupportedChainId,
      error: string,
      isUserCancellation: boolean = false
    ) => {
      safeSetState((prev) => ({
        ...prev,
        chainOperations: {
          ...prev.chainOperations,
          [chainId]: {
            ...prev.chainOperations[chainId],
            isOperating: false,
            error,
            isUserCancellation,
          },
        },
      }));
    },
    [safeSetState]
  );

  const storeTransactionHash = useCallback(
    (chainId: SupportedChainId, type: OperationType, txHash: Hash) => {
      safeSetState((prev) => ({
        ...prev,
        chainTransactions: {
          ...prev.chainTransactions,
          [chainId]: {
            ...prev.chainTransactions[chainId],
            [type === "approval" ? "approvalTxHash" : "depositTxHash"]: txHash,
          },
        },
      }));
    },
    [safeSetState]
  );

  const storeConfirmedTransactionHash = useCallback(
    (chainId: SupportedChainId, type: OperationType, txHash: Hash) => {
      safeSetState((prev) => ({
        ...prev,
        chainTransactions: {
          ...prev.chainTransactions,
          [chainId]: {
            ...prev.chainTransactions[chainId],
            [type === "approval"
              ? "approvalConfirmedTxHash"
              : "depositConfirmedTxHash"]: txHash,
          },
        },
      }));
    },
    [safeSetState]
  );

  const ensureChainSwitch = useCallback(
    async (targetChainId: SupportedChainId) => {
      if (!switchChainAsync) throw new Error("Chain switching not available");
      if (currentChainId === targetChainId) return;
      const res = await switchChainAsync({ chainId: targetChainId });
      if (res.id !== targetChainId)
        throw new Error("Wallet did not switch chains");
    },
    [currentChainId, switchChainAsync]
  );

  const executeChainOperation = useCallback(
    async (
      chainId: SupportedChainId,
      operationType: "approval" | "deposit",
      amount: string
    ): Promise<Hash> => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        if (abortController.signal.aborted) {
          throw new Error("Operation cancelled");
        }

        safeSetState((prev) => ({ ...prev, inFlightChainId: chainId }));

        if (!address) {
          console.error(`[executeChainOperation] ❌ Wallet not connected!`);
          throw new Error("Wallet not connected");
        }

        const { usdcAddress, vaultAddress } = validateChainOperation(chainId);
        const amountWei = parseAmountToBigInt(amount, chainId);

        // Validate amount before proceeding
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

        safeSetState((prev) => ({
          ...prev,
          chainOperations: {
            ...prev.chainOperations,
            [chainId]: {
              ...prev.chainOperations[chainId],
              txHash: hash,
              operationType: "confirming",
            },
          },
        }));

        storeTransactionHash(chainId, operationType, hash);

        if (abortController.signal.aborted) {
          throw new Error("Operation cancelled");
        }

        // Wait for transaction receipt with cancellation support
        const receipt = await Promise.race([
          waitForTransactionReceipt(wagmiConfig, {
            hash,
            chainId,
          }),
          new Promise<never>((_, reject) => {
            abortController.signal.addEventListener("abort", () => {
              reject(new Error("Operation cancelled"));
            });
          }),
        ]);

        if (receipt.status !== "success") {
          safeSetState((prev) => ({
            ...prev,
            chainTransactions: {
              ...prev.chainTransactions,
              [chainId]: {
                ...prev.chainTransactions[chainId],
                ...(operationType === "approval"
                  ? { approvalTxHash: undefined }
                  : { depositTxHash: undefined }),
              },
            },
            inFlightChainId: null,
          }));
          setChainError(chainId, "Transaction reverted", false);
          return Promise.reject(new Error("Transaction reverted"));
        }

        storeConfirmedTransactionHash(chainId, operationType, hash);

        // Set completed state instead of resetting
        safeSetState((prev) => ({
          ...prev,
          chainOperations: {
            ...prev.chainOperations,
            [chainId]: {
              ...prev.chainOperations[chainId],
              isOperating: false,
              operationType: null,
              txHash: hash,
              error: null,
              isUserCancellation: false,
              lastCompleted: operationType,
            },
          },
          inFlightChainId: null,
        }));

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
        const errorMessage = isCancellation
          ? "Operation cancelled"
          : isUserCancel
          ? "Transaction cancelled by user"
          : error instanceof Error
          ? error.message
          : `${operationType} failed`;

        setChainError(chainId, errorMessage, isUserCancel || isCancellation);

        // Clear pending tx hash on cancel as well as revert
        safeSetState((prev) => ({
          ...prev,
          chainOperations: {
            ...prev.chainOperations,
            [chainId]: {
              ...prev.chainOperations[chainId],
              lastErrorAt: Date.now(),
            },
          },
          chainTransactions: {
            ...prev.chainTransactions,
            [chainId]: {
              ...prev.chainTransactions[chainId],
              ...(operationType === "approval"
                ? { approvalTxHash: undefined }
                : { depositTxHash: undefined }),
            },
          },
          inFlightChainId: null,
        }));
        throw error;
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [
      address,
      ensureChainSwitch,
      setChainOperationState,
      storeTransactionHash,
      storeConfirmedTransactionHash,
      setChainError,
      safeSetState,
      queryClient,
    ]
  );

  const queueApproval = useCallback(
    (chainId: SupportedChainId, amount: string) => {
      operationQueue.add(
        () => executeChainOperation(chainId, "approval", amount),
        { priority: 2 }
      );

      // Update state to show operation is queued
      safeSetState((prev) => ({
        ...prev,
        operationQueue: [
          ...prev.operationQueue,
          {
            chainId,
            type: "approval",
            amount,
            priority: 2,
            id: `approval-${chainId}-${++operationIdRef.current}`,
          },
        ],
      }));
    },
    [operationQueue, executeChainOperation, safeSetState]
  );

  const queueDeposit = useCallback(
    (chainId: SupportedChainId, amount: string) => {
      operationQueue.add(
        () => executeChainOperation(chainId, "deposit", amount),
        { priority: 1 }
      );

      // Update state to show operation is queued
      safeSetState((prev) => ({
        ...prev,
        operationQueue: [
          ...prev.operationQueue,
          {
            chainId,
            type: "deposit",
            amount,
            priority: 1,
            id: `deposit-${chainId}-${++operationIdRef.current}`,
          },
        ],
      }));
    },
    [operationQueue, executeChainOperation, safeSetState]
  );

  const queueApprovalAndDeposit = useCallback(
    (chainId: SupportedChainId, amount: string) => {
      console.log(
        "[queueApprovalAndDeposit] Adding operations for chain",
        chainId,
        "amount",
        amount
      );

      // Skip redundant approval if already confirmed
      const transactions = getChainTransactions(chainId);

      if (!transactions.approvalConfirmedTxHash) {
        // Chain the operations: approval first, then deposit
        operationQueue.add(
          async () => {
            // Execute approval first
            await executeChainOperation(chainId, "approval", amount);

            // Then immediately queue the deposit with high priority
            operationQueue.add(
              () => executeChainOperation(chainId, "deposit", amount),
              { priority: 10 } // High priority to run next
            );
          },
          { priority: 2 }
        );
      } else {
        // Skip approval, just do deposit
        operationQueue.add(
          () => executeChainOperation(chainId, "deposit", amount),
          { priority: 1 }
        );
      }

      // Update state to show operations are queued
      safeSetState((prev) => {
        const newOperations = [];
        if (!transactions.approvalConfirmedTxHash) {
          newOperations.push({
            chainId,
            type: "approval" as const,
            amount,
            priority: 2,
            id: `approval-${chainId}-${++operationIdRef.current}`,
          });
        }
        newOperations.push({
          chainId,
          type: "deposit" as const,
          amount,
          priority: 1,
          id: `deposit-${chainId}-${++operationIdRef.current}`,
        });

        return {
          ...prev,
          operationQueue: [...prev.operationQueue, ...newOperations],
        };
      });
    },
    [operationQueue, executeChainOperation, getChainTransactions, safeSetState]
  );

  const queueBatchOperations = useCallback(
    (chainAmounts: Array<{ chainId: SupportedChainId; amount: string }>) => {
      const newOperations: ChainOperation[] = [];

      chainAmounts.forEach(({ chainId, amount }, chainIndex) => {
        const basePriority = chainIndex * 10;

        // Add approval operation (higher priority - runs first)
        operationQueue.add(
          () => executeChainOperation(chainId, "approval", amount),
          { priority: basePriority + 2 }
        );
        newOperations.push({
          chainId,
          type: "approval",
          amount,
          priority: basePriority + 2,
          id: `approval-${chainId}-${++operationIdRef.current}`,
        });

        // Add deposit operation (lower priority - runs after approval)
        operationQueue.add(
          () => executeChainOperation(chainId, "deposit", amount),
          { priority: basePriority + 1 }
        );
        newOperations.push({
          chainId,
          type: "deposit",
          amount,
          priority: basePriority + 1,
          id: `deposit-${chainId}-${++operationIdRef.current}`,
        });
      });

      // Update state to show operations are queued
      safeSetState((prev) => ({
        ...prev,
        operationQueue: [...prev.operationQueue, ...newOperations],
      }));
    },
    [operationQueue, executeChainOperation, safeSetState]
  );

  const processQueue = useCallback(async () => {
    // Use mutex to prevent race conditions
    const release = await processingMutex.acquire();

    try {
      safeSetState((p) => ({ ...p, isProcessingQueue: true }));

      // p-queue handles the processing automatically, we just need to start it
      await operationQueue.onIdle();

      // Clear completed operations from state
      safeSetState((p) => ({ ...p, operationQueue: [] }));
    } finally {
      safeSetState((p) => ({ ...p, isProcessingQueue: false }));
      release();
    }
  }, [processingMutex, operationQueue, safeSetState]);

  // Debounced queue processing to prevent rapid successive calls
  const debouncedProcessQueue = useDebouncedCallback(() => {
    if (mountedRef.current && !state.isProcessingQueue) {
      void processQueue();
    }
  }, 100);

  useEffect(() => {
    if (!state.isProcessingQueue && state.operationQueue.length > 0) {
      debouncedProcessQueue();
    }
  }, [
    state.isProcessingQueue,
    state.operationQueue.length,
    debouncedProcessQueue,
  ]);

  const clearQueue = useCallback(() => {
    operationQueue.clear();
    safeSetState((prev) => ({ ...prev, operationQueue: [] }));
  }, [operationQueue, safeSetState]);

  const cancelQueue = useCallback(() => {
    // Cancel any ongoing operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear the p-queue
    operationQueue.clear();
    operationQueue.pause();

    safeSetState((prev) => ({
      ...prev,
      operationQueue: [],
      isProcessingQueue: false,
      inFlightChainId: null,
    }));

    // Resume queue for future operations
    operationQueue.start();
  }, [operationQueue, safeSetState]);

  const clearError = useCallback(
    (chainId: SupportedChainId) => {
      safeSetState((prev) => ({
        ...prev,
        chainOperations: {
          ...prev.chainOperations,
          [chainId]: {
            ...prev.chainOperations[chainId],
            error: null,
            isUserCancellation: false,
          },
        },
      }));
    },
    [safeSetState]
  );

  const clearAllErrors = useCallback(() => {
    safeSetState((prev) => ({
      ...prev,
      chainOperations: Object.keys(prev.chainOperations).reduce(
        (acc, chainIdStr) => {
          const chainId = Number(chainIdStr) as SupportedChainId;
          acc[chainId] = {
            ...prev.chainOperations[chainId],
            error: null,
            isUserCancellation: false,
          };
          return acc;
        },
        {} as Record<SupportedChainId, ChainOperationState>
      ),
    }));
  }, [safeSetState]);

  return {
    queueApproval,
    queueDeposit,
    queueApprovalAndDeposit,
    queueBatchOperations,
    processQueue,
    clearQueue,

    getChainState,
    getChainTransactions,
    isChainOperating,
    isAnyChainOperating,
    isProcessingQueue: state.isProcessingQueue,
    queueLength: state.operationQueue.length,

    clearError,
    clearAllErrors,

    cancelQueue,
    inFlightChainId: state.inFlightChainId,
  };
}
