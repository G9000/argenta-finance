"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  getChainName,
  isSupportedChainId,
  SupportedChainId,
  SUPPORTED_CHAINS,
  USDC_DECIMALS,
  getUsdcAddress,
  getVaultAddress,
} from "@/lib/contracts";
import { formatBalance } from "@/lib/format";
import {
  getCurrentStepLabel,
  getCurrentStepDescription,
} from "@/lib/transaction-steps";
import { parseAmountToBigInt } from "@/lib/vault-operations";
import {
  useChainBalances,
  useOperationValidation,
  useVaultDeposit,
  useBatchDepositValidation,
} from "@/hooks";
import { useBatchDeposit } from "@/hooks/useBatchDeposit";
import { BalanceDisplay } from "./BalanceDisplay";
import { OperationInput } from "./OperationInput";
import { OperationTabs } from "./OperationTabs";
import { BatchDepositInput } from "./BatchDepositInput";
import { BatchOperationProgress } from "./BatchOperationProgress";
import { getTokenLogo } from "@/lib/tokens";
import { OPERATION_TYPES, OperationType } from "@/types/operations";
import { createComponentLogger } from "@/lib/logger";
import {
  ChainSelector,
  UserWelcomeHeader,
  TransactionStatus,
  DebugInfo,
} from "./ui";

const logger = createComponentLogger("BatchDeposit");

