"use client";

import { useMemo, useState } from "react";
import { ExecutionModeToggle } from "./ExecutionModeToggle";
import { ChainApprovalCard } from "./ChainApprovalCard";
import type { GasEstimateData } from "@/hooks/useGasEstimation";
import type { SupportedChainId } from "@/constant/chains";
import {
  usePendingTransactions,
  useApprovedNotDepositedChains,
} from "@/stores/operationsStore";

interface ChainOperationState {
  isOperating: boolean;
  operationType: "approval" | "deposit" | "confirming" | null;
  error?: string | null;
  isUserCancellation?: boolean;
}

interface ApprovalSectionProps {
  gasEstimates: GasEstimateData[];
  isGasLoading: boolean;
  needsApprovalOnAnyChain: boolean;
  hasAllowanceLoading: boolean;
  hasAllowanceErrors: boolean;
  allAllowancesLoaded: boolean;
  onApprove?: (chainId: number) => void;
  onDeposit?: (chainId: number) => void;
  onRetry?: (chainId: number) => void;
  onBatchExecute?: () => void;
  getChainState?: (chainId: SupportedChainId) => ChainOperationState;
  getChainTransactions?: (chainId: SupportedChainId) => {
    approvalTxHash?: `0x${string}`;
    depositTxHash?: `0x${string}`;
  };
  clearError?: (chainId: SupportedChainId) => void;
}

