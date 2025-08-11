"use client";

import { getChainName, getBlockExplorerUrl } from "@/constant/contracts";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getChainLogo, getTokenLogo } from "@/lib/tokens";
import Image from "next/image";
import type {
  BatchDepositProgress,
  ChainOperationStatus,
} from "@/types/ui-state";

interface BatchOperationProgressProps {
  progress: BatchDepositProgress;
  onRetryChain?: (chainId: number) => void;
  onSkipChain?: (chainId: number) => void;
  onCancelBatch?: () => void;
  onDismiss?: () => void;
}

export function BatchOperationProgress({
  progress,
  onRetryChain,
  onSkipChain,
  onCancelBatch,
  onDismiss,
}: BatchOperationProgressProps) {
  const stepLabel = (p: BatchDepositProgress) => {
    if (p.isComplete) return "";
    const chainName = p.currentChain ? getChainName(p.currentChain) : "";
    if (!p.currentChain || !p.currentOperation) return "Preparing...";
    switch (p.currentOperation) {
      case "approval":
        return `Approving USDC on ${chainName}`;
      case "deposit":
        return `Depositing on ${chainName}`;
      default:
        return `Processing ${chainName}`;
    }
  };

  const getStatusText = (chainStatus: ChainOperationStatus) => {
    switch (chainStatus.status) {
      case "pending":
        return "WAITING";
      case "approving":
        return "APPROVING USDC";
      case "depositing":
        return "DEPOSITING";
      case "retrying":
        return "RETRYING...";
      case "partial":
        return "APPROVAL COMPLETE — DEPOSIT CANCELLED";
      case "completed":
        return "COMPLETED";
      case "failed":
        if (
          chainStatus.error?.includes("cancelled") ||
          chainStatus.error?.includes("User cancelled")
        ) {
          return `CANCELLED: ${chainStatus.error}`;
        }
        return `FAILED: ${chainStatus.error || "UNKNOWN ERROR"}`;
      default:
        return "";
    }
  };

  const getStatusColor = (status: ChainOperationStatus["status"]) => {
    switch (status) {
      case "pending":
        return "text-gray-400";
      case "approving":
      case "depositing":
      case "retrying":
        return "text-teal-400";
      case "completed":
        return "text-green-400";
      case "partial":
        return "text-yellow-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getExplorerLink = (
    chainStatus: ChainOperationStatus,
    txHash: string
  ) => {
    const explorerUrl = getBlockExplorerUrl(chainStatus.chainId);
    return `${explorerUrl}/tx/${txHash}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="border border-white/10 bg-gradient-to-br from-gray-900/60 to-gray-800/40 backdrop-blur-sm max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-mono uppercase tracking-wide text-white mb-1">
                {progress.isComplete
                  ? "Batch Operation Complete"
                  : "Batch Operation in Progress"}
              </h2>
              <div className="text-xs text-gray-400 uppercase tracking-wide">
                {progress.isComplete
                  ? progress.batchCompletedSuccessfully
                    ? progress.hasFailures
                      ? "Batch completed with some failures"
                      : "All operations completed successfully"
                    : "Batch operation failed"
                  : `Step ${progress.currentStep} of ${progress.totalSteps}`}
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-white transition-colors p-1 flex-shrink-0"
              title={
                progress.isComplete
                  ? "Close"
                  : "Minimize (operation continues in background)"
              }
            >
              ✕
            </button>
          </div>

          {!progress.isComplete && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wide mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(progress.percentage)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-teal-400 transition-all duration-300 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {!progress.isComplete && (
          <div className="px-4 sm:px-6 py-4 border-b border-white/10">
            <div className="text-center">
              <div className="text-base sm:text-lg font-mono text-white mb-1">
                {stepLabel(progress)}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">
                Current operation in progress
              </div>
            </div>
          </div>
        )}

        {/* Chain Status List */}
        <div className="p-4 sm:p-6 space-y-4 max-h-96 overflow-y-auto">
          {progress.chainStatuses.map((chainStatus) => (
            <div
              key={chainStatus.chainId}
              className={cn(
                "border p-3 sm:p-4 transition-colors bg-black/10",
                chainStatus.status === "completed"
                  ? "border-green-500/30 bg-green-500/5"
                  : chainStatus.status === "partial"
                  ? "border-yellow-400/30 bg-yellow-400/5"
                  : chainStatus.status === "failed"
                  ? "border-red-500/30 bg-red-500/5"
                  : chainStatus.status === "approving" ||
                    chainStatus.status === "depositing" ||
                    chainStatus.status === "retrying"
                  ? "border-teal-400/40 bg-teal-400/5"
                  : "border-white/10"
              )}
            >
              <div className="flex items-start justify-between mb-3 gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex -space-x-1 flex-shrink-0">
                    {getChainLogo(chainStatus.chainId) && (
                      <Image
                        src={getChainLogo(chainStatus.chainId)!}
                        alt=""
                        width={24}
                        height={24}
                        className="rounded-full ring-1 ring-white/10 bg-white/5"
                      />
                    )}
                    {getTokenLogo("USDC") && (
                      <Image
                        src={getTokenLogo("USDC")!}
                        alt=""
                        width={24}
                        height={24}
                        className="rounded-full ring-1 ring-white/10 bg-white/5"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-white uppercase tracking-wide text-sm">
                      {getChainName(chainStatus.chainId)}
                    </div>
                    <div
                      className={cn(
                        "text-xs font-mono uppercase tracking-wide",
                        getStatusColor(chainStatus.status)
                      )}
                    >
                      {getStatusText(chainStatus)}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {(chainStatus.status === "failed" ||
                  chainStatus.status === "partial") &&
                  chainStatus.canRetry && (
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          if (progress.isRetrying) return; // hard guard
                          onRetryChain?.(chainStatus.chainId);
                        }}
                        disabled={Boolean(
                          progress.isRetrying &&
                            progress.retryingChainId !== chainStatus.chainId
                        )}
                        className={cn(
                          "px-3 py-1.5 text-xs font-mono uppercase tracking-wide transition-colors border whitespace-nowrap",
                          !!progress.isRetrying &&
                            progress.retryingChainId !== chainStatus.chainId
                            ? "bg-gray-600 text-gray-300 cursor-not-allowed border-gray-600"
                            : "from-teal-500/80 to-teal-600/80 text-white bg-gradient-to-br hover:from-teal-500 hover:to-teal-600 border-teal-500/60", // gradient teal action
                          progress.isRetrying &&
                            progress.retryingChainId !== chainStatus.chainId &&
                            "pointer-events-none"
                        )}
                      >
                        {chainStatus.status === "partial"
                          ? "Retry Deposit"
                          : "Retry"}
                      </button>
                      {onSkipChain && (
                        <button
                          onClick={() => onSkipChain?.(chainStatus.chainId)}
                          className="px-3 py-1.5 text-xs font-mono uppercase tracking-wide border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                        >
                          Skip
                        </button>
                      )}
                    </div>
                  )}
              </div>

              {(chainStatus.approveTxHash ||
                chainStatus.depositTxHash ||
                chainStatus.status === "partial") && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  {chainStatus.approveTxHash && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getTokenLogo("USDC") && (
                          <Image
                            src={getTokenLogo("USDC")!}
                            alt=""
                            width={16}
                            height={16}
                            className="rounded-full ring-1 ring-white/10 bg-white/5 flex-shrink-0"
                          />
                        )}
                        <span className="text-gray-400 uppercase tracking-wide text-xs">
                          Approval Transaction
                        </span>
                      </div>
                      <a
                        href={getExplorerLink(
                          chainStatus,
                          chainStatus.approveTxHash
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors rounded-sm text-teal-400 hover:text-teal-300 font-mono text-xs"
                      >
                        <span className="truncate max-w-[120px] sm:max-w-none">
                          {chainStatus.approveTxHash.slice(0, 8)}...
                          {chainStatus.approveTxHash.slice(-6)}
                        </span>
                        <ArrowUpRight
                          size={14}
                          strokeWidth={1.75}
                          className="flex-shrink-0"
                        />
                      </a>
                    </div>
                  )}
                  {chainStatus.depositTxHash ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getChainLogo(chainStatus.chainId) && (
                          <Image
                            src={getChainLogo(chainStatus.chainId)!}
                            alt=""
                            width={16}
                            height={16}
                            className="rounded-full ring-1 ring-white/10 bg-white/5 flex-shrink-0"
                          />
                        )}
                        <span className="text-gray-400 uppercase tracking-wide text-xs">
                          Deposit Transaction
                        </span>
                      </div>
                      <a
                        href={getExplorerLink(
                          chainStatus,
                          chainStatus.depositTxHash
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors rounded-sm text-teal-400 hover:text-teal-300 font-mono text-xs"
                      >
                        <span className="truncate max-w-[120px] sm:max-w-none">
                          {chainStatus.depositTxHash.slice(0, 8)}...
                          {chainStatus.depositTxHash.slice(-6)}
                        </span>
                        <ArrowUpRight
                          size={14}
                          strokeWidth={1.75}
                          className="flex-shrink-0"
                        />
                      </a>
                    </div>
                  ) : chainStatus.status === "partial" ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {getChainLogo(chainStatus.chainId) && (
                          <Image
                            src={getChainLogo(chainStatus.chainId)!}
                            alt=""
                            width={16}
                            height={16}
                            className="rounded-full ring-1 ring-white/10 bg-white/5 flex-shrink-0 opacity-50"
                          />
                        )}
                        <span className="text-gray-400 uppercase tracking-wide text-xs">
                          Deposit Transaction
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 italic font-mono px-3 py-1.5 border border-white/5 bg-black/10 rounded-sm">
                        Not submitted
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 p-4 sm:p-6">
          {progress.isComplete ? (
            <button
              onClick={onDismiss}
              className="w-full p-3 font-mono uppercase tracking-wide bg-gradient-to-br from-teal-500/90 to-teal-600/90 border border-white/10 text-white hover:from-teal-500 hover:to-teal-600 focus-visible:outline-none focus-visible:bg-teal-600/20 transition-colors text-sm"
            >
              Close
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onCancelBatch}
                  className="flex-1 p-3 font-mono uppercase tracking-wide border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors text-sm"
                >
                  Cancel Remaining
                </button>
                <div className="flex-1 p-3 font-mono uppercase tracking-wide text-center border border-white/10 bg-black/20 text-gray-400 text-sm">
                  {progress.currentOperation === "approval"
                    ? "Approving..."
                    : "Depositing..."}
                </div>
              </div>
              <button
                onClick={onDismiss}
                className="w-full p-2 font-mono uppercase tracking-wide border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 transition-colors text-xs"
              >
                Minimize (Continue in Background)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
