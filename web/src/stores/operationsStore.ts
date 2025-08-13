import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { persist } from "zustand/middleware";
import type { Hash } from "viem";
import { useMemo } from "react";

import { SupportedChainId } from "@/constant/chains";

/**
 * OperationType represents the current phase for a single-chain operation.
 * - "approval": user is signing/submitting an approval (pre-hash)
 * - "deposit": user is signing/submitting a deposit (pre-hash)
 * - "confirming": a tx hash exists and we are waiting for on-chain confirmation.
 *   Also used after a refresh if an unconfirmed hash is found in storage.
 */
type OperationType = "approval" | "deposit" | "confirming";

/**
 * Persisted per-chain transaction artifacts.
 * - approvalTxHash: submitted approval tx (unconfirmed)
 * - approvalConfirmedTxHash: confirmed approval tx
 * - depositTxHash: submitted deposit tx (unconfirmed)
 * - depositConfirmedTxHash: confirmed deposit tx
 * - lastApprovedAmount: last known approved ERC20 amount (string)
 */
interface ChainTransactions {
  approvalTxHash?: Hash;
  depositTxHash?: Hash;
  approvalConfirmedTxHash?: Hash;
  depositConfirmedTxHash?: Hash;
  lastApprovedAmount?: string;
}

/**
 * Ephemeral per-chain operation state driving the UI.
 * - isOperating: true during any active phase (approval/deposit/confirming)
 * - operationType: current phase
 * - txHash: only set during confirming
 * - error: last error message to surface to the user
 * - isUserCancellation: true when wallet interaction was cancelled/rejected
 * - lastCompleted: last successfully completed operation type
 * - lastErrorAt: timestamp to help dedupe error flashes
 */
interface ChainOperationState {
  isOperating: boolean;
  operationType: OperationType | null;
  txHash: Hash | null;
  error: string | null;
  isUserCancellation: boolean;
  lastCompleted?: "approval" | "deposit" | null;
  lastErrorAt?: number;
}

/**
 * Item queued for processing by the multi-chain scheduler.
 * @property chainId Target chain for this operation
 * @property type Operation kind (approval | deposit)
 * @property amount Decimal string amount (USDC, same decimals as chain token)
 * @property priority Higher runs earlier in PQueue
 * @property id Unique queue id
 */
interface ChainOperation {
  chainId: SupportedChainId;
  type: "approval" | "deposit";
  amount: string;
  priority: number;
  id: string;
}

/**
 * Throttling options for the background queue.
 * @property concurrency Max parallel jobs
 * @property interval Window in ms for rate limiting
 * @property intervalCap Max jobs per window
 */
interface QueueConfig {
  concurrency?: number;
  interval?: number;
  intervalCap?: number;
}

/**
 * Root store state for chain operations.
 */
interface OperationsState {
  chainOperations: Record<SupportedChainId, ChainOperationState>;
  chainTransactions: Record<SupportedChainId, ChainTransactions>;
  operationQueue: ChainOperation[];
  isProcessingQueue: boolean;
  inFlightChainId: SupportedChainId | null;
  queueConfig: QueueConfig;
}

/**
 * All mutating actions for the store.
 */
interface OperationsActions {
  /** Mark a chain as operating in a specific phase; optionally attach tx hash when entering confirming. */
  setChainOperationState: (
    chainId: SupportedChainId,
    type: OperationType,
    txHash?: Hash | null
  ) => void;
  /** Record an error and exit operating state. */
  setChainError: (
    chainId: SupportedChainId,
    error: string,
    isUserCancellation?: boolean
  ) => void;
  /** Clear operating state and mark the last completed operation. */
  setChainCompleted: (
    chainId: SupportedChainId,
    operationType: "approval" | "deposit",
    txHash: Hash
  ) => void;
  /** Clear error flags for a chain. */
  clearChainError: (chainId: SupportedChainId) => void;
  /** Clear all chains' error flags. */
  clearAllErrors: () => void;
  /** Store a just-submitted tx hash (unconfirmed). */
  storeTransactionHash: (
    chainId: SupportedChainId,
    type: OperationType,
    txHash: Hash
  ) => void;
  /** Store a confirmed tx hash. */
  storeConfirmedTransactionHash: (
    chainId: SupportedChainId,
    type: OperationType,
    txHash: Hash
  ) => void;
  /** Remove the unconfirmed tx hash for a chain/type. */
  clearTransactionHash: (
    chainId: SupportedChainId,
    type: OperationType
  ) => void;
  /** Track the last approved amount (used to decide if a new approval is needed). */
  setLastApprovedAmount: (chainId: SupportedChainId, amount: bigint) => void;
  /** Enqueue an operation. */
  addToQueue: (operation: ChainOperation) => void;
  /** Remove an operation from the queue by id. */
  removeFromQueue: (id: string) => void;
  /** Clear all queued operations. */
  clearQueue: () => void;
  /** Set whether the queue is processing. */
  setProcessingState: (isProcessing: boolean) => void;
  /** Track the chain currently in wallet flow. */
  setInFlightChainId: (chainId: SupportedChainId | null) => void;
  /** Update queue limits. */
  updateQueueConfig: (config: Partial<QueueConfig>) => void;
  /** On app start/refresh, restore confirming state for unconfirmed tx hashes. */
  reconcilePendingTransactions: () => void;
  /** Reset store to initial state (clears in-memory operational state). */
  reset: () => void;
}

