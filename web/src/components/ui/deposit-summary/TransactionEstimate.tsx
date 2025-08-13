"use client";

import type { GasEstimateData } from "@/hooks/useGasEstimation";

interface TransactionEstimateProps {
  gasEstimates: GasEstimateData[];
  activeChainCount: number;
}

export function TransactionEstimate({
  gasEstimates,
  activeChainCount,
}: TransactionEstimateProps) {
  const calculateTransactionCount = () => {
    if (gasEstimates.length > 0) {
      return gasEstimates.reduce(
        (total, est) =>
          total + (est.needsApproval ? 1 : 0) + (est.depositGas ? 1 : 0),
        0
      );
    }
    return activeChainCount * 2;
  };

  const transactionCount = calculateTransactionCount();

  return (
    <div className="flex items-center justify-between border-t border-teal-500/30 pt-4">
      <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-medium">
        Estimated Transactions
      </h3>
      <span className="text-gray-300 font-mono text-lg font-semibold tracking-wide">
        {transactionCount} TXN{transactionCount !== 1 ? "S" : ""}
      </span>
    </div>
  );
}
