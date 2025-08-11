import { useState, useEffect, useCallback, useRef } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useSwitchChain,
} from "wagmi";
import {
  createBatchDepositService,
  type BatchDepositService,
} from "@/lib/batch-deposit-service";
import type {
  ChainAmount,
  BatchDepositResult,
  WagmiDependencies,
  BatchTransactionType,
} from "@/types/batch-operations";
import { SupportedChainId } from "@/constant/contracts";

export interface UseBatchDepositReturn {
  service: BatchDepositService | null;
  executeBatch: (chainAmounts: ChainAmount[]) => Promise<BatchDepositResult[]>;
  retryChain: (
    chainId: SupportedChainId,
    amount: string
  ) => Promise<BatchDepositResult>;
  cancel: () => void;
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
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();

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

  // ref to avoid losing in-flight batch state when publicClient / walletClient objects change on chain switch
  const serviceRef = useRef<BatchDepositService | null>(null);

  // Initialize service when deps are ready. Recreate only on disconnect->reconnect.
  useEffect(() => {
    if (!address) {
      serviceRef.current = null;
      return;
    }
    if (!serviceRef.current && publicClient && walletClient) {
      const wagmiDeps: WagmiDependencies = {
        publicClient,
        walletClient,
        userAddress: address,
        switchChain: (chainId: SupportedChainId) => {
          return new Promise((resolve, reject) => {
            switchChain(
              { chainId },
              {
                onSuccess: () => resolve(),
                onError: reject,
              }
            );
          });
        },
      };
      serviceRef.current = createBatchDepositService(wagmiDeps);
      setServiceInitTick((t) => t + 1);
    }
  }, [address, publicClient, walletClient, switchChain]);

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
      if (!serviceRef.current) {
        if (address && publicClient && walletClient) {
          const wagmiDeps: WagmiDependencies = {
            publicClient,
            walletClient,
            userAddress: address,
            switchChain: (chainId: SupportedChainId) => {
              return new Promise((resolve, reject) => {
                switchChain(
                  { chainId },
                  {
                    onSuccess: () => resolve(),
                    onError: reject,
                  }
                );
              });
            },
          };
          serviceRef.current = createBatchDepositService(wagmiDeps);
          setServiceInitTick((t) => t + 1);
        }
      }
      if (!serviceRef.current) {
        throw new Error("Service not available");
      }
      return await serviceRef.current.executeBatch(chainAmounts);
    },
    [address, publicClient, walletClient, switchChain]
  );

  const retryChain = useCallback(
    async (chainId: SupportedChainId, amount: string) => {
      const svc = serviceRef.current;
      if (!svc) throw new Error("Service not available");

      // prevent retry if another in progress
      if (retryActiveChain && retryActiveChain !== chainId) {
        throw new Error(
          `Another chain (id ${retryActiveChain}) is currently retrying. Please wait for it to finish before retrying this chain.`
        );
      }
      if (retryActiveChain === chainId) {
        return Promise.reject(
          new Error(
            `Retry for chain ${chainId} already in progress; please wait.`
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
          error instanceof Error ? error.message : "Retry failed";
        setError(errorMessage);
        // clear local retry flag if service threw synchronously before events
        if (retryActiveChain === chainId) {
          setRetryActiveChain(null);
        }
        throw error;
      }
    },
    [address]
  );

  const cancel = useCallback(() => {
    serviceRef.current?.cancel();
  }, []);

  return {
    service,
    executeBatch,
    retryChain,
    cancel,
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
