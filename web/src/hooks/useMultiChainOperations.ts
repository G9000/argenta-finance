import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  writeContract,
  waitForTransactionReceipt,
  simulateContract,
} from "@wagmi/core";
import { erc20Abi } from "viem";
import type { Hash } from "viem";

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
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const processingRef = useRef(false);

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

  const enqueueUnique = useCallback(
    (op: ChainOperation) => {
      safeSetState((prev) => {
        const exists = prev.operationQueue.some(
          (o) =>
            o.chainId === op.chainId &&
            o.type === op.type &&
            o.amount === op.amount
        );
        return exists
          ? prev
          : { ...prev, operationQueue: [...prev.operationQueue, op] };
      });
    },
    [safeSetState]
  );

  const queueApproval = useCallback(
    (chainId: SupportedChainId, amount: string) => {
      const id = `approval-${chainId}-${++operationIdRef.current}`;
      enqueueUnique({ chainId, type: "approval", amount, priority: 1, id });
    },
    [enqueueUnique]
  );

  const queueDeposit = useCallback(
    (chainId: SupportedChainId, amount: string) => {
      const id = `deposit-${chainId}-${++operationIdRef.current}`;
      enqueueUnique({ chainId, type: "deposit", amount, priority: 2, id });
    },
    [enqueueUnique]
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
        enqueueUnique({
          chainId,
          type: "approval",
          amount,
          priority: 1,
          id: `approval-${chainId}-${++operationIdRef.current}`,
        });
      }

      enqueueUnique({
        chainId,
        type: "deposit",
        amount,
        priority: 2,
        id: `deposit-${chainId}-${++operationIdRef.current}`,
      });
    },
    [enqueueUnique, getChainTransactions]
  );

  const queueBatchOperations = useCallback(
    (chainAmounts: Array<{ chainId: SupportedChainId; amount: string }>) => {
      chainAmounts.forEach(({ chainId, amount }, chainIndex) => {
        const approvalId = `approval-${chainId}-${++operationIdRef.current}`;
        const depositId = `deposit-${chainId}-${++operationIdRef.current}`;
        const basePriority = chainIndex * 10;
        enqueueUnique({
          chainId,
          type: "approval",
          amount,
          priority: basePriority + 1,
          id: approvalId,
        });
        enqueueUnique({
          chainId,
          type: "deposit",
          amount,
          priority: basePriority + 2,
          id: depositId,
        });
      });
    },
    [enqueueUnique]
  );

  const processQueue = useCallback(async () => {
    // Double-check processing guard to prevent race conditions
    if (processingRef.current) return;

    let currentQueue: ChainOperation[] = [];
    let shouldProcess = false;

    safeSetState((p) => {
      // Re-check processing flag inside state update to prevent races
      if (processingRef.current) return p;

      currentQueue = [...p.operationQueue];
      if (currentQueue.length === 0) return p;

      // Set both flags atomically
      processingRef.current = true;
      shouldProcess = true;
      return { ...p, isProcessingQueue: true };
    });

    if (!shouldProcess || currentQueue.length === 0) return;

    const queueToProcess = currentQueue.sort((a, b) => a.priority - b.priority);

    try {
      const chainsToSkip = new Set<SupportedChainId>();
      for (const operation of queueToProcess) {
        if (!processingRef.current) break;
        if (chainsToSkip.has(operation.chainId)) continue;

        try {
          await executeChainOperation(
            operation.chainId,
            operation.type,
            operation.amount
          );
          safeSetState((p) => ({
            ...p,
            operationQueue: p.operationQueue.filter(
              (op) => op.id !== operation.id
            ),
          }));
        } catch (e) {
          console.error(`Queue operation failed for ${operation.chainId}:`, e);
          // If approval fails, skip subsequent operations for this chain
          if (operation.type === "approval") {
            chainsToSkip.add(operation.chainId);
          }
          safeSetState((p) => ({
            ...p,
            operationQueue: p.operationQueue.filter(
              (op) =>
                op.id !== operation.id &&
                !(
                  operation.type === "approval" &&
                  op.chainId === operation.chainId &&
                  op.type === "deposit"
                )
            ),
          }));
        }
      }
    } finally {
      safeSetState((p) => ({ ...p, isProcessingQueue: false }));
      processingRef.current = false;
    }
  }, [executeChainOperation, safeSetState]);

  const processQueueRef = useRef(processQueue);
  processQueueRef.current = processQueue;

  // Debounced queue processing to prevent rapid successive calls
  const debouncedProcessQueue = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !processingRef.current) {
        void processQueueRef.current();
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (!state.isProcessingQueue && state.operationQueue.length > 0) {
      debouncedProcessQueue();
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [
    state.isProcessingQueue,
    state.operationQueue.length,
    debouncedProcessQueue,
  ]);

  const clearQueue = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    safeSetState((prev) => ({ ...prev, operationQueue: [] }));
  }, [safeSetState]);

  const cancelQueue = useCallback(() => {
    processingRef.current = false;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    safeSetState((prev) => ({
      ...prev,
      operationQueue: [],
      isProcessingQueue: false,
      inFlightChainId: null,
    }));
  }, [safeSetState]);

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
