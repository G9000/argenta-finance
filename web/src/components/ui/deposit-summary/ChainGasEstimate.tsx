"use client";

import Image from "next/image";
import { getChainLogo } from "@/lib/tokens";
import { getChainName } from "@/constant/chains";
import type { GasEstimateData } from "@/hooks/useGasEstimation";
import { ALLOWANCE_STATE } from "@/hooks/useAllowanceCheck";

interface ChainGasEstimateProps {
  estimate: GasEstimateData;
  isGasLoading: boolean;
}

export function ChainGasEstimate({
  estimate,
  isGasLoading: _isGasLoading,
}: ChainGasEstimateProps) {
  const chainLogo = getChainLogo(estimate.chainId);

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
            {estimate.allowanceState === ALLOWANCE_STATE.LOADING && (
              <span className="text-blue-400">Checking...</span>
            )}
            {estimate.allowanceState === ALLOWANCE_STATE.ERROR && (
              <span className="text-red-400">Check Failed</span>
            )}
            {estimate.allowanceState === ALLOWANCE_STATE.LOADED &&
              (estimate.hasEnoughAllowance ? (
                <span className="text-green-400">Approved</span>
              ) : (
                <span className="text-yellow-400">Needs Approval</span>
              ))}
          </div>
        </div>
      </div>
      {/* Only show gas UI for approved chains */}
      {estimate.hasEnoughAllowance && !estimate.needsApproval && (
        <div className="text-right">
          <div className="text-gray-400 font-mono text-xs">
            Calculated at execution
          </div>
        </div>
      )}
    </div>
  );
}
