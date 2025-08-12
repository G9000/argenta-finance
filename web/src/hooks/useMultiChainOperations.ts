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
  // Single chain operations
  approveChain: (chainId: SupportedChainId, amount: string) => Promise<Hash>;
  depositChain: (chainId: SupportedChainId, amount: string) => Promise<Hash>;
  retryOperation: (chainId: SupportedChainId, amount: string) => Promise<Hash>;

  // Multi-chain operations
  queueApproval: (chainId: SupportedChainId, amount: string) => void;
  queueDeposit: (chainId: SupportedChainId, amount: string) => void;
  queueApprovalAndDeposit: (chainId: SupportedChainId, amount: string) => void;
  queueBatchOperations: (
    chainAmounts: Array<{ chainId: SupportedChainId; amount: string }>
  ) => void;
  processQueue: () => Promise<void>;
  clearQueue: () => void;

  // State accessors
  getChainState: (chainId: SupportedChainId) => ChainOperationState;
  getChainTransactions: (chainId: SupportedChainId) => ChainTransactions;
  isChainOperating: (chainId: SupportedChainId) => boolean;
  isAnyChainOperating: boolean;
  isProcessingQueue: boolean;
  queueLength: number;

  clearError: (chainId: SupportedChainId) => void;
  clearAllErrors: () => void;

  // Queue controls
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
  useEffect(() => {
    return () => {
      mountedRef.current = false;
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
      // mark in-flight
      safeSetState((prev) => ({ ...prev, inFlightChainId: chainId }));

      if (!address) {
        console.error(`[executeChainOperation] ❌ Wallet not connected!`);
        throw new Error("Wallet not connected");
      }

      const { usdcAddress, vaultAddress } = validateChainOperation(chainId);
      const amountWei = parseAmountToBigInt(amount, chainId);

      // switch to the target chain if needed
      await ensureChainSwitch(chainId);

      setChainOperationState(chainId, operationType);

      try {
        const chainConfig = getSupportedChainMeta(chainId);

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

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash,
          chainId,
        });

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
              operationType: null, // Clear operation type to indicate completion
              txHash: hash,
              error: null,
              isUserCancellation: false,
              lastCompleted: operationType,
            },
          },
          inFlightChainId: null,
        }));

        // Invalidate reads so allowance/balances refresh after tx
        try {
          queryClient.invalidateQueries({ queryKey: ["readContract"] });
          queryClient.invalidateQueries({ queryKey: ["readContracts"] });
        } catch {}

        return hash;
      } catch (error) {
        const isUserCancel = isUserRejection(error);
        const errorMessage = isUserCancel
          ? "Transaction cancelled by user"
          : error instanceof Error
          ? error.message
          : `${operationType} failed`;

        setChainError(chainId, errorMessage, isUserCancel);
        safeSetState((prev) => ({
          ...prev,
          chainOperations: {
            ...prev.chainOperations,
            [chainId]: {
              ...prev.chainOperations[chainId],
              lastErrorAt: Date.now(),
            },
          },
          inFlightChainId: null,
        }));
        throw error;
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

  // Single chain operations (compatible with existing API)
  const approveChain = useCallback(
    (chainId: SupportedChainId, amount: string) =>
      executeChainOperation(chainId, "approval", amount),
    [executeChainOperation]
  );

  const depositChain = useCallback(
    (chainId: SupportedChainId, amount: string) =>
      executeChainOperation(chainId, "deposit", amount),
    [executeChainOperation]
  );

  const retryOperation = useCallback(
    async (chainId: SupportedChainId, amount: string): Promise<Hash> => {
      const chainState = getChainState(chainId);

      if (!chainState.error) {
        throw new Error("No failed operation to retry");
      }

      // Clear error before retrying
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

      // Determine operation type based on transaction state
      const transactions = getChainTransactions(chainId);
      const operationType = transactions.approvalConfirmedTxHash
        ? "deposit"
        : "approval";

      return executeChainOperation(chainId, operationType, amount);
    },
    [getChainState, getChainTransactions, executeChainOperation, safeSetState]
  );

  // Queue operations
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
      const approvalId = `approval-${chainId}-${++operationIdRef.current}`;
      const depositId = `deposit-${chainId}-${++operationIdRef.current}`;

      console.log(
        "[queueApprovalAndDeposit] Adding operations for chain",
        chainId,
        "amount",
        amount
      );

      enqueueUnique({
        chainId,
        type: "approval",
        amount,
        priority: 1,
        id: approvalId,
      });
      enqueueUnique({
        chainId,
        type: "deposit",
        amount,
        priority: 2,
        id: depositId,
      });
    },
    [enqueueUnique]
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
    if (processingRef.current) return;

    // Get current state to avoid race conditions
    let currentQueue: ChainOperation[] = [];
    safeSetState((p) => {
      currentQueue = [...p.operationQueue];
      if (currentQueue.length === 0) return p;
      processingRef.current = true;
      return { ...p, isProcessingQueue: true };
    });

    if (currentQueue.length === 0) return;

    const queueToProcess = currentQueue.sort((a, b) => a.priority - b.priority);

    try {
      const chainsToSkip = new Set<SupportedChainId>();
      for (const operation of queueToProcess) {
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
          if (operation.type === "approval")
            chainsToSkip.add(operation.chainId);
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
  }, [executeChainOperation, state.operationQueue, safeSetState]);

  // Auto-start processing whenever items appear in the queue and we're not processing
  const processQueueRef = useRef(processQueue);
  processQueueRef.current = processQueue;

  useEffect(() => {
    if (!state.isProcessingQueue && state.operationQueue.length > 0) {
      // Fire and forget; internal guards prevent double-processing
      void processQueueRef.current();
    }
  }, [state.isProcessingQueue, state.operationQueue.length]);

  const clearQueue = useCallback(() => {
    safeSetState((prev) => ({ ...prev, operationQueue: [] }));
  }, [safeSetState]);

  const cancelQueue = useCallback(() => {
    // Clear only the pending queue; keep current isProcessing flag intact so
    // the active operation can finish naturally. This enables the user to
    // cancel the rest while allowing retry later.
    safeSetState((prev) => ({ ...prev, operationQueue: [] }));
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
    // Single chain operations (backward compatible)
    approveChain,
    depositChain,
    retryOperation,

    // Multi-chain queue operations
    queueApproval,
    queueDeposit,
    queueApprovalAndDeposit,
    queueBatchOperations,
    processQueue,
    clearQueue,

    // State accessors
    getChainState,
    getChainTransactions,
    isChainOperating,
    isAnyChainOperating,
    isProcessingQueue: state.isProcessingQueue,
    queueLength: state.operationQueue.length,

    // Error management
    clearError,
    clearAllErrors,

    // Queue controls
    cancelQueue,
    inFlightChainId: state.inFlightChainId,
  };
}
