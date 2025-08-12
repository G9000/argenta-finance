"use client";

import { useState } from "react";
import { ExecutionModeToggle } from "./ExecutionModeToggle";
import { ChainApprovalCard } from "./ChainApprovalCard";
import type { GasEstimateData } from "@/hooks/useGasEstimation";
import type { SupportedChainId } from "@/constant/chains";

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

  // Calculate total gas cost for when all chains are approved
  const totalGasCost = gasEstimates
    .reduce(
      (total, estimate) =>
        total + parseFloat(estimate.totalGasCostFormatted || "0"),
      0
    )
    .toString();

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
