"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  isSupportedChainId,
  SupportedChainId,
  SUPPORTED_CHAINS,
} from "@/constant/chains";

import { useBatchDepositValidation } from "@/hooks";
import { useBatchDeposit } from "@/hooks/useBatchDeposit";
import { useInputValidation } from "@/hooks/useInputValidation";
import { OperationTabs } from "./OperationTabs";
import { DepositInputV2 } from "./ui/DepositInputV2";
import { BatchOperationProgress } from "./BatchOperationProgress";
import { PortfolioTabs } from "./PortfolioTabs";
import { TransactionHistory } from "./TransactionHistory";
import { OperationType } from "@/types/ui-state";
import { OPERATION_TYPES } from "@/constant/operation-constants";
import { createComponentLogger } from "@/lib/logger";
import { UserWelcomeHeader, VaultEmptyState } from "./ui";

const logger = createComponentLogger("Dashboard");

export function Dashboard() {
  const { address } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();

  // Operation state
  const [activeTab, setActiveTab] = useState<OperationType>(
    OPERATION_TYPES.DEPOSIT
  );
  const [portfolioTab, setPortfolioTab] = useState<"summary" | "breakdown">(
    "summary"
  );

  const [selectedChainId, setSelectedChainId] = useState<SupportedChainId>(
    isSupportedChainId(chainId) ? chainId : SupportedChainId.ETH_SEPOLIA
  );

  const {
    batchState,
    updateAmount: updateDepositAmount,
    setMaxAmount: setDepositMaxAmount,
    clearAll: clearDepositAmounts,
  } = useBatchDepositValidation();

  // Simple input validation
  const inputsForValidation = SUPPORTED_CHAINS.map((chainId) => ({
    chainId,
    amount: batchState.inputs[chainId] || "",
  }));

  const {
    validChains,
    canProceed,
    isLoading: _validationLoading,
  } = useInputValidation(inputsForValidation);

  const {
    executeBatch,
    retryChain,
    cancel: cancelDeposit,
    reset: resetDeposit,
    isExecuting,
    results: depositResults,
    error: depositError,
    progress: depositProgress,
  } = useBatchDeposit();

  const [showDepositProgress, setShowDepositProgress] = useState(false);
  const [depositCompletedSuccessfully, setDepositCompletedSuccessfully] =
    useState(false);
  const [_executeLocked, setExecuteLocked] = useState(false);

  const [lastAttemptedAmounts, setLastAttemptedAmounts] = useState<
    Record<SupportedChainId, string>
  >(() =>
    SUPPORTED_CHAINS.reduce((acc, id) => {
      acc[id] = "";
      return acc;
    }, {} as Record<SupportedChainId, string>)
  );

  // Auto-show progress when execution starts
  useEffect(() => {
    if (isExecuting) {
      setShowDepositProgress(true);
      setDepositCompletedSuccessfully(false);
    }
  }, [isExecuting]);

  // Handle completion
  useEffect(() => {
    if (!isExecuting && depositResults.length > 0) {
      setDepositCompletedSuccessfully(!depositError);
      // Lock execute only if there were issues
      const hasFailures = depositResults.some((r) => r.status !== "success");
      setExecuteLocked(hasFailures);

      if (!depositError) {
        const hasSuccessfulDeposits = depositResults.some(
          (result) => result.status === "success"
        );

        if (hasSuccessfulDeposits) {
          queryClient.invalidateQueries({
            predicate: (q) => (q as any).meta?.scopeKey === "balances",
          });

          logger.debug("Invalidated balance queries after successful deposits");
        }
      }
    }
  }, [isExecuting, depositResults.length, depositError, queryClient]);

  // Keep selectedChainId in sync especially when switching from the nav
  useEffect(() => {
    if (isSupportedChainId(chainId)) {
      setSelectedChainId(chainId);
    }
  }, [chainId]);

  const handleRetryChain = async (chainId: number) => {
    const amount =
      batchState.inputs[chainId as SupportedChainId] ||
      lastAttemptedAmounts[chainId as SupportedChainId];
    if (!amount) return;

    try {
      // Ensure modal is visible when retrying
      setShowDepositProgress(true);
      const result = await retryChain(chainId as SupportedChainId, amount);
      logger.debug(`Retry completed for chain ${chainId}:`, result);

      if (result.status === "success") {
        queryClient.invalidateQueries({
          predicate: (q) => (q as any).meta?.scopeKey === "balances",
        });

        logger.debug(
          `Invalidated balance queries after successful retry for chain ${chainId}`
        );
      }

      // The result will be automatically updated via the event listeners
      // TODO:: maybe add TOASTTT
    } catch (error) {
      logger.error(`Retry failed for chain ${chainId}:`, error);
    }
  };

  const handleUnifiedDeposit = async () => {
    if (!canProceed || validChains.length === 0) {
      logger.warn("Cannot proceed - validation failed or no valid chains");
      return;
    }

    logger.debug("Starting deposit for", validChains.length, "chains");

    // Convert validated chains to execution format
    const chainAmounts = validChains.map(({ chainId, amount, amountWei }) => ({
      chainId,
      amount,
      amountWei,
    }));

    logger.debug("Final chainAmounts:", chainAmounts);

    try {
      await executeBatch(chainAmounts);
      logger.debug("Deposit initiated successfully");
    } catch (error) {
      logger.error("Failed to start deposit:", error);
    }
  };

  const handleRetryAllFailed = async () => {
    setShowDepositProgress(true);
    const failedOrPartial = depositResults.filter(
      (r) =>
        r.status === "failed" ||
        r.status === "partial" ||
        r.status === "cancelled"
    );
    if (failedOrPartial.length === 0) return;

    for (const r of failedOrPartial) {
      const amount =
        batchState.inputs[r.chainId as SupportedChainId] ||
        lastAttemptedAmounts[r.chainId as SupportedChainId];
      if (!amount) continue;
      try {
        const result = await retryChain(r.chainId as SupportedChainId, amount);
        logger.debug(`Retry-all: chain ${r.chainId} -> ${result.status}`);
        if (result.status === "success") {
          queryClient.invalidateQueries({
            predicate: (q) => (q as any).meta?.scopeKey === "balances",
          });
        }
      } catch (err) {
        logger.error(`Retry-all: chain ${r.chainId} failed`, err);
      }
    }
  };

  const _handleResetAll = () => {
    try {
      cancelDeposit();
    } catch {}
    resetDeposit();
    clearDepositAmounts();
    setShowDepositProgress(false);
    setDepositCompletedSuccessfully(false);
    setExecuteLocked(false);
    setLastAttemptedAmounts(() =>
      SUPPORTED_CHAINS.reduce((acc, id) => {
        acc[id] = "";
        return acc;
      }, {} as Record<SupportedChainId, string>)
    );
  };

  const _handleWithdraw = () => {
    // logger.debug(
    //   "Withdraw:",
    //   withdrawAmount,
    //   "USDC from",
    //   getChainName(selectedChainId)
    // );
    // TODO: Implement withdraw logic
  };

  if (!address) {
    return <VaultEmptyState />;
  }

  return (
    <div className="w-full">
      <div className="grid gap-6 sm:gap-8 md:gap-10 bg-teal-500/10 px-3 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
        <UserWelcomeHeader address={address} chainId={selectedChainId} />

        <PortfolioTabs activeTab={portfolioTab} onTabChange={setPortfolioTab} />
        <OperationTabs activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === OPERATION_TYPES.DEPOSIT ? (
            <div className="space-y-4">
              <DepositInputV2
                inputs={batchState.inputs}
                onAmountChange={updateDepositAmount}
                onMaxClick={setDepositMaxAmount}
                onExecuteDeposit={handleUnifiedDeposit}
                disabled={
                  isExecuting || depositProgress.isRetrying || !canProceed
                }
                isProcessing={isExecuting || depositProgress.isRetrying}
                selectedChainId={selectedChainId}
              />
            </div>
          ) : (
            <div className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-gray-900/30 to-gray-800/20 backdrop-blur-sm">
              <div className="relative z-10 p-8 sm:p-12 text-center space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-mono font-semibold text-white uppercase tracking-wide">
                      Withdraw Feature
                    </h3>
                    <p className="text-teal-400 text-sm font-mono uppercase tracking-wide">
                      Coming Soon
                    </p>
                  </div>
                </div>

                <div className="space-y-3 max-w-sm mx-auto">
                  <p className="text-gray-400 text-sm leading-relaxed">
                    We're working hard to bring you secure and efficient
                    withdrawal functionality.
                  </p>
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-xs text-gray-500 font-mono uppercase tracking-wide">
                      Continue depositing to your vault
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </OperationTabs>
        {showDepositProgress && (
          <BatchOperationProgress
            progress={{
              percentage: depositProgress.percentage,
              totalSteps: depositProgress.total,
              currentStep: depositProgress.completed + 1,
              currentChain: depositProgress.currentChain,
              currentOperation: depositProgress.currentOperation,
              chainStatuses: depositResults.map((result) => ({
                chainId: result.chainId,
                status:
                  result.status === "success"
                    ? "completed"
                    : result.status === "cancelled"
                    ? "failed"
                    : result.status === "partial"
                    ? "partial"
                    : result.status === "retrying"
                    ? "retrying"
                    : "failed",

                canRetry:
                  !isExecuting &&
                  !depositProgress.isRetrying &&
                  (result.status === "cancelled" ||
                    result.status === "partial" ||
                    (result.status === "failed" && !result.userCancelled)),
                error: result.status === "retrying" ? undefined : result.error,
                approveTxHash: result.approvalTxHash,
                depositTxHash: result.depositTxHash,
              })),
              isComplete:
                !depositProgress.isRetrying &&
                !isExecuting &&
                depositResults.length > 0,
              hasFailures: depositResults.some((r) => r.status !== "success"),
              batchCompletedSuccessfully: depositCompletedSuccessfully,
              isRetrying: depositProgress.isRetrying,
              retryingChainId: depositProgress.retryingChainId ?? null,
            }}
            onRetryChain={handleRetryChain}
            onRetryAllFailed={handleRetryAllFailed}
            onDismiss={() => {
              setShowDepositProgress(false);
            }}
            onClose={() => {
              setShowDepositProgress(false);
              setDepositCompletedSuccessfully(false);
              clearDepositAmounts();
              // For all-success, allow next execute immediately
              setExecuteLocked(false);
            }}
            onCancelBatch={() => {
              cancelDeposit();
              setShowDepositProgress(false);
              setDepositCompletedSuccessfully(false);
            }}
          />
        )}

        {!showDepositProgress &&
          (isExecuting ||
            depositProgress.isRetrying ||
            depositResults.length > 0) && (
            <button
              onClick={() => setShowDepositProgress(true)}
              className="fixed bottom-4 right-4 z-40 px-4 py-3 shadow-lg border border-teal-500/40 bg-gradient-to-br from-gray-900/95 to-gray-800/90 backdrop-blur-md text-teal-300 hover:text-white hover:from-gray-800 hover:to-gray-700 transition-colors font-mono text-xs uppercase tracking-wide flex items-center gap-3 rounded-lg max-w-[70vw]"
            >
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Batch Operation
                </span>
                {isExecuting || depositProgress.isRetrying ? (
                  <span>
                    {Math.round(depositProgress.percentage)}% in progress
                  </span>
                ) : (
                  <span>
                    {depositResults.every((r) => r.status === "success")
                      ? "Completed"
                      : "Completed (with issues)"}
                  </span>
                )}
              </div>
            </button>
          )}

        <div className="border-t border-white/10 pt-6">
          <TransactionHistory />
        </div>
      </div>
    </div>
  );
}
