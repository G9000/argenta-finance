"use client";

import { getChainName, getBlockExplorerUrl } from "@/constant/contracts";
import { cn } from "@/lib/utils";
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

  const getStatusIcon = (status: ChainOperationStatus["status"]) => {
    switch (status) {
      case "pending":
        return "⏳";
      case "approving":
      case "depositing":
      case "retrying":
        return (
          <div className="size-3 border border-current border-t-transparent rounded-full animate-spin" />
        );
      case "completed":
        return "✅";
      case "partial":
        return "🟡";
      case "failed":
        return "❌";
      default:
        return "⏳";
    }
  };

  const getStatusText = (chainStatus: ChainOperationStatus) => {
    switch (chainStatus.status) {
      case "pending":
        return "Waiting";
      case "approving":
        return "Approving USDC";
      case "depositing":
        return "Depositing";
      case "retrying":
        return "Retrying...";
      case "partial":
        return "Approval complete — deposit cancelled";
      case "completed":
        return "Completed";
      case "failed":
        if (
          chainStatus.error?.includes("cancelled") ||
          chainStatus.error?.includes("User cancelled")
        ) {
          return `Cancelled: ${chainStatus.error}`;
        }
        return `Failed: ${chainStatus.error || "Unknown error"}`;
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
        return "text-blue-400";
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-white/20 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">
                {progress.isComplete
                  ? "Batch Operation Complete"
                  : "Batch Operation in Progress"}
              </h2>
              <div className="text-sm text-gray-400">
                {progress.isComplete
                  ? progress.batchCompletedSuccessfully
                    ? progress.hasFailures
                      ? "Batch completed with some failures"
                      : "All operations completed successfully"
                    : "Batch operation failed"
                  : `Step ${progress.currentStep} of ${progress.totalSteps}`}
              </div>
            </div>
            {progress.isComplete && (
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {!progress.isComplete && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Overall Progress</span>
                <span>{Math.round(progress.percentage)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {!progress.isComplete && (
          <div className="border-b border-white/10 px-6 py-4 bg-gray-800/50">
            <div className="text-center">
              <div className="text-lg font-medium text-white mb-1">
                {stepLabel(progress)}
              </div>
              <div className="text-xs text-gray-400">
                Current operation in progress
              </div>
            </div>
          </div>
        )}

        {/* Chain Status List */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {progress.chainStatuses.map((chainStatus) => (
            <div
              key={chainStatus.chainId}
              className={cn(
                "border rounded-lg p-4 transition-colors",
                chainStatus.status === "completed"
                  ? "border-green-500/30 bg-green-500/5"
                  : chainStatus.status === "partial"
                  ? "border-yellow-400/30 bg-yellow-400/5"
                  : chainStatus.status === "failed"
                  ? "border-red-500/30 bg-red-500/5"
                  : chainStatus.status === "approving" ||
                    chainStatus.status === "depositing" ||
                    chainStatus.status === "retrying"
                  ? "border-blue-500/30 bg-blue-500/5"
                  : "border-white/10"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6">
                    {getStatusIcon(chainStatus.status)}
                  </div>
                  <div>
                    <div className="font-semibold text-white">
                      {getChainName(chainStatus.chainId)}
                    </div>
                    <div
                      className={cn(
                        "text-sm",
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
                    <div className="flex gap-2">
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
                          "px-3 py-1 text-xs rounded transition-colors",
                          !!progress.isRetrying &&
                            progress.retryingChainId !== chainStatus.chainId
                            ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                            : "bg-blue-500 text-white hover:bg-blue-600",
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
                          className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                          Skip
                        </button>
                      )}
                    </div>
                  )}
              </div>

              {/* Transaction Links */}
              {(chainStatus.approveTxHash ||
                chainStatus.depositTxHash ||
                chainStatus.status === "partial") && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  {chainStatus.approveTxHash && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        Approval Transaction
                      </span>
                      <a
                        href={getExplorerLink(
                          chainStatus,
                          chainStatus.approveTxHash
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-400 hover:text-teal-300 font-mono"
                      >
                        {chainStatus.approveTxHash.slice(0, 8)}...
                        {chainStatus.approveTxHash.slice(-6)} ↗
                      </a>
                    </div>
                  )}
                  {chainStatus.depositTxHash ? (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Deposit Transaction</span>
                      <a
                        href={getExplorerLink(
                          chainStatus,
                          chainStatus.depositTxHash
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-400 hover:text-teal-300 font-mono"
                      >
                        {chainStatus.depositTxHash.slice(0, 8)}...
                        {chainStatus.depositTxHash.slice(-6)} ↗
                      </a>
                    </div>
                  ) : chainStatus.status === "partial" ? (
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Deposit Transaction</span>
                      <span className="italic">Not submitted</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/10 p-6">
          {progress.isComplete ? (
            <button
              onClick={onDismiss}
              className="w-full p-3 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors font-mono uppercase"
            >
              Close
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onCancelBatch}
                className="flex-1 p-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors font-mono uppercase"
              >
                Cancel Remaining
              </button>
              <div className="flex-1 p-3 bg-gray-800 text-gray-400 rounded font-mono uppercase text-center">
                {progress.currentOperation === "approval"
                  ? "Approving..."
                  : "Depositing..."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