type OperationsStore = OperationsState & OperationsActions;

const DEFAULT_CHAIN_STATE: ChainOperationState = {
  isOperating: false,
  operationType: null,
  txHash: null,
  error: null,
  isUserCancellation: false,
  lastCompleted: null,
};

const DEFAULT_CHAIN_TRANSACTIONS: ChainTransactions = {};

const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  concurrency: Number(process.env.NEXT_PUBLIC_QUEUE_CONCURRENCY) || 1,
  interval: Number(process.env.NEXT_PUBLIC_QUEUE_INTERVAL) || 100,
  intervalCap: Number(process.env.NEXT_PUBLIC_QUEUE_INTERVAL_CAP) || 1,
};

const initialState: OperationsState = {
  chainOperations: {} as Record<SupportedChainId, ChainOperationState>,
  chainTransactions: {} as Record<SupportedChainId, ChainTransactions>,
  operationQueue: [],
  isProcessingQueue: false,
  inFlightChainId: null,
  queueConfig: DEFAULT_QUEUE_CONFIG,
};

export const useOperationsStore = create<OperationsStore>()(
  persist(
    subscribeWithSelector((set, _get) => ({
      ...initialState,

      setChainOperationState: (chainId, type, txHash = null) =>
        set((state) => ({
          ...state,
          chainOperations: {
            ...state.chainOperations,
            [chainId]: {
              ...(state.chainOperations[chainId] || DEFAULT_CHAIN_STATE),
              isOperating: true,
              operationType: type,
              txHash,
              error: null,
              isUserCancellation: false,
            },
          },
        })),

      setChainError: (chainId, error, isUserCancellation = false) =>
        set((state) => ({
          ...state,
          chainOperations: {
            ...state.chainOperations,
            [chainId]: {
              ...(state.chainOperations[chainId] || DEFAULT_CHAIN_STATE),
              isOperating: false,
              error,
              isUserCancellation,
              lastErrorAt: Date.now(),
            },
          },
        })),

      setChainCompleted: (chainId, operationType, txHash) =>
        set((state) => ({
          ...state,
          chainOperations: {
            ...state.chainOperations,
            [chainId]: {
              ...(state.chainOperations[chainId] || DEFAULT_CHAIN_STATE),
              isOperating: false,
              operationType: null,
              txHash,
              error: null,
              isUserCancellation: false,
              lastCompleted: operationType,
            },
          },
        })),

      clearChainError: (chainId) =>
        set((state) => ({
          ...state,
          chainOperations: {
            ...state.chainOperations,
            [chainId]: {
              ...(state.chainOperations[chainId] || DEFAULT_CHAIN_STATE),
              error: null,
              isUserCancellation: false,
            },
          },
        })),

      clearAllErrors: () =>
        set((state) => ({
          ...state,
          chainOperations: Object.keys(state.chainOperations).reduce(
            (acc, chainIdStr) => {
              const chainId = Number(chainIdStr) as SupportedChainId;
              acc[chainId] = {
                ...state.chainOperations[chainId],
                error: null,
                isUserCancellation: false,
              };
              return acc;
            },
            {} as Record<SupportedChainId, ChainOperationState>
          ),
        })),

      storeTransactionHash: (chainId, type, txHash) =>
        set((state) => ({
          ...state,
          chainTransactions: {
            ...state.chainTransactions,
            [chainId]: {
              ...state.chainTransactions[chainId],
              [type === "approval" ? "approvalTxHash" : "depositTxHash"]:
                txHash,
            },
          },
        })),

      storeConfirmedTransactionHash: (chainId, type, txHash) =>
        set((state) => ({
          ...state,
          chainTransactions: {
            ...state.chainTransactions,
            [chainId]: {
              ...state.chainTransactions[chainId],
              [type === "approval"
                ? "approvalConfirmedTxHash"
                : "depositConfirmedTxHash"]: txHash,
            },
          },
        })),

      clearTransactionHash: (chainId, type) =>
        set((state) => {
          const key = type === "approval" ? "approvalTxHash" : "depositTxHash";
          const { [key]: _, ...rest } = state.chainTransactions[chainId] || {};
          return {
            ...state,
            chainTransactions: {
              ...state.chainTransactions,
              [chainId]: rest,
            },
          };
        }),

      setLastApprovedAmount: (chainId, amount) =>
        set((state) => ({
          ...state,
          chainTransactions: {
            ...state.chainTransactions,
            [chainId]: {
              ...state.chainTransactions[chainId],
              lastApprovedAmount: amount.toString(),
            },
          },
        })),

      // Queue management
      addToQueue: (operation) =>
        set((state) => ({
          ...state,
          operationQueue: [...state.operationQueue, operation],
        })),

      removeFromQueue: (id) =>
        set((state) => ({
          ...state,
          operationQueue: state.operationQueue.filter((op) => op.id !== id),
        })),

      clearQueue: () =>
        set((state) => ({
          ...state,
          operationQueue: [],
        })),

      setProcessingState: (isProcessing) =>
        set((state) => ({
          ...state,
          isProcessingQueue: isProcessing,
        })),

      setInFlightChainId: (chainId) =>
        set((state) => ({
          ...state,
          inFlightChainId: chainId,
        })),

      updateQueueConfig: (config) =>
        set((state) => ({
          ...state,
          queueConfig: { ...state.queueConfig, ...config },
        })),

      reconcilePendingTransactions: () =>
        set((state) => {
          const newChainOperations = { ...state.chainOperations };

          // Check each chain for pending transactions
          Object.entries(state.chainTransactions).forEach(
            ([chainIdStr, transactions]) => {
              const chainId = Number(chainIdStr) as SupportedChainId;

              // Check for pending approval
              if (
                transactions.approvalTxHash &&
                !transactions.approvalConfirmedTxHash
              ) {
                newChainOperations[chainId] = {
                  ...(newChainOperations[chainId] || DEFAULT_CHAIN_STATE),
                  isOperating: true,
                  operationType: "confirming",
                  txHash: transactions.approvalTxHash,
                  error: null,
                  isUserCancellation: false,
                };
              }
              // Check for pending deposit (only if no pending approval)
              else if (
                transactions.depositTxHash &&
                !transactions.depositConfirmedTxHash
              ) {
                newChainOperations[chainId] = {
                  ...(newChainOperations[chainId] || DEFAULT_CHAIN_STATE),
                  isOperating: true,
                  operationType: "confirming",
                  txHash: transactions.depositTxHash,
                  error: null,
                  isUserCancellation: false,
                };
              }
            }
          );

          return {
            ...state,
            chainOperations: newChainOperations,
          };
        }),

      reset: () => set(() => ({ ...initialState })),
    })),
    {
      name: "operations-storage",
      partialize: (state) => ({
        operationQueue: state.operationQueue,
        chainTransactions: state.chainTransactions,
        queueConfig: state.queueConfig,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as any),
        chainOperations: {},
        operationQueue: [],
        isProcessingQueue: false,
        inFlightChainId: null,
      }),
    }
  )
);

