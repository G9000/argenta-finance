"use client";

import {
  ChainsList,
  TotalAmountDisplay,
  TransactionEstimate,
  ApprovalSection,
} from "./deposit-summary";
import type { SupportedChainId } from "@/constant/chains";
import type { GasEstimateData } from "@/hooks/useGasEstimation";

interface DepositSummaryProps {
  activeChainIds: SupportedChainId[];
  totalAmount: string;
  gasEstimates?: GasEstimateData[];
  totalGasCost?: string;
  isGasLoading?: boolean;
  gasError?: boolean;
  needsApprovalOnAnyChain?: boolean;
  allChainsApproved?: boolean;
  hasAllowanceLoading?: boolean;
  hasAllowanceErrors?: boolean;
  allAllowancesLoaded?: boolean;
  onApprove?: (chainId: number) => void;
  onDeposit?: (chainId: number) => void;
  onBatchExecute?: () => void;
}

export function DepositSummary({
  activeChainIds,
  totalAmount,
  gasEstimates = [],
  totalGasCost: _totalGasCost = "0",
  isGasLoading = false,
  gasError: _gasError = false,
  needsApprovalOnAnyChain = false,
  allChainsApproved: _allChainsApproved = true,
  hasAllowanceLoading = false,
  hasAllowanceErrors = false,
  allAllowancesLoaded = true,
  onApprove,
  onDeposit,
  onBatchExecute,
}: DepositSummaryProps) {
  const activeChainCount = activeChainIds.length;

  return (
    <div className="border border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-teal-500/5 backdrop-blur-sm rounded-lg p-6 shadow-lg">
      <div className="space-y-6">
        <ChainsList activeChainIds={activeChainIds} />

        <TotalAmountDisplay totalAmount={totalAmount} />

        <TransactionEstimate
          gasEstimates={gasEstimates}
          activeChainCount={activeChainCount}
        />

        <ApprovalSection
          gasEstimates={gasEstimates}
          isGasLoading={isGasLoading}
          needsApprovalOnAnyChain={needsApprovalOnAnyChain}
          hasAllowanceLoading={hasAllowanceLoading}
          hasAllowanceErrors={hasAllowanceErrors}
          allAllowancesLoaded={allAllowancesLoaded}
          onApprove={onApprove}
          onDeposit={onDeposit}
          onBatchExecute={onBatchExecute}
        />
      </div>
    </div>
  );
}
