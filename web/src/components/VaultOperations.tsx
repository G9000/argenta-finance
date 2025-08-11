"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import {
  getChainName,
  isSupportedChainId,
  SupportedChainId,
  USDC_DECIMALS,
  getUsdcAddress,
  getVaultAddress,
} from "@/constant/contracts";
import { formatBalance } from "@/lib/format";
import { parseAmountToBigInt } from "@/lib/vault-operations";
import {
  useChainBalances,
  useOperationValidation,
  useBatchDepositValidation,
} from "@/hooks";
import { useBatchDeposit } from "@/hooks/useBatchDeposit";
import { BalanceDisplay } from "./BalanceDisplay";
import { OperationInput } from "./OperationInput";
import { OperationTabs } from "./OperationTabs";
import { DepositInput } from "./DepositInput";
import { BatchOperationProgress } from "./BatchOperationProgress";
import { PortfolioTabs } from "./PortfolioTabs";
import { getTokenLogo } from "@/lib/tokens";
import { OperationType } from "@/types/ui-state";
import { OPERATION_TYPES } from "@/constant/operation-constants";
import { createComponentLogger } from "@/lib/logger";
import { UserWelcomeHeader, DebugInfo } from "./ui";

const logger = createComponentLogger("VaultOperations");

export function VaultOperations() {
  const { address } = useAccount();
  const chainId = useChainId();

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

  const [isClient, setIsClient] = useState(false);

  // Unified deposit validation (replaces both single and batch validation)
  const {
    batchState,
    updateAmount: updateDepositAmount,
    setMaxAmount: setDepositMaxAmount,
    clearAll: clearDepositAmounts,
    getValidChainAmounts,
  } = useBatchDepositValidation();

  // Unified deposit service (handles both single and multi-chain)
  const {
    executeBatch,
    retryChain,
    cancel: cancelDeposit,
    isExecuting,
    results: depositResults,
    error: depositError,
    progress: depositProgress,
  } = useBatchDeposit();

  // UI state
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
    }
  }, [isExecuting, depositResults.length, depositError]);

  // Keep selectedChainId in sync especially when switching from the nav
  useEffect(() => {
    if (isSupportedChainId(chainId)) {
      setSelectedChainId(chainId);
    }
  }, [chainId]);

  // Track client-side mounting to prevent hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

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
    // Get the amount from the batch state inputs
    const amount = batchState.inputs[chainId as SupportedChainId];
    if (!amount) return;

    try {
      const result = await retryChain(chainId as SupportedChainId, amount);
      logger.debug(`Retry completed for chain ${chainId}:`, result);
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

        {/* Portfolio Tabs */}
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

              {isClient && (
                <DebugInfo
                  items={{
                    "Your wallet": address,
                    "USDC contract": getUsdcAddress(selectedChainId),
                    "Vault contract": getVaultAddress(selectedChainId),
                    Chain: getChainName(selectedChainId),
                  }}
                />
              )}
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
                    ? "partial" // Partial: approval succeeded, deposit cancelled
                    : result.status === "retrying"
                    ? "retrying"
                    : "failed",
                // Disable retry UI while batch still running or another retry active
                canRetry:
                  !isExecuting &&
                  !depositProgress.isRetrying &&
                  (result.status === "cancelled" ||
                    result.status === "partial" || // allow retry of deposit
                    (result.status === "failed" && !result.userCancelled)),
                error: result.status === "retrying" ? undefined : result.error,
                approveTxHash: result.approvalTxHash,
                depositTxHash: result.depositTxHash,
              })),
              // If a retry is underway, force not-complete so step bar shows
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
              setShowDepositProgress(false);
              setDepositCompletedSuccessfully(false);
              clearDepositAmounts();
            }}
            onCancelBatch={() => {
              cancelDeposit();
              setShowDepositProgress(false);
              setDepositCompletedSuccessfully(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
