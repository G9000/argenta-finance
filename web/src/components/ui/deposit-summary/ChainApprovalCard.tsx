"use client";

import Image from "next/image";
import { getChainLogo } from "@/lib/tokens";
import { getChainName, type SupportedChainId } from "@/constant/chains";
import type { GasEstimateData } from "@/hooks/useGasEstimation";
import { getTransactionUrl, shortenTxHash } from "@/lib/explorer";
import {
  useChainState,
  useChainTransactions,
  useOperationsStore,
} from "@/stores/operationsStore";

interface ChainOperationState {
  isOperating: boolean;
  operationType: "approval" | "deposit" | "confirming" | null;
  error?: string | null;
  isUserCancellation?: boolean;
}

interface ChainApprovalCardProps {
  estimate: GasEstimateData;
  isGasLoading: boolean;
  isManualMode: boolean;
  onApprove?: (chainId: number) => void;
  onDeposit?: (chainId: number) => void;
  onRetry?: (chainId: number) => void;
  // Legacy props for backward compatibility
  getChainState?: (chainId: SupportedChainId) => ChainOperationState;
  getChainTransactions?: (chainId: SupportedChainId) => {
    approvalTxHash?: `0x${string}`;
    depositTxHash?: `0x${string}`;
  };
  clearError?: (chainId: SupportedChainId) => void;
}

