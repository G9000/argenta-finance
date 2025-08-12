/**
 * React hook for managing multi-chain batch deposit operations.
 *
 * This hook provides a high-level interface for executing, retrying, and cancelling batch deposits
 * across multiple chains, with real-time progress tracking and error handling. It wraps the batch deposit service
 * and exposes its main operations, while also managing UI state for progress, results, and errors.
 *
 * Features:
 * - Initializes the batch deposit service when a wallet address is available.
 * - Subscribes to service events to update UI state (progress, results, errors).
 * - Provides executeBatch to start a batch deposit across chains.
 * - Provides retryChain to retry a failed/cancelled chain operation.
 * - Provides cancel to abort an in-progress batch operation.
 * - Tracks current progress, active chain, operation type, and retry state.
 *
 * @returns {UseBatchDepositReturn} Object containing service instance, main operations, state, and progress info.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import {
  createBatchDepositService,
  type BatchDepositService,
} from "@/lib/batch-deposit-service";
import type {
  ChainAmount,
  BatchDepositResult,
  BatchTransactionType,
} from "@/types/batch-operations";
import { SupportedChainId } from "@/constant/contracts";
import { BATCH_MESSAGES } from "@/constant/batch-messages";

export interface UseBatchDepositReturn {
  service: BatchDepositService | null;
  executeBatch: (chainAmounts: ChainAmount[]) => Promise<BatchDepositResult[]>;
  retryChain: (
    chainId: SupportedChainId,
    amount: string
  ) => Promise<BatchDepositResult>;
  cancel: () => void;
  reset: () => void;
  isExecuting: boolean;
  results: BatchDepositResult[];
  error: string | null;
  progress: {
    completed: number;
    total: number;
    percentage: number;
    currentChain?: SupportedChainId;
    currentOperation?: BatchTransactionType;
    isRetrying?: boolean;
    retryingChainId?: SupportedChainId | null;
  };
}

export function useBatchDeposit(): UseBatchDepositReturn {
  /**
   * The batch deposit service instance, or null if not initialized.
   */
  const { address } = useAccount();

  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<BatchDepositResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    percentage: 0,
  });

  const [currentChain, setCurrentChain] = useState<
    SupportedChainId | undefined
  >();

  const [currentOperation, setCurrentOperation] = useState<
    BatchTransactionType | undefined
  >();

  const [retryActiveChain, setRetryActiveChain] =
    useState<SupportedChainId | null>(null);

  const [serviceInitTick, setServiceInitTick] = useState(0);

  // ref to avoid losing in-flight batch state
  const serviceRef = useRef<BatchDepositService | null>(null);

  // Initialize service when address is available
  useEffect(() => {
    if (!address) {
      serviceRef.current = null;
      return;
    }
    if (!serviceRef.current) {
      try {
        serviceRef.current = createBatchDepositService();
        setServiceInitTick((t) => t + 1);
      } catch (error) {
        console.error("Failed to create batch deposit service:", error);
        setError(
          error instanceof Error
            ? error.message
            : BATCH_MESSAGES.ERRORS.SERVICE_INITIALIZATION_FAILED
        );
      }
    }
  }, [address]);

  const service = serviceRef.current;

  // Subscribe to service events
  useEffect(() => {
    if (!service) return;

    const handleBatchStarted = () => {
      setIsExecuting(true);
      setError(null);
      setResults([]);
      setProgress({ completed: 0, total: 0, percentage: 0 });
      setCurrentChain(undefined);
      setCurrentOperation(undefined);
    };

    const handleBatchCompleted = ({
      results,
    }: {
      results: BatchDepositResult[];
    }) => {
      setIsExecuting(false);
      setResults(results);
      setCurrentChain(undefined);
      setCurrentOperation(undefined);
    };

    const handleBatchFailed = ({ error }: { error: string }) => {
      setIsExecuting(false);
      setError(error);
    };

    const handleProgressUpdated = (progressData: {
      completed: number;
      total: number;
      percentage: number;
    }) => {
      setProgress(progressData);
    };

    const handleChainCompleted = ({
      result,
    }: {
      chainId: SupportedChainId;
      result: BatchDepositResult;
    }) => {
      setResults((prev) => {
        const existing = prev.find((r) => r.chainId === result.chainId);
        const merged: BatchDepositResult = existing
          ? {
              ...result,
              // Preserve previous approvalTxHash if retry skipped approval
              approvalTxHash:
                result.approvalTxHash || existing.approvalTxHash || undefined,
            }
          : result;
        const filtered = prev.filter((r) => r.chainId !== result.chainId);
        return [...filtered, merged];
      });
      // If this was a retry chain, clear retry mode
      if (retryActiveChain === result.chainId) setRetryActiveChain(null);
    };

    const handleChainFailed = ({
      chainId,
      error,
    }: {
      chainId: SupportedChainId;
      error: string;
    }) => {
      setResults((prev) => {
        const existing = prev.find((r) => r.chainId === chainId);
        const failedResult: BatchDepositResult = {
          chainId,
          status: "failed",
          error,
          startedAt: existing?.startedAt || Date.now(),
          completedAt: Date.now(),
          approvalTxHash: existing?.approvalTxHash, // keep approval if had one
        } as BatchDepositResult;
        const filtered = prev.filter((r) => r.chainId !== chainId);
        return [...filtered, failedResult];
      });
      if (retryActiveChain === chainId) {
        setRetryActiveChain(null);
      }
    };

    const handleStepStarted = ({
      chainId,
      step,
      chainStep,
      chainTotal,
    }: {
      chainId: SupportedChainId;
      step: "switching" | "approving" | "depositing";
      chainStep: number;
      chainTotal: number;
    }) => {
      setCurrentChain(chainId);
      setCurrentOperation(
        step === "approving"
          ? "approval"
          : step === "depositing"
          ? "deposit"
          : undefined
      );
      // if retry is active, set by retryChain update progress using local 3-step model
      if (retryActiveChain === chainId) {
        setProgress({
          completed: chainStep - 1,
          total: chainTotal,
          percentage: Math.round(((chainStep - 1) / chainTotal) * 10000) / 100,
        });
      }
    };

    const handleStepCompleted = ({
      chainId,
      chainStep,
      chainTotal,
    }: {
      chainId: SupportedChainId;
      chainStep: number;
      chainTotal: number;
    }) => {
      if (retryActiveChain === chainId) {
        setProgress({
          completed: chainStep,
          total: chainTotal,
          percentage: Math.round((chainStep / chainTotal) * 10000) / 100,
        });
      }
    };

    // subscribe to events
    service.on("batchStarted", handleBatchStarted);
    service.on("batchCompleted", handleBatchCompleted);
    service.on("batchFailed", handleBatchFailed);
    service.on("progressUpdated", handleProgressUpdated);
    service.on("chainCompleted", handleChainCompleted);
    service.on("chainFailed", handleChainFailed);
    service.on("stepStarted", handleStepStarted);
    service.on("stepCompleted", handleStepCompleted);

    return () => {
      service.off("batchStarted", handleBatchStarted);
      service.off("batchCompleted", handleBatchCompleted);
      service.off("batchFailed", handleBatchFailed);
      service.off("progressUpdated", handleProgressUpdated);
      service.off("chainCompleted", handleChainCompleted);
      service.off("chainFailed", handleChainFailed);
      service.off("stepStarted", handleStepStarted);
      service.off("stepCompleted", handleStepCompleted);
    };
  }, [service, serviceInitTick, retryActiveChain]);

  const executeBatch = useCallback(
    async (chainAmounts: ChainAmount[]) => {
      // lazy init if somehow not ready yet
      /**
       * Executes a batch deposit operation across multiple chains.
       *
       * @param {ChainAmount[]} chainAmounts - Array of chain/amount pairs to deposit.
       * @returns {Promise<BatchDepositResult[]>} Resolves with results for each chain.
       * @throws {Error} If the service is not available or initialization fails.
       */
      if (!serviceRef.current) {
        if (address) {
          try {
            serviceRef.current = createBatchDepositService();
            setServiceInitTick((t) => t + 1);
          } catch {
            throw new Error(BATCH_MESSAGES.ERRORS.SERVICE_NOT_AVAILABLE);
          }
        }
      }
      if (!serviceRef.current) {
        throw new Error(BATCH_MESSAGES.ERRORS.SERVICE_NOT_AVAILABLE);
      }
      return await serviceRef.current.executeBatch(chainAmounts);
    },
    [address]
  );

  const retryChain = useCallback(
    async (chainId: SupportedChainId, amount: string) => {
      /**
       * Retries a failed or cancelled chain deposit operation.
       *
       * @param {SupportedChainId} chainId - The chain to retry.
       * @param {string} amount - The amount to deposit on retry.
       * @returns {Promise<BatchDepositResult>} Resolves with the result for the retried chain.
       * @throws {Error} If another retry is in progress or service is unavailable.
       */
      const svc = serviceRef.current;
      if (!svc) throw new Error(BATCH_MESSAGES.ERRORS.SERVICE_NOT_AVAILABLE);

      // prevent retry if another in progress
      if (retryActiveChain && retryActiveChain !== chainId) {
        throw new Error(
          BATCH_MESSAGES.ERRORS.RETRY_IN_PROGRESS_OTHER(retryActiveChain)
        );
      }
      if (retryActiveChain === chainId) {
        return Promise.reject(
          new Error(
            BATCH_MESSAGES.ERRORS.RETRY_ALREADY_IN_PROGRESS_FOR(chainId)
          )
        );
      }

      // dont reset main execution state for retries, just update the specific chain
      setError(null);

      // update the result to show its retrying
      setResults((prev) =>
        prev.map((result) =>
          result.chainId === chainId
            ? { ...result, status: "retrying", error: undefined }
            : result
        )
      );
      setRetryActiveChain(chainId);

      try {
        const result = await svc.retryChain(chainId, amount);

        // The chainCompleted event will automatically update the result
        // No need to manually update here since the event handler will do it

        return result;
      } catch (error) {
        // The chainFailed event will automatically update with the retry error
        // No need to manually update here since the event handler will do it

        const errorMessage =
          error instanceof Error
            ? error.message
            : BATCH_MESSAGES.ERRORS.RETRY_FAILED;
        setError(errorMessage);
        if (retryActiveChain === chainId) {
          setRetryActiveChain(null);
        }
        throw error;
      }
    },
    [address]
  );

  const cancel = useCallback(() => {
    /**
     * Cancels an in-progress batch deposit operation.
     */
    serviceRef.current?.cancel();
  }, []);

  const reset = useCallback(() => {
    /**
     * Resets local hook state, clearing results and progress.
     */
    setIsExecuting(false);
    setResults([]);
    setError(null);
    setProgress({ completed: 0, total: 0, percentage: 0 });
    setCurrentChain(undefined);
    setCurrentOperation(undefined);
    setRetryActiveChain(null);
  }, []);

  return {
    service,
    executeBatch,
    retryChain,
    cancel,
    reset,
    isExecuting,
    results,
    error,
    progress: {
      ...progress,
      currentChain,
      currentOperation,
      isRetrying: retryActiveChain !== null,
      retryingChainId: retryActiveChain,
    },
  };
}
