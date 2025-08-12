"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";

import { isSupportedChainId, SupportedChainId } from "@/constant/chains";
import { parseAmountToBigInt } from "@/lib/vault-operations";
import { useBatchDepositValidation } from "@/hooks";
import { useBatchDeposit } from "@/hooks/useBatchDeposit";
import { OperationTabs } from "./OperationTabs";
import { DepositInputV2 } from "./ui/DepositInputV2";
import { OperationType } from "@/types/ui-state";
import { OPERATION_TYPES } from "@/constant/operation-constants";
import { createComponentLogger } from "@/lib/logger";
import { VaultEmptyState } from "./ui";

const logger = createComponentLogger("Dashboard");

export function DashboardV2() {
  const { address } = useAccount();
  const chainId = useChainId();

  // Operation state
  const [activeTab, setActiveTab] = useState<OperationType>(
    OPERATION_TYPES.DEPOSIT
  );

  const [selectedChainId, setSelectedChainId] = useState<SupportedChainId>(
    isSupportedChainId(chainId) ? chainId : SupportedChainId.ETH_SEPOLIA
  );

  const {
    batchState,
    updateAmount: updateDepositAmount,
    setMaxAmount: setDepositMaxAmount,
    getValidChainAmounts,
  } = useBatchDepositValidation();

  const {
    executeBatch,
    isExecuting,
    results: depositResults,
    progress: depositProgress,
  } = useBatchDeposit();

  const [executeLocked] = useState(false);

  // Keep selectedChainId in sync especially when switching from the nav
  useEffect(() => {
    if (isSupportedChainId(chainId)) {
      setSelectedChainId(chainId);
    }
  }, [chainId]);

  const handleUnifiedDeposit = async () => {
    const validAmounts = getValidChainAmounts();
    if (validAmounts.length === 0) return;

    // logger.debug("Starting deposit for", validAmounts.length, "chains");

    // // Track amounts for logging
    // const amountsByChain = validAmounts.reduce((acc, { chainId, amount }) => {
    //   acc[chainId as SupportedChainId] = amount;
    //   return acc;
    // }, {} as Record<SupportedChainId, string>);
    // logger.debug("Attempting deposit with amounts:", amountsByChain);

    // const chainAmounts: {
    //   chainId: SupportedChainId;
    //   amount: string;
    //   amountWei: bigint;
    // }[] = [];
    // const parseErrors: {
    //   chainId: SupportedChainId;
    //   amount: string;
    //   reason: string;
    // }[] = [];

    // for (const { chainId, amount } of validAmounts) {
    //   try {
    //     const amountWei = parseAmountToBigInt(amount, chainId);
    //     logger.debug(
    //       `Parsed amount for chain ${chainId}: ${amount} -> ${amountWei.toString()} wei`
    //     );
    //     chainAmounts.push({ chainId, amount, amountWei });
    //   } catch (error) {
    //     const reason = error instanceof Error ? error.message : String(error);
    //     logger.error(`Failed to parse amount for chain ${chainId}:`, reason);
    //     parseErrors.push({ chainId, amount, reason });
    //   }
    // }

    // if (parseErrors.length > 0) {
    //   const summary = parseErrors
    //     .map(
    //       (e) =>
    //         `chain ${e.chainId}: "${e.amount}" (${e.reason || "parse failed"})`
    //     )
    //     .join("; ");
    //   const aggregatedMessage = `Invalid amount(s) detected: ${summary}`;
    //   logger.error(aggregatedMessage);
    //   throw new Error(aggregatedMessage);
    // }

    // logger.debug("Final chainAmounts:", chainAmounts);

    // try {
    //   await executeBatch(chainAmounts);
    //   logger.debug("Deposit initiated successfully");
    // } catch (error) {
    //   logger.error("Failed to start deposit:", error);
    // }
  };

  const handleRetryAllFailed = async () => {};

  const handleResetAll = () => {};

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
    <div className="w-full md:w-3xl bg-teal-500/10 p-5">
      <OperationTabs activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === OPERATION_TYPES.DEPOSIT ? (
          <DepositInputV2
            inputs={batchState.inputs}
            onAmountChange={updateDepositAmount}
            onMaxClick={setDepositMaxAmount}
            onExecuteDeposit={handleUnifiedDeposit}
            disabled={isExecuting || depositProgress.isRetrying}
            isProcessing={isExecuting || depositProgress.isRetrying}
            selectedChainId={selectedChainId}
            // canRetryAll={
            //   !isExecuting &&
            //   !depositProgress.isRetrying &&
            //   depositResults.some((r) => r.status !== "success")
            // }
            // onRetryAllFailed={handleRetryAllFailed}
            //      onReset={handleResetAll}
            // executeLocked={executeLocked}
          />
        ) : (
          <DepositTabPlaceholder />
        )}
      </OperationTabs>
    </div>
  );
}

function DepositTabPlaceholder() {
  return (
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
            We're working hard to bring you secure and efficient withdrawal
            functionality.
          </p>
          <div className="border-t border-white/10 pt-3">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wide">
              Continue depositing to your vault
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