export function ChainApprovalCard({
  estimate,
  isGasLoading,
  isManualMode,
  onApprove,
  onDeposit,
  onRetry,
  getChainState: propGetChainState,
  getChainTransactions: propGetChainTransactions,
  clearError: propClearError,
}: ChainApprovalCardProps) {
  const chainLogo = getChainLogo(estimate.chainId);
  const approvalCost = estimate.approvalGas?.estimatedCostFormatted || "0";
  const depositCost = estimate.depositGas?.estimatedCostFormatted || "0";

  // Use store hooks with prop fallbacks for backward compatibility
  const storeChainState = useChainState(estimate.chainId);
  const storeChainTransactions = useChainTransactions(estimate.chainId);
  const store = useOperationsStore();

  // Get chain-specific operation state
  const chainState = propGetChainState?.(estimate.chainId) || storeChainState;

  const isThisChainOperating = chainState.isOperating;
  const isApproving =
    isThisChainOperating && chainState.operationType === "approval";
  const isDepositing =
    isThisChainOperating && chainState.operationType === "deposit";
  const isConfirming =
    isThisChainOperating && chainState.operationType === "confirming";

  // Check if this chain has an error
  const hasError = !!chainState.error;
  const isUserCancellation = hasError && chainState.isUserCancellation;

  // Get transaction hashes for this chain
  const chainTransactions =
    propGetChainTransactions?.(estimate.chainId) || storeChainTransactions;
  const clearError = propClearError || store.clearChainError;
  const { approvalTxHash, depositTxHash, depositConfirmedTxHash } =
    chainTransactions as any;

  // Completion logic:
  // Consider the chain completed once a deposit tx hash exists and
  // we are not currently operating/confirming. We don't rely on
  // hasEnoughAllowance because allowance can drop to 0 after
  // a successful deposit which would incorrectly show PENDING.
  const actuallyCompleted =
    Boolean(depositConfirmedTxHash || depositTxHash) &&
    !isConfirming &&
    !isApproving &&
    !isDepositing;

  const handleButtonClick = () => {
    console.log("handleButtonClick", estimate.chainId);
    if (hasError) {
      // If there's an error, retry the failed operation
      onRetry?.(estimate.chainId);
      clearError(estimate.chainId);
    } else if (estimate.hasEnoughAllowance) {
      // If already approved, just deposit
      onDeposit?.(estimate.chainId);
    } else {
      // If needs approval, approve (which will auto-proceed to deposit)
      onApprove?.(estimate.chainId);
    }
  };

  const getAllowanceStatusDisplay = () => {
    // Handle error states first
    if (hasError) {
      return {
        dot: "bg-red-400",
        text: "text-red-400",
        label: isUserCancellation ? "CANCELLED" : "FAILED",
      };
    }

    // Handle different transaction states
    if (isApproving) {
      return {
        dot: "bg-orange-400 animate-pulse",
        text: "text-orange-400",
        label: "APPROVING",
      };
    }

    if (isDepositing) {
      return {
        dot: "bg-orange-400 animate-pulse",
        text: "text-orange-400",
        label: "DEPOSITING",
      };
    }

    if (isConfirming) {
      return {
        dot: "bg-orange-400 animate-pulse",
        text: "text-orange-400",
        label: "TRANSACTING",
      };
    }

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
        if (actuallyCompleted) {
          return {
            dot: "bg-teal-400",
            text: "text-teal-400",
            label: "COMPLETED",
          };
        }
        return estimate.hasEnoughAllowance
          ? {
              dot: "bg-green-400",
              text: "text-green-400",
              label: "READY TO DEPOSIT",
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

        <div
          className={`font-mono text-sm font-bold uppercase tracking-wide ${statusDisplay.text}`}
        >
          {statusDisplay.label}
        </div>
      </div>

      {estimate.allowanceState === "loaded" && !actuallyCompleted && (
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

      {(approvalTxHash || depositTxHash) && (
        <div className="flex items-center justify-between py-2 px-3 rounded-md bg-black/20">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-mono text-xs uppercase tracking-wide">
              Transaction History
            </span>
          </div>
          <div className="text-right space-y-1">
            {approvalTxHash && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-yellow-400 font-mono">Approval:</span>
                <a
                  href={getTransactionUrl(estimate.chainId, approvalTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-400 hover:text-teal-300 font-mono underline"
                >
                  {shortenTxHash(approvalTxHash)}
                </a>
              </div>
            )}
            {depositTxHash && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-400 font-mono">Deposit:</span>
                <a
                  href={getTransactionUrl(estimate.chainId, depositTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-400 hover:text-teal-300 font-mono underline"
                >
                  {shortenTxHash(depositTxHash)}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {!isManualMode && hasError && (
        <div className="pt-3">
          <button
            className={`w-full py-2 px-4 rounded-md font-mono text-sm font-medium uppercase tracking-wide transition-colors bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 ${
              isApproving || isDepositing || isConfirming
                ? "cursor-not-allowed"
                : ""
            }`}
            onClick={() => {
              onRetry?.(estimate.chainId);
              clearError(estimate.chainId);
            }}
            disabled={isApproving || isDepositing || isConfirming}
          >
            Retry
          </button>
        </div>
      )}

      {isManualMode &&
        (estimate.allowanceState === "loaded" || hasError) &&
        !actuallyCompleted && (
          <div className="pt-3">
            <button
              className={`w-full py-2 px-4 rounded-md font-mono text-sm font-medium uppercase tracking-wide transition-colors ${
                hasError
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  : estimate.hasEnoughAllowance
                  ? isDepositing || isConfirming
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                  : isApproving || isConfirming
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
              } ${
                isApproving || isDepositing || isConfirming
                  ? "cursor-not-allowed"
                  : ""
              }`}
              onClick={handleButtonClick}
              disabled={isApproving || isDepositing || isConfirming}
            >
              {hasError ? (
                <div className="flex items-center justify-center gap-2">
                  <span>🔄</span>
                  <span>Retry</span>
                </div>
              ) : isApproving ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Approving...</span>
                </div>
              ) : isDepositing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Depositing...</span>
                </div>
              ) : isConfirming ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Confirming...</span>
                </div>
              ) : estimate.hasEnoughAllowance ? (
                "Deposit"
              ) : (
                "Approve Allowance"
              )}
            </button>
            {hasError && (
              <div className="mt-2 p-2 rounded-md bg-red-500/10 border border-red-500/20">
                <div className="text-red-400 text-xs font-mono">
                  {chainState.error}
                </div>
              </div>
            )}
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
