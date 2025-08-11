"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  getChainName,
  isSupportedChainId,
  SupportedChainId,
  USDC_DECIMALS,
} from "@/constant/contracts";
import { formatBalance } from "@/lib/format";
import { parseAmountToBigInt } from "@/lib/vault-operations";
import {
  useChainBalances,
  useOperationValidation,
  useBatchDepositValidation,
} from "@/hooks";
import { useBatchDeposit } from "@/hooks/useBatchDeposit";
import { OperationInput } from "./OperationInput";
import { OperationTabs } from "./OperationTabs";
import { DepositInput } from "./DepositInput";
import { BatchOperationProgress } from "./BatchOperationProgress";
import { PortfolioTabs } from "./PortfolioTabs";
import { TransactionHistory } from "./TransactionHistory";
import { OperationType } from "@/types/ui-state";
import { OPERATION_TYPES } from "@/constant/operation-constants";
import { createComponentLogger } from "@/lib/logger";
import { UserWelcomeHeader } from "./ui";

const logger = createComponentLogger("VaultOperations");

export function VaultOperations() {
  const { address } = useAccount();
  const chainId = useChainId();
  const queryClient = useQueryClient();

  // Operation state
  const [activeTab, setActiveTab] = useState<OperationType>(
    OPERATION_TYPES.DEPOSIT
  );
  const [withdrawAmount, setWithdrawAmount] = useState("");
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
    getValidChainAmounts,
  } = useBatchDepositValidation();

  const {
    executeBatch,
    retryChain,
    cancel: cancelDeposit,
    isExecuting,
    results: depositResults,
    error: depositError,
    progress: depositProgress,
  } = useBatchDeposit();

  const [showDepositProgress, setShowDepositProgress] = useState(false);
  const [depositCompletedSuccessfully, setDepositCompletedSuccessfully] =
    useState(false);

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

      if (!depositError) {
        const hasSuccessfulDeposits = depositResults.some(
          (result) => result.status === "success"
        );

        if (hasSuccessfulDeposits) {
          queryClient.invalidateQueries({
            queryKey: ["readContract"],
          });

          queryClient.invalidateQueries({
            queryKey: ["readContracts"],
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

  const {
    walletBalance: {
      data: usdcBalance,
      isLoading: walletLoading,
      error: walletError,
    },
    vaultBalance: {
      data: vaultBalance,
      isLoading: vaultLoading,
      error: vaultError,
    },
  } = useChainBalances({ chainId: selectedChainId });

  const { withdrawValidation } = useOperationValidation({
    depositAmount: "",
    withdrawAmount,
    walletBalance: walletError ? undefined : usdcBalance,
    vaultBalance: vaultError ? undefined : vaultBalance,
    chainId: selectedChainId,
    token: "USDC",
  });

  const handleMaxWithdraw = () => {
    if (vaultBalance) {
      setWithdrawAmount(formatBalance(vaultBalance));
    }
  };

  const handleRetryChain = async (chainId: number) => {
    const amount = batchState.inputs[chainId as SupportedChainId];
    if (!amount) return;

    try {
      const result = await retryChain(chainId as SupportedChainId, amount);
      logger.debug(`Retry completed for chain ${chainId}:`, result);

      if (result.status === "success") {
        queryClient.invalidateQueries({
          queryKey: ["readContract"],
        });

        queryClient.invalidateQueries({
          queryKey: ["readContracts"],
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
    const validAmounts = getValidChainAmounts();
    if (validAmounts.length === 0) return;

    logger.debug("Starting deposit for", validAmounts.length, "chains");

    const chainAmounts: {
      chainId: SupportedChainId;
      amount: string;
      amountWei: bigint;
    }[] = [];
    const parseErrors: {
      chainId: SupportedChainId;
      amount: string;
      reason: string;
    }[] = [];

    for (const { chainId, amount } of validAmounts) {
      try {
        const amountWei = parseAmountToBigInt(amount);
        logger.debug(
          `Parsed amount for chain ${chainId}: ${amount} -> ${amountWei.toString()} wei`
        );
        chainAmounts.push({ chainId, amount, amountWei });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to parse amount for chain ${chainId}:`, reason);
        parseErrors.push({ chainId, amount, reason });
      }
    }

    if (parseErrors.length > 0) {
      const summary = parseErrors
        .map(
          (e) =>
            `chain ${e.chainId}: "${e.amount}" (${e.reason || "parse failed"})`
        )
        .join("; ");
      const aggregatedMessage = `Invalid amount(s) detected: ${summary}`;
      logger.error(aggregatedMessage);
      throw new Error(aggregatedMessage);
    }

    logger.debug("Final chainAmounts:", chainAmounts);

    try {
      await executeBatch(chainAmounts);
      logger.debug("Deposit initiated successfully");
    } catch (error) {
      logger.error("Failed to start deposit:", error);
    }
  };

  const handleWithdraw = () => {
    logger.debug(
      "Withdraw:",
      withdrawAmount,
      "USDC from",
      getChainName(selectedChainId)
    );
    // TODO: Implement withdraw logic
  };

  if (!address) {
    return (
      <div className="text-center text-gray-400 text-sm">
        Connect your wallet to view balances
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid gap-10 bg-teal-500/20 px-4 py-10">
        <UserWelcomeHeader address={address} chainId={selectedChainId} />

        <PortfolioTabs activeTab={portfolioTab} onTabChange={setPortfolioTab} />
        <OperationTabs activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === OPERATION_TYPES.DEPOSIT ? (
            <div className="space-y-4">
              <DepositInput
                batchState={batchState}
                onAmountChange={updateDepositAmount}
                onMaxClick={setDepositMaxAmount}
                onExecuteDeposit={handleUnifiedDeposit}
                disabled={false}
                isProcessing={isExecuting}
                selectedChainId={selectedChainId}
              />
            </div>
          ) : (
            <OperationInput
              type={OPERATION_TYPES.WITHDRAW}
              amount={withdrawAmount}
              onAmountChange={setWithdrawAmount}
              onMaxClick={handleMaxWithdraw}
              onSubmit={handleWithdraw}
              disabled={false}
              token="USDC"
              decimals={USDC_DECIMALS}
              validation={withdrawValidation}
            />
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
            onDismiss={() => {
              // If batch is complete, a dismissal is a true close: clear state.
              const batchIsComplete =
                !depositProgress.isRetrying &&
                !isExecuting &&
                depositResults.length > 0;
              setShowDepositProgress(false);
              if (batchIsComplete) {
                setDepositCompletedSuccessfully(false);
                clearDepositAmounts();
              }
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
            (depositResults.length > 0 &&
              !depositProgress.isRetrying &&
              depositResults.some((r) => r.status !== "success") ===
                false)) && (
            <button
              onClick={() => setShowDepositProgress(true)}
              className="fixed bottom-4 right-4 z-40 px-4 py-3 shadow-lg border border-teal-500/40 bg-gradient-to-br from-gray-900/90 to-gray-800/80 backdrop-blur-sm text-teal-300 hover:text-white hover:from-gray-800 hover:to-gray-700 transition-colors font-mono text-xs uppercase tracking-wide flex items-center gap-3"
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
