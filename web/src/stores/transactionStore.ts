import { create } from "zustand";
import { persist } from "zustand/middleware";
import { logger } from "@/lib/logger";

export interface Transaction {
  id: string;
  hash: string;
  type: "deposit" | "withdrawal" | "approval";
  status: "pending" | "confirmed" | "failed" | "cancelled";
  amount?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  chainId: number;
  timestamp: number;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  to?: string;
  from?: string;
  error?: string;
}

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
}

interface TransactionActions {
  addTransaction: (
    transaction: Omit<Transaction, "id"> & { timestamp?: number }
  ) => string;
  setLoading: (loading: boolean) => void;
  clearHistory: () => void;
}

type TransactionStore = TransactionState & TransactionActions;

// UUID helper with fallback for environments lacking crypto.randomUUID
function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      // @ts-ignore - runtime guard ensures existence
      return crypto.randomUUID();
    }
  } catch (_) {
    // ignore and fall through to fallback
  }
  // Fallback RFC4122-ish v4 (not cryptographically strong but sufficient for IDs)
  const tpl = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return tpl.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useTransactionStore = create<TransactionStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      isLoading: false,

      addTransaction: (
        transaction: Omit<Transaction, "id"> & { timestamp?: number }
      ): string => {
        const { hash, chainId } = transaction;
        const newTransaction: Transaction = {
          ...transaction,
          id: generateId(),
          timestamp: transaction.timestamp || Date.now(),
        };

        set((state: TransactionState) => {
          const existingIndex = state.transactions.findIndex(
            (tx: Transaction) => tx.hash === hash && tx.chainId === chainId
          );

          if (existingIndex >= 0) {
            const updatedTransactions = [...state.transactions];
            updatedTransactions[existingIndex] = {
              ...updatedTransactions[existingIndex],
              ...newTransaction,
              id: updatedTransactions[existingIndex].id,
            };
            logger.info("Transaction updated in store", {
              key: `${hash}:${chainId}`,
              type: newTransaction.type,
            });
            return { transactions: updatedTransactions };
          }

          const updatedTransactions = [newTransaction, ...state.transactions];
          logger.info("Transaction added to store", {
            key: `${hash}:${chainId}`,
            type: newTransaction.type,
            chainId: newTransaction.chainId,
          });
          return { transactions: updatedTransactions };
        });

        return newTransaction.id;
      },

      setLoading: (loading: boolean): void => set({ isLoading: loading }),

      clearHistory: (): void => {
        set({ transactions: [] });
        logger.info("Transaction history cleared from store");
      },
    }),
    {
      name: "argenta-transaction-store",
      partialize: (state: TransactionStore) => ({
        transactions: state.transactions,
      }),
    }
  )
);
