"use client";

import Image from "next/image";
import { getChainLogo } from "@/lib/tokens";
import { getChainName } from "@/constant/chains";
import type { GasEstimateData } from "@/hooks/useGasEstimation";

interface ChainGasEstimateProps {
  estimate: GasEstimateData;
  isGasLoading: boolean;
}

export function ChainGasEstimate({
  estimate,
  isGasLoading: _isGasLoading,
}: ChainGasEstimateProps) {
  const chainLogo = getChainLogo(estimate.chainId);
  const approvalCost = estimate.approvalGas?.estimatedCostFormatted || "0";
  const depositCost = estimate.depositGas?.estimatedCostFormatted || "0";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {chainLogo && (
          <Image
            src={chainLogo}
            alt={`Chain ${estimate.chainId}`}
            width={16}
            height={16}
            className="rounded-full"
          />
        )}
        <div>
          <div className="text-gray-300 font-mono text-sm font-medium">
            {getChainName(estimate.chainId)}
          </div>
          <div className="flex items-center gap-2 text-xs">
            {estimate.allowanceState === "loading" && (
              <span className="text-blue-400">Checking...</span>
            )}
            {estimate.allowanceState === "error" && (
              <span className="text-red-400">Check Failed</span>
            )}
            {estimate.allowanceState === "loaded" &&
              (estimate.hasEnoughAllowance ? (
                <span className="text-green-400">Approved</span>
              ) : (
                <span className="text-yellow-400">Needs Approval</span>
              ))}
            {!estimate.canAffordGas && (
              <span className="text-red-400">• Insufficient Balance</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-white font-mono text-sm font-medium">
          {parseFloat(estimate.totalGasCostFormatted).toFixed(4)} ETH
        </div>
        <div className="text-gray-400 font-mono text-xs">
          {estimate.allowanceState === "loaded" && estimate.needsApproval && (
            <>Approval: {parseFloat(approvalCost).toFixed(4)} + </>
          )}
          Deposit: {parseFloat(depositCost).toFixed(4)}
        </div>
      </div>
    </div>
  );
}