export function BatchDeposit() {
  const { address } = useAccount();
  const chainId = useChainId();

  // Batch deposit state
  const [activeTab, setActiveTab] = useState<OperationType>(
    OPERATION_TYPES.DEPOSIT
  );
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const [selectedChainId, setSelectedChainId] = useState<SupportedChainId>(
    isSupportedChainId(chainId) ? chainId : SupportedChainId.ETH_SEPOLIA
  );

  const [isClient, setIsClient] = useState(false);

  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Batch deposit validation
  const {
    batchState,
    updateAmount: updateBatchAmount,
    setMaxAmount: setBatchMaxAmount,
    clearAll: clearBatchAmounts,
    getValidChainAmounts,
  } = useBatchDepositValidation();

  // Clean batch deposit service
  const {
    executeBatch,
    retryChain,
    cancel: cancelBatch,
    isExecuting,
    results: batchResults,
    error: batchError,
    progress: batchProgress,
  } = useBatchDeposit();

  // UI state
  const [showBatchProgress, setShowBatchProgress] = useState(false);
  const [batchCompletedSuccessfully, setBatchCompletedSuccessfully] =
    useState(false);

  // Auto-show progress when execution starts
  useEffect(() => {
    if (isExecuting) {
      setShowBatchProgress(true);
      setBatchCompletedSuccessfully(false);
    }
  }, [isExecuting]);

  // Handle completion
  useEffect(() => {
    if (!isExecuting && batchResults.length > 0) {
      setBatchCompletedSuccessfully(!batchError);
    }
  }, [isExecuting, batchResults.length, batchError]);

  const {
    isOperationActive,
    operationError: depositOperationError,
    isApproving,
    approveTxHash,
    isApprovalConfirmed,
    isDepositing,
    depositTxHash,
    isDepositConfirmed,
    currentAllowance,
    progress,
    executeDeposit,
    resetDeposit: resetDepositOperation,
    clearError: clearDepositError,
  } = useVaultDeposit({
    chainId: selectedChainId,
    onDepositComplete: (amount) => {
      logger.debug(`Deposit of ${amount} USDC completed successfully`);
      setDepositAmount("");
    },
    onError: (error) => {
      logger.error("Deposit operation failed:", error);
    },
  });

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

  const { depositValidation, withdrawValidation } = useOperationValidation({
    depositAmount,
    withdrawAmount,
    walletBalance: walletError ? undefined : usdcBalance,
    vaultBalance: vaultError ? undefined : vaultBalance,
    chainId: selectedChainId,
    token: "USDC",
  });

  const handleChainSwitch = (newChainId: SupportedChainId) => {
    if (isSwitching) return;

    setSelectedChainId(newChainId);
    switchChain(
      { chainId: newChainId },
      {
        onError: (error) => {
          logger.error("Failed to switch chain:", error);
          setSelectedChainId(
            isSupportedChainId(chainId) ? chainId : SupportedChainId.ETH_SEPOLIA
          );
        },
      }
    );
  };

  const handleMaxDeposit = () => {
    if (usdcBalance) {
      setDepositAmount(formatBalance(usdcBalance));
      resetDepositOperation();
    }
  };

  const handleDepositAmountChange = (amount: string) => {
    setDepositAmount(amount);
    clearDepositError();
  };

  const handleMaxWithdraw = () => {
    if (vaultBalance) {
      setWithdrawAmount(formatBalance(vaultBalance));
    }
  };

  const handleDeposit = () => {
    executeDeposit(depositAmount);
  };

  const handleRetryChain = async (chainId: number) => {
    // Get the amount from the batch state inputs
    const amount = batchState.inputs[chainId as SupportedChainId];
    if (!amount) return;

    try {
      const result = await retryChain(chainId as SupportedChainId, amount);
      logger.debug(`Retry completed for chain ${chainId}:`, result);
      // The result will be automatically updated via the event listeners
    } catch (error) {
      logger.error(`Retry failed for chain ${chainId}:`, error);
    }
  };

  const handleBatchDeposit = async () => {
    const validAmounts = getValidChainAmounts();
    if (validAmounts.length === 0) return;

    logger.debug("Starting batch deposit for", validAmounts.length, "chains");

    // Convert to ChainAmount format expected by service with proper amount parsing
    const chainAmounts: { chainId: SupportedChainId; amount: string; amountWei: bigint }[] = [];
    const parseErrors: { chainId: SupportedChainId; amount: string; reason: string }[] = [];

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
          (e) => `chain ${e.chainId}: "${e.amount}" (${e.reason || "parse failed"})`
        )
        .join("; ");
      const aggregatedMessage = `Invalid amount(s) detected: ${summary}`;
      logger.error(aggregatedMessage);
      throw new Error(aggregatedMessage);
    }

    logger.debug("Final chainAmounts:", chainAmounts);

    try {
      await executeBatch(chainAmounts);
      logger.debug("Batch deposit initiated successfully");
    } catch (error) {
      logger.error("Failed to start batch deposit:", error);
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
      <ChainSelector
        chains={SUPPORTED_CHAINS}
        selectedChainId={selectedChainId}
        onChainChange={handleChainSwitch}
        isSwitching={isSwitching}
      />

      <div className="grid gap-10 bg-teal-500/20 px-4 py-10">
        <UserWelcomeHeader address={address} chainId={selectedChainId} />

        {address && (
          <BalanceDisplay
            balances={[
              {
                label: "Available USDC Balance",
                value: usdcBalance,
                logo: getTokenLogo("USDC"),
                error: walletError?.message,
                decimals: USDC_DECIMALS,
              },
              {
                label: "USDC in Vault",
                value: vaultBalance,
                logo: getTokenLogo("USDC"),
                error: vaultError?.message,
                decimals: USDC_DECIMALS,
              },
            ]}
            isLoading={isSwitching || walletLoading || vaultLoading}
          />
        )}

        <OperationTabs activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === OPERATION_TYPES.DEPOSIT ? (
            <div className="space-y-4">
              <OperationInput
                type={OPERATION_TYPES.DEPOSIT}
                amount={depositAmount}
                onAmountChange={handleDepositAmountChange}
                onMaxClick={handleMaxDeposit}
                onSubmit={handleDeposit}
                disabled={isSwitching || isOperationActive}
                token="USDC"
                decimals={USDC_DECIMALS}
                validation={depositValidation}
              />

              <TransactionStatus
                isActive={isOperationActive}
                error={depositOperationError}
                progress={
                  isOperationActive && !depositOperationError && progress
                    ? {
                        stepNumber: progress.stepNumber,
                        totalSteps: progress.totalSteps,
                        percentage: progress.percentage,
                        currentStepLabel: getCurrentStepLabel({
                          isApproving,
                          approveTxHash,
                          isApprovalConfirmed,
                          isDepositing,
                          depositTxHash,
                          isDepositConfirmed,
                          selectedChainId,
                          depositAmount,
                        }),
                        description: getCurrentStepDescription({
                          isApproving,
                          approveTxHash,
                          isApprovalConfirmed,
                          isDepositing,
                          depositTxHash,
                          isDepositConfirmed,
                          selectedChainId,
                          depositAmount,
                        }),
                      }
                    : undefined
                }
                onDismissError={clearDepositError}
              />

              {isClient && (
                <DebugInfo
                  items={{
                    "Your wallet": address,
                    "USDC contract": getUsdcAddress(selectedChainId),
                    "Vault contract": getVaultAddress(selectedChainId),
                    "Current allowance": currentAllowance?.toString(),
                    Chain: getChainName(selectedChainId),
                  }}
                />
              )}
            </div>
          ) : activeTab === OPERATION_TYPES.BATCH_DEPOSIT ? (
            <div className="space-y-4">
              <BatchDepositInput
                batchState={batchState}
                onAmountChange={updateBatchAmount}
                onMaxClick={setBatchMaxAmount}
                onExecuteBatch={handleBatchDeposit}
                disabled={isSwitching}
                isProcessing={isExecuting}
              />
            </div>
          ) : (
            <OperationInput
              type={OPERATION_TYPES.WITHDRAW}
              amount={withdrawAmount}
              onAmountChange={setWithdrawAmount}
              onMaxClick={handleMaxWithdraw}
              onSubmit={handleWithdraw}
              disabled={isSwitching}
              token="USDC"
              decimals={USDC_DECIMALS}
              validation={withdrawValidation}
            />
          )}
        </OperationTabs>

        {/* Batch Operation Progress Modal */}
        {showBatchProgress && (
          <BatchOperationProgress
            progress={{
              percentage: batchProgress.percentage,
              totalSteps: batchProgress.total,
              currentStep: batchProgress.completed + 1,
              currentChain: batchProgress.currentChain,
              currentOperation: batchProgress.currentOperation,
              chainStatuses: batchResults.map((result) => ({
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
                  !batchProgress.isRetrying &&
                  (result.status === "cancelled" ||
                    result.status === "partial" || // allow retry of deposit
                    (result.status === "failed" && !result.userCancelled)),
                error: result.status === "retrying" ? undefined : result.error,
                approveTxHash: result.approvalTxHash,
                depositTxHash: result.depositTxHash,
              })),
              // If a retry is underway, force not-complete so step bar shows
              isComplete:
                !batchProgress.isRetrying &&
                !isExecuting &&
                batchResults.length > 0,
              hasFailures: batchResults.some((r) => r.status !== "success"),
              batchCompletedSuccessfully,
              isRetrying: batchProgress.isRetrying,
              retryingChainId: batchProgress.retryingChainId ?? null,
            }}
            onRetryChain={handleRetryChain}
            onDismiss={() => {
              setShowBatchProgress(false);
              setBatchCompletedSuccessfully(false);
              clearBatchAmounts();
            }}
            onCancelBatch={() => {
              cancelBatch();
              setShowBatchProgress(false);
              setBatchCompletedSuccessfully(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
