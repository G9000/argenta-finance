"use client";

import { ChainGasEstimate } from "./ChainGasEstimate";
import type { GasEstimateData } from "@/hooks/useGasEstimation";

interface GasFeesSectionProps {
  gasEstimates: GasEstimateData[];
  totalGasCost: string;
  isGasLoading: boolean;
  gasError: boolean;
}

export function GasFeesSection({
  gasEstimates,
  totalGasCost,
  isGasLoading,
  gasError,
}: GasFeesSectionProps) {
  return (
    <div className="border-t border-teal-500/20 pt-4 space-y-4">
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
          ) : gasError ? (
            <span className="text-red-400 font-mono text-sm">
              Estimation Error
            </span>
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

      {!isGasLoading && !gasError && gasEstimates.length > 0 && (
        <div className="space-y-3 bg-black/20 p-3 border border-teal-500/10">
          {gasEstimates.map((estimate) => (
            <ChainGasEstimate
              key={estimate.chainId}
              estimate={estimate}
              isGasLoading={isGasLoading}
            />
          ))}
        </div>
      )}

      <div className="text-[10px] text-gray-500 leading-relaxed">
        <span className="uppercase tracking-wide">Note:</span> Gas fees are
        estimates and may vary based on network conditions. Actual costs may
        differ.
      </div>
    </div>
  );
}
