import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { persist } from "zustand/middleware";
import type { Hash } from "viem";

import { SupportedChainId } from "@/constant/chains";

type OperationType = "approval" | "deposit" | "confirming";

interface ChainTransactions {
  approvalTxHash?: Hash;
  depositTxHash?: Hash;
  approvalConfirmedTxHash?: Hash;
  depositConfirmedTxHash?: Hash;
  lastApprovedAmount?: string;
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

interface QueueConfig {
  concurrency?: number;
  interval?: number;
  intervalCap?: number;
}

interface OperationsState {
  chainOperations: Record<SupportedChainId, ChainOperationState>;
  chainTransactions: Record<SupportedChainId, ChainTransactions>;
  operationQueue: ChainOperation[];
  isProcessingQueue: boolean;
  inFlightChainId: SupportedChainId | null;
  queueConfig: QueueConfig;
}

interface OperationsActions {
  setChainOperationState: (
    chainId: SupportedChainId,
    type: OperationType,
    txHash?: Hash | null
  ) => void;
  setChainError: (
    chainId: SupportedChainId,
    error: string,
    isUserCancellation?: boolean
  ) => void;
  setChainCompleted: (
    chainId: SupportedChainId,
    operationType: "approval" | "deposit",
    txHash: Hash
  ) => void;
  clearChainError: (chainId: SupportedChainId) => void;
  clearAllErrors: () => void;
  storeTransactionHash: (
    chainId: SupportedChainId,
    type: OperationType,
    txHash: Hash
  ) => void;
  storeConfirmedTransactionHash: (
    chainId: SupportedChainId,
    type: OperationType,
    txHash: Hash
  ) => void;
  clearTransactionHash: (
    chainId: SupportedChainId,
    type: OperationType
  ) => void;
  setLastApprovedAmount: (chainId: SupportedChainId, amount: bigint) => void;
  addToQueue: (operation: ChainOperation) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  setProcessingState: (isProcessing: boolean) => void;
  setInFlightChainId: (chainId: SupportedChainId | null) => void;
  updateQueueConfig: (config: Partial<QueueConfig>) => void;
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
export const useChainState = (chainId: SupportedChainId) =>
  useOperationsStore(
    (state) => state.chainOperations[chainId] || DEFAULT_CHAIN_STATE
  );

export const useChainTransactions = (chainId: SupportedChainId) =>
  useOperationsStore(
    (state) => state.chainTransactions[chainId] || DEFAULT_CHAIN_TRANSACTIONS
  );

export const useIsChainOperating = (chainId: SupportedChainId) =>
  useOperationsStore(
    (state) => state.chainOperations[chainId]?.isOperating || false
  );

export const useIsAnyChainOperating = () =>
  useOperationsStore((state) =>
    Object.values(state.chainOperations).some(
      (chainState) => chainState.isOperating
    )
  );

export const useQueueLength = () =>
  useOperationsStore((state) => state.operationQueue.length);

export const useIsProcessingQueue = () =>
  useOperationsStore((state) => state.isProcessingQueue);

export const useInFlightChainId = () =>
  useOperationsStore((state) => state.inFlightChainId);

// Computed selectors
export const getChainState = (chainId: SupportedChainId) => {
  const state = useOperationsStore.getState();
  return state.chainOperations[chainId] || DEFAULT_CHAIN_STATE;
};

export const getChainTransactions = (chainId: SupportedChainId) => {
  const state = useOperationsStore.getState();
  return state.chainTransactions[chainId] || DEFAULT_CHAIN_TRANSACTIONS;
};

export const isChainOperating = (chainId: SupportedChainId) => {
  const state = useOperationsStore.getState();
  return state.chainOperations[chainId]?.isOperating || false;
};

export const isAnyChainOperating = () => {
  const state = useOperationsStore.getState();
  return Object.values(state.chainOperations).some(
    (chainState) => chainState.isOperating
  );
};