// Selectors
/**
 * React selector: returns ephemeral operation state for a chain.
 */
export const useChainState = (chainId: SupportedChainId) =>
  useOperationsStore(
    (state) => state.chainOperations[chainId] || DEFAULT_CHAIN_STATE
  );

/**
 * React selector: returns persisted tx artifacts for a chain.
 */
export const useChainTransactions = (chainId: SupportedChainId) =>
  useOperationsStore(
    (state) => state.chainTransactions[chainId] || DEFAULT_CHAIN_TRANSACTIONS
  );

/**
 * React selector: whether a specific chain is currently operating.
 */
export const useIsChainOperating = (chainId: SupportedChainId) =>
  useOperationsStore(
    (state) => state.chainOperations[chainId]?.isOperating || false
  );

/**
 * React selector: true if any chain is operating.
 */
export const useIsAnyChainOperating = () =>
  useOperationsStore((state) =>
    Object.values(state.chainOperations).some(
      (chainState) => chainState.isOperating
    )
  );

/** React selector: length of the queued operations. */
export const useQueueLength = () =>
  useOperationsStore((state) => state.operationQueue.length);

/** React selector: whether the background queue has work. */
export const useIsProcessingQueue = () =>
  useOperationsStore((state) => state.isProcessingQueue);

/** React selector: the chain currently going through wallet flow. */
export const useInFlightChainId = () =>
  useOperationsStore((state) => state.inFlightChainId);

