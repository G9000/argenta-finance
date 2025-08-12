"use client";

import Image from "next/image";
import { getChainLogo } from "@/lib/tokens";
import { getChainName } from "@/constant/chains";
import type { GasEstimateData } from "@/hooks/useGasEstimation";

interface ChainApprovalCardProps {
  estimate: GasEstimateData;
  isGasLoading: boolean;
  isManualMode: boolean;
  onApprove?: (chainId: number) => void;
  onDeposit?: (chainId: number) => void;
}

export function ChainApprovalCard({
  estimate,
  isGasLoading,
  isManualMode,
  onApprove,
  onDeposit,
}: ChainApprovalCardProps) {
  const chainLogo = getChainLogo(estimate.chainId);
  const approvalCost = estimate.approvalGas?.estimatedCostFormatted || "0";
  const depositCost = estimate.depositGas?.estimatedCostFormatted || "0";

  const handleButtonClick = () => {
    if (estimate.hasEnoughAllowance) {
      onDeposit?.(estimate.chainId);
    } else {
      onApprove?.(estimate.chainId);
    }
  };

  const getAllowanceStatusDisplay = () => {
    switch (estimate.allowanceState) {
      case "loading":
        return {
          dot: "bg-blue-400 animate-pulse",
          text: "text-blue-400",
          label: "CHECKING",
        };
      case "error":
        return {
          dot: "bg-red-400",
          text: "text-red-400",
          label: "ERROR",
        };
      case "loaded":
        return estimate.hasEnoughAllowance
          ? {
              dot: "bg-green-400",
              text: "text-green-400",
              label: "APPROVED",
            }
          : {
              dot: "bg-yellow-400 animate-pulse",
              text: "text-yellow-400",
              label: "PENDING",
            };
      default:
        return {
          dot: "bg-gray-400",
          text: "text-gray-400",
          label: "UNKNOWN",
        };
    }
  };

  const statusDisplay = getAllowanceStatusDisplay();

  return (
    <div className="bg-black/30 rounded-lg p-4 border border-teal-500/10 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {chainLogo && (
            <Image
              src={chainLogo}
              alt={`Chain ${estimate.chainId}`}
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <span className="text-white font-mono text-base font-semibold">
            {getChainName(estimate.chainId)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusDisplay.dot}`}></div>
          <span
            className={`font-mono text-sm font-bold uppercase tracking-wide ${statusDisplay.text}`}
          >
            {statusDisplay.label}
          </span>
        </div>
      </div>

      {estimate.allowanceState === "loaded" && estimate.hasEnoughAllowance && (
        <div className="flex items-center justify-between py-2 px-3 rounded-md bg-black/20">
          <div className="flex items-center gap-2">
            <span className="text-orange-400 text-sm">🔥</span>
            <span className="text-gray-400 font-mono text-xs uppercase tracking-wide">
              Estimated Gas
            </span>
          </div>
          <div className="text-right">
            {isGasLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-teal-400 font-mono text-xs">
                  Estimating...
                </span>
              </div>
            ) : estimate.error ? (
              (() => {
                console.warn(
                  `Gas estimation failed for chain ${estimate.chainId}:`,
                  estimate.error
                );
                return (
                  <span className="text-yellow-400 font-mono text-xs">
                    Unable to estimate
                  </span>
                );
              })()
            ) : (
              <>
                <div className="text-white font-mono text-sm font-medium">
                  {parseFloat(estimate.totalGasCostFormatted).toFixed(4)} ETH
                </div>
                <div className="text-gray-400 font-mono text-xs">
                  {estimate.needsApproval && (
                    <>Approval: {parseFloat(approvalCost).toFixed(4)} + </>
                  )}
                  Deposit: {parseFloat(depositCost).toFixed(4)}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isManualMode && estimate.allowanceState === "loaded" && (
        <div className="pt-2">
          <button
            className={`w-full py-2 px-4 rounded-md font-mono text-sm font-medium uppercase tracking-wide transition-colors ${
              estimate.hasEnoughAllowance
                ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
            }`}
            onClick={handleButtonClick}
          >
            {estimate.hasEnoughAllowance ? "Deposit" : "Approve Allowance"}
          </button>
        </div>
      )}

      {estimate.allowanceState === "error" && (
        <div className="pt-2">
          <div className="w-full py-2 px-4 rounded-md font-mono text-sm font-medium uppercase tracking-wide bg-red-500/20 text-red-400 border border-red-500/30 text-center">
            Allowance Check Failed
          </div>
        </div>
      )}
    </div>
  );
}
