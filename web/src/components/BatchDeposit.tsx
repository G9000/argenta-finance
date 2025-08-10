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
import { cn } from "@/lib/utils";
import {
  getCurrentStepLabel,
  getCurrentStepDescription,
} from "@/lib/transaction-steps";
import {
  useChainBalances,
  useOperationValidation,
  useVaultDeposit,
  useBatchDepositValidation,
} from "@/hooks";
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

  const [activeTab, setActiveTab] = useState<OperationType>(
    OPERATION_TYPES.DEPOSIT
  );
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Batch deposit state
  const [showBatchProgress, setShowBatchProgress] = useState(false);
  const [batchProgress, setBatchProgress] = useState<any>(null); // We'll type this properly later

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

  const {
    isOperationActive,
    operationError: depositOperationError,
    isApproving,
    approveTxHash,
    isApprovalConfirmed,
    approveError,
    isDepositing,
    depositTxHash,
    isDepositConfirmed,
    depositError,
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

  const handleBatchDeposit = () => {
    const validAmounts = getValidChainAmounts();
    if (validAmounts.length === 0) return;

    logger.debug("Starting batch deposit for", validAmounts.length, "chains");
    // TODO: Implement actual batch execution logic

    // For now, show mock progress
    setShowBatchProgress(true);
    setBatchProgress({
      totalSteps: validAmounts.length * 2,
      currentStep: 1,
      percentage: 0,
      chainStatuses: validAmounts.map(({ chainId }) => ({
        chainId,
        status: "pending" as const,
        canRetry: false,
      })),
      isComplete: false,
      hasFailures: false,
    });
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
                isProcessing={showBatchProgress && !batchProgress?.isComplete}
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
        {showBatchProgress && batchProgress && (
          <BatchOperationProgress
            progress={batchProgress}
            onDismiss={() => {
              setShowBatchProgress(false);
              setBatchProgress(null);
              clearBatchAmounts();
            }}
            onCancelBatch={() => {
              setShowBatchProgress(false);
              setBatchProgress(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