export function ApprovalSection({
  gasEstimates,
  isGasLoading,
  needsApprovalOnAnyChain,
  hasAllowanceLoading,
  hasAllowanceErrors,
  allAllowancesLoaded,
  onApprove,
  onDeposit,
  onRetry,
  onBatchExecute,
  getChainState,
  getChainTransactions,
  clearError,
}: ApprovalSectionProps) {
  const [isManualMode, setIsManualMode] = useState(true);

  const totalGasCost = gasEstimates
    .reduce(
      (total, estimate) =>
        total + parseFloat(estimate.totalGasCostFormatted || "0"),
      0
    )
    .toString();

  const pendingByChain = usePendingTransactions();
  const oldPartialSuccess = useApprovedNotDepositedChains();

  const gasEstimateChainIds = useMemo(
    () => new Set(gasEstimates.map((e) => e.chainId)),
    [gasEstimates]
  );

  console.log("pendingByChain", pendingByChain);
  console.log("oldPartialSuccess", oldPartialSuccess);
  console.log("gasEstimateChainIds", gasEstimateChainIds);

  const pendingOnlyChainIds = useMemo(() => {
    const ids = Object.keys(pendingByChain).map(
      (id) => Number(id) as SupportedChainId
    );
    return ids.filter((chainId) => !gasEstimateChainIds.has(chainId));
  }, [pendingByChain, gasEstimateChainIds]);

  // Also include chains that have any transaction history in the store,
  // even if none are currently pending and no amount was entered.
  const historyOnlyChainIds = useMemo(() => {
    // Only show truly old partial-success chains not part of current inputs
    return Array.from(oldPartialSuccess).filter(
      (chainId) => !gasEstimateChainIds.has(chainId)
    );
  }, [oldPartialSuccess, gasEstimateChainIds]);

  console.log("pendingOnlyChainIds", pendingOnlyChainIds);
  console.log("historyOnlyChainIds", historyOnlyChainIds);

  const pendingPlaceholderEstimates: GasEstimateData[] = useMemo(() => {
    return pendingOnlyChainIds.map((chainId) => {
      const pending = (pendingByChain as any)[chainId];
      const hasDepositPending = Boolean(pending?.depositPending);
      const placeholder: GasEstimateData = {
        chainId,
        approvalGas: null,
        depositGas: null,
        totalGasCost: 0n,
        totalGasCostFormatted: "0",
        isLoading: false,
        error: null,
        // If a deposit is pending, we must have had allowance already
        hasEnoughAllowance: hasDepositPending,
        needsApproval: false,
        // Keep as loading to hide gas/action UI while still showing status/history
        allowanceState: "loading",
        canAffordGas: true,
        nativeBalance: 0n,
        approvalSimulation: null,
        depositSimulation: null,
      };
      return placeholder;
    });
  }, [pendingOnlyChainIds, pendingByChain]);

  const historyPlaceholderEstimates: GasEstimateData[] = useMemo(() => {
    return historyOnlyChainIds.map((chainId) => {
      const placeholder: GasEstimateData = {
        chainId,
        approvalGas: null,
        depositGas: null,
        totalGasCost: 0n,
        totalGasCostFormatted: "0",
        isLoading: false,
        error: null,
        hasEnoughAllowance: false,
        needsApproval: false,
        allowanceState: "loading",
        canAffordGas: true,
        nativeBalance: 0n,
        approvalSimulation: null,
        depositSimulation: null,
      };
      return placeholder;
    });
  }, [historyOnlyChainIds]);

  const storeEstimates = useMemo(() => {
    // When there are new input-based estimates, we should avoid duplicating
    // those same chains in the store section. If the user is actively inputting,
    // we show only historical chains not part of the current inputs.
    const hasNewInputs = gasEstimates.length > 0;
    if (hasNewInputs) {
      return historyPlaceholderEstimates;
    }
    return [...pendingPlaceholderEstimates, ...historyPlaceholderEstimates];
  }, [gasEstimates, pendingPlaceholderEstimates, historyPlaceholderEstimates]);
  console.log("storeEstimates", storeEstimates);

  return (
    <div className="border-t border-teal-500/30 pt-5 space-y-4">
      {hasAllowanceLoading && (
        <div className="flex items-center justify-between">
          <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-medium">
            CHECKING ALLOWANCES
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-teal-400 font-mono text-sm font-bold uppercase tracking-wide">
              LOADING
            </span>
          </div>
        </div>
      )}

      {hasAllowanceErrors && (
        <div className="flex items-center justify-between">
          <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-medium">
            ALLOWANCE CHECK FAILED
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-red-400 font-mono text-sm font-bold uppercase tracking-wide">
              ERROR
            </span>
          </div>
        </div>
      )}

      {allAllowancesLoaded && needsApprovalOnAnyChain && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-medium">
              ACTION REQUIRED
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-yellow-400 font-mono text-sm font-bold uppercase tracking-wide">
                REQUIRED
              </span>
            </div>
          </div>

          <ExecutionModeToggle
            isManualMode={isManualMode}
            onToggle={() => setIsManualMode(!isManualMode)}
          />
        </>
      )}

      {allAllowancesLoaded && !needsApprovalOnAnyChain && (
        <div className="flex items-center justify-between">
          <h3 className="text-gray-300 font-mono text-sm uppercase tracking-wider">
            Gas Fees
          </h3>
          <div className="flex items-center gap-2">
            {isGasLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-teal-400 font-mono text-sm">
                  Calculating...
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-orange-400 font-mono text-lg">🔥</span>
                <span className="text-white font-mono text-lg font-semibold">
                  {parseFloat(totalGasCost).toFixed(4)} ETH
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New transactions from current input (fresh run) */}
      <div className="space-y-4 bg-gradient-to-r from-black/30 to-gray-900/30 p-4 rounded-lg border border-teal-500/20 backdrop-blur-sm">
        {gasEstimates.map((estimate) => (
          <ChainApprovalCard
            key={estimate.chainId}
            estimate={estimate}
            isGasLoading={isGasLoading}
            isManualMode={isManualMode}
            onApprove={onApprove}
            onDeposit={onDeposit}
            onRetry={onRetry}
            getChainState={getChainState}
            getChainTransactions={getChainTransactions}
            clearError={clearError}
          />
        ))}
      </div>

      {/* Previous transactions from store (pending or history) */}
      {storeEstimates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-medium">
              Previous Activity
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
              <span className="text-teal-400 font-mono text-sm font-bold uppercase tracking-wide">
                From History
              </span>
            </div>
          </div>
          <div className="space-y-4 bg-gradient-to-r from-black/30 to-gray-900/30 p-4 rounded-lg border border-teal-500/20 backdrop-blur-sm">
            {storeEstimates.map((estimate) => (
              <ChainApprovalCard
                key={`store-${estimate.chainId}`}
                estimate={estimate}
                isGasLoading={isGasLoading}
                isManualMode={isManualMode}
                onApprove={onApprove}
                onDeposit={onDeposit}
                onRetry={onRetry}
                getChainState={getChainState}
                getChainTransactions={getChainTransactions}
                clearError={clearError}
              />
            ))}
          </div>
        </div>
      )}

      {allAllowancesLoaded && needsApprovalOnAnyChain && !isManualMode && (
        <div className="pt-4">
          <button
            className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-teal-500/20 to-green-500/20 text-white border border-teal-500/50 hover:from-teal-500/30 hover:to-green-500/30 transition-all font-mono text-base font-bold uppercase tracking-wide"
            onClick={onBatchExecute}
          >
            Execute Batch Deposit
          </button>
          <div className="text-xs text-gray-500 text-center mt-2 font-mono">
            Will process all approvals and deposits automatically
          </div>
        </div>
      )}

      {allAllowancesLoaded && !needsApprovalOnAnyChain && (
        <div className="pt-4">
          <button
            className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-teal-500/20 to-green-500/20 text-white border border-teal-500/50 hover:from-teal-500/30 hover:to-green-500/30 transition-all font-mono text-base font-bold uppercase tracking-wide"
            onClick={onBatchExecute}
          >
            Execute Deposit
          </button>
        </div>
      )}

      {allAllowancesLoaded && !needsApprovalOnAnyChain && (
        <div className="text-[10px] text-gray-500 leading-relaxed">
          <span className="uppercase tracking-wide">Note:</span> Gas fees are
          estimates and may vary based on network conditions. Actual costs may
          differ.
        </div>
      )}
    </div>
  );
}
