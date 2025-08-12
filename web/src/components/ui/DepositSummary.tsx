"use client";

import { useState } from "react";
import Image from "next/image";
import { getTokenLogo, getChainLogo } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import type { SupportedChainId } from "@/constant/chains";
import { getChainName } from "@/constant/chains";
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
}

export function DepositSummary({
  activeChainIds,
  totalAmount,
  gasEstimates = [],
  totalGasCost = "0",
  isGasLoading = false,
  gasError = false,
  needsApprovalOnAnyChain = false,
  allChainsApproved = true,
}: DepositSummaryProps) {
  const activeChainCount = activeChainIds.length;
  const [isManualMode, setIsManualMode] = useState(true);

  return (
    <div className="border border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-teal-500/5 backdrop-blur-sm rounded-lg p-6 shadow-lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between py-2">
          <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-medium">
            Active Chains
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center -space-x-2">
              {activeChainIds.map((chainId, index) => {
                const logo = getChainLogo(chainId);
                return (
                  <div
                    key={chainId}
                    className={cn(
                      "relative rounded-full border-2 border-gray-700/50 bg-gray-800/50 backdrop-blur-sm shadow-md transition-transform hover:scale-110",
                      index > 0 && "z-10"
                    )}
                    style={{ zIndex: activeChainIds.length - index }}
                  >
                    {logo && (
                      <Image
                        src={logo}
                        alt={`Chain ${chainId}`}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <span className="text-white font-mono text-lg font-semibold tracking-wide">
              {activeChainCount} CHAIN{activeChainCount !== 1 ? "S" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-medium">
            Total Amount
          </h3>
          <div className="flex items-center gap-3">
            <Image
              src={getTokenLogo("USDC")}
              alt="USDC"
              width={20}
              height={20}
              className="rounded-full shadow-sm"
            />
            <span className="text-white font-mono text-xl font-bold tracking-wide">
              {totalAmount} USDC
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-teal-500/30 pt-4">
          <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-medium">
            Estimated Transactions
          </h3>
          <span className="text-gray-300 font-mono text-lg font-semibold tracking-wide">
            {gasEstimates.length > 0
              ? `${gasEstimates.reduce(
                  (total, est) =>
                    total +
                    (est.needsApproval ? 1 : 0) +
                    (est.depositGas ? 1 : 0),
                  0
                )} TXN${
                  gasEstimates.reduce(
                    (total, est) =>
                      total +
                      (est.needsApproval ? 1 : 0) +
                      (est.depositGas ? 1 : 0),
                    0
                  ) !== 1
                    ? "S"
                    : ""
                }`
              : `${activeChainCount * 2} TXNS`}
          </span>
        </div>

        {!needsApprovalOnAnyChain && (
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
                    <span className="text-orange-400 font-mono text-lg">
                      🔥
                    </span>
                    <span className="text-white font-mono text-lg font-semibold">
                      {parseFloat(totalGasCost).toFixed(4)} ETH
                    </span>
                  </div>
                )}
              </div>
            </div>

            {!isGasLoading && !gasError && gasEstimates.length > 0 && (
              <div className="space-y-3 bg-black/20 p-3 border border-teal-500/10">
                {gasEstimates.map((estimate) => {
                  const chainLogo = getChainLogo(estimate.chainId);
                  const approvalCost =
                    estimate.approvalGas?.estimatedCostFormatted || "0";
                  const depositCost =
                    estimate.depositGas?.estimatedCostFormatted || "0";

                  return (
                    <div
                      key={estimate.chainId}
                      className="flex items-center justify-between"
                    >
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
                            {estimate.hasEnoughAllowance ? (
                              <span className="text-green-400">Approved</span>
                            ) : (
                              <span className="text-yellow-400">
                                Needs Approval
                              </span>
                            )}
                            {!estimate.canAffordGas && (
                              <span className="text-red-400">
                                • Insufficient Balance
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-mono text-sm font-medium">
                          {parseFloat(estimate.totalGasCostFormatted).toFixed(
                            4
                          )}{" "}
                          ETH
                        </div>
                        <div className="text-gray-400 font-mono text-xs">
                          {estimate.needsApproval && (
                            <>
                              Approval: {parseFloat(approvalCost).toFixed(4)} +
                            </>
                          )}
                          Deposit: {parseFloat(depositCost).toFixed(4)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-[10px] text-gray-500 leading-relaxed">
              <span className="uppercase tracking-wide">Note:</span> Gas fees
              are estimates and may vary based on network conditions. Actual
              costs may differ.
            </div>
          </div>
        )}

        {needsApprovalOnAnyChain && (
          <div className="border-t border-teal-500/30 pt-5 space-y-4">
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

            {/* Mode Toggle */}
            <div className="flex items-center justify-between py-3 px-4 bg-black/20 rounded-lg border border-teal-500/10">
              <div className="flex items-center gap-3">
                <span className="text-gray-300 font-mono text-sm font-medium">
                  Execution Mode:
                </span>
                <span
                  className={`font-mono text-sm font-bold uppercase tracking-wide ${
                    isManualMode ? "text-blue-400" : "text-green-400"
                  }`}
                >
                  {isManualMode ? "Manual" : "Automatic"}
                </span>
              </div>
              <button
                onClick={() => setIsManualMode(!isManualMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                  isManualMode ? "bg-blue-500" : "bg-green-500"
                }`}
              >
                <span className="sr-only">Toggle execution mode</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isManualMode ? "translate-x-1" : "translate-x-6"
                  }`}
                />
              </button>
            </div>

            <div className="text-xs text-gray-500 leading-relaxed px-2">
              <span className="font-mono uppercase tracking-wide">
                {isManualMode ? "Manual:" : "Automatic:"}
              </span>{" "}
              {isManualMode
                ? "Approve and deposit each chain individually using buttons below"
                : "Use unified batch execution to process all chains automatically"}
            </div>

            <div className="space-y-4 bg-gradient-to-r from-black/30 to-gray-900/30 p-4 rounded-lg border border-teal-500/20 backdrop-blur-sm">
              {gasEstimates.map((estimate) => {
                const chainLogo = getChainLogo(estimate.chainId);
                const approvalCost =
                  estimate.approvalGas?.estimatedCostFormatted || "0";
                const depositCost =
                  estimate.depositGas?.estimatedCostFormatted || "0";

                return (
                  <div
                    key={estimate.chainId}
                    className="bg-black/30 rounded-lg p-4 border border-teal-500/10 space-y-3"
                  >
                    {/* Chain header with status */}
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
                        <div
                          className={`w-2 h-2 rounded-full ${
                            estimate.hasEnoughAllowance
                              ? "bg-green-400"
                              : "bg-yellow-400 animate-pulse"
                          }`}
                        ></div>
                        <span
                          className={`font-mono text-sm font-bold uppercase tracking-wide ${
                            estimate.hasEnoughAllowance
                              ? "text-green-400"
                              : "text-yellow-400"
                          }`}
                        >
                          {estimate.hasEnoughAllowance ? "APPROVED" : "PENDING"}
                        </span>
                      </div>
                    </div>

                    {/* Gas information - only show if approved */}
                    {estimate.hasEnoughAllowance && (
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
                              // Log gas estimation error for debugging
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
                                {parseFloat(
                                  estimate.totalGasCostFormatted
                                ).toFixed(4)}{" "}
                                ETH
                              </div>
                              <div className="text-gray-400 font-mono text-xs">
                                {estimate.needsApproval && (
                                  <>
                                    Approval:{" "}
                                    {parseFloat(approvalCost).toFixed(4)} +{" "}
                                  </>
                                )}
                                Deposit: {parseFloat(depositCost).toFixed(4)}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action button - only show in manual mode */}
                    {isManualMode && (
                      <div className="pt-2">
                        <button
                          className={`w-full py-2 px-4 rounded-md font-mono text-sm font-medium uppercase tracking-wide transition-colors ${
                            estimate.hasEnoughAllowance
                              ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                          }`}
                          onClick={() => {
                            // Placeholder - no function wired up yet
                            console.log(
                              estimate.hasEnoughAllowance
                                ? `Deposit on ${getChainName(estimate.chainId)}`
                                : `Approve allowance on ${getChainName(
                                    estimate.chainId
                                  )}`
                            );
                          }}
                        >
                          {estimate.hasEnoughAllowance
                            ? "Deposit"
                            : "Approve Allowance"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Unified batch execution button - only show in automatic mode */}
            {!isManualMode && (
              <div className="pt-4">
                <button
                  className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-teal-500/20 to-green-500/20 text-white border border-teal-500/50 hover:from-teal-500/30 hover:to-green-500/30 transition-all font-mono text-base font-bold uppercase tracking-wide"
                  onClick={() => {
                    // Placeholder - no function wired up yet
                    console.log("Execute unified batch deposit for all chains");
                  }}
                >
                  Execute Batch Deposit
                </button>
                <div className="text-xs text-gray-500 text-center mt-2 font-mono">
                  Will process all approvals and deposits automatically
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