/**
 * React selector: map of chains that have unconfirmed transactions.
 * Returns: { [chainId]: { approvalPending?, depositPending? } }
 */
export const usePendingTransactions = () => {
  const chainTransactions = useOperationsStore(
    (state) => state.chainTransactions
  );
  return useMemo(() => {
    const pendingByChain: Partial<
      Record<
        SupportedChainId,
        {
          approvalPending?: string;
          depositPending?: string;
        }
      >
    > = {};

    Object.entries(chainTransactions).forEach(([chainIdStr, transactions]) => {
      const chainId = Number(chainIdStr) as SupportedChainId;
      const pending: any = {};

      if (
        transactions.approvalTxHash &&
        !transactions.approvalConfirmedTxHash
      ) {
        pending.approvalPending = transactions.approvalTxHash;
      }
      if (transactions.depositTxHash && !transactions.depositConfirmedTxHash) {
        pending.depositPending = transactions.depositTxHash;
      }

      if (Object.keys(pending).length > 0) {
        pendingByChain[chainId] = pending;
      }
    });

    return pendingByChain;
  }, [chainTransactions]);
};

// Chains that have any recorded transaction (pending or confirmed)
// removed useChainsWithAnyTransactions as requested

// Chains where approval succeeded earlier but deposit has not been confirmed yet
/**
 * React selector: chains with confirmed approval but no deposit started/confirmed.
 * Useful to surface "READY TO DEPOSIT" after refresh without user inputs.
 */
export const useApprovedNotDepositedChains = () => {
  const chainTransactions = useOperationsStore(
    (state) => state.chainTransactions
  );
  return useMemo(() => {
    const ids = new Set<SupportedChainId>();
    Object.entries(chainTransactions).forEach(([chainIdStr, t]) => {
      if (
        t.approvalConfirmedTxHash &&
        !t.depositConfirmedTxHash &&
        !t.depositTxHash
      ) {
        ids.add(Number(chainIdStr) as SupportedChainId);
      }
    });
    return ids;
  }, [chainTransactions]);
};

/** React selector: true if there exists any unconfirmed tx (approval or deposit). */
export const useHasPendingTransactions = () => {
  return useOperationsStore((state) => {
    return Object.values(state.chainTransactions).some(
      (transactions) =>
        (transactions.approvalTxHash &&
          !transactions.approvalConfirmedTxHash) ||
        (transactions.depositTxHash && !transactions.depositConfirmedTxHash)
    );
  });
};

// Computed selectors
/** Synchronous getter (non-react) for chain operation state. */
export const getChainState = (chainId: SupportedChainId) => {
  const state = useOperationsStore.getState();
  return state.chainOperations[chainId] || DEFAULT_CHAIN_STATE;
};

/** Synchronous getter (non-react) for chain tx artifacts. */
export const getChainTransactions = (chainId: SupportedChainId) => {
  const state = useOperationsStore.getState();
  return state.chainTransactions[chainId] || DEFAULT_CHAIN_TRANSACTIONS;
};

// Helper to get all pending transactions across chains
/**
 * Synchronous helper: returns map of all chains with unconfirmed tx hashes.
 */
export const getPendingTransactions = () => {
  const state = useOperationsStore.getState();
  const pendingByChain: Partial<
    Record<
      SupportedChainId,
      {
        approvalPending?: string;
        depositPending?: string;
      }
    >
  > = {};

  Object.entries(state.chainTransactions).forEach(
    ([chainIdStr, transactions]) => {
      const chainId = Number(chainIdStr) as SupportedChainId;
      const pending: any = {};

      if (
        transactions.approvalTxHash &&
        !transactions.approvalConfirmedTxHash
      ) {
        pending.approvalPending = transactions.approvalTxHash;
      }
      if (transactions.depositTxHash && !transactions.depositConfirmedTxHash) {
        pending.depositPending = transactions.depositTxHash;
      }

      if (Object.keys(pending).length > 0) {
        pendingByChain[chainId] = pending;
      }
    }
  );

  return pendingByChain;
};

// Initialize reconciliation (call this on app start)
/**
 * Restore confirming state for chains with unconfirmed tx hashes on app start.
 */
export const initializeOperationsStore = () => {
  useOperationsStore.getState().reconcilePendingTransactions();
};

/** Non-react convenience: whether a specific chain is operating. */
export const isChainOperating = (chainId: SupportedChainId) => {
  const state = useOperationsStore.getState();
  return state.chainOperations[chainId]?.isOperating || false;
};

/** Non-react convenience: true if any chain is operating. */
export const isAnyChainOperating = () => {
  const state = useOperationsStore.getState();
  return Object.values(state.chainOperations).some(
    (chainState) => chainState.isOperating
  );
};
