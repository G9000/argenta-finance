"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  SupportedChainId,
  SUPPORTED_CHAINS,
  getChainName,
  USDC_DECIMALS,
  getUsdcAddress,
} from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { formatBalance } from "@/lib/format";
import { getTokenLogo } from "@/lib/tokens";
import { useChainBalances } from "@/hooks";
import type { BatchDepositState, ChainDepositAmount } from "@/types/operations";

interface BatchDepositInputProps {
  batchState: BatchDepositState;
  onAmountChange: (chainId: SupportedChainId, amount: string) => void;
  onMaxClick: (chainId: SupportedChainId) => void;
  onExecuteBatch: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

export function BatchDepositInput({
  batchState,
  onAmountChange,
  onMaxClick,
  onExecuteBatch,
  disabled = false,
  isProcessing = false,
}: BatchDepositInputProps) {
  const { address } = useAccount();

  // Get balances for all chains
  const chainBalances = SUPPORTED_CHAINS.reduce((acc, chainId) => {
    const { walletBalance } = useChainBalances({ chainId });
    acc[chainId] = walletBalance;
    return acc;
  }, {} as Record<SupportedChainId, ReturnType<typeof useChainBalances>["walletBalance"]>);

  const stepValue = USDC_DECIMALS > 0 ? `0.${"0".repeat(USDC_DECIMALS - 1)}1` : "1";

  const hasAnyAmount = Object.values(batchState.inputs).some(amount => {
    const numericAmount = Number(amount);
    return amount && Number.isFinite(numericAmount) && numericAmount > 0;
  });

  const isButtonDisabled = !hasAnyAmount || !batchState.isValid || disabled || isProcessing;

  const getTotalAmount = () => {
    try {
      const total = Object.values(batchState.inputs)
        .filter(amount => amount && Number(amount) > 0)
        .reduce((sum, amount) => {
          const amountInWei = parseUnits(amount, USDC_DECIMALS);
          return sum + amountInWei;
        }, 0n);
      
      return formatUnits(total, USDC_DECIMALS);
    } catch {
      return "0";
    }
  };

  const getActiveChainCount = () => {
    return Object.values(batchState.inputs).filter(amount => {
      const numericAmount = Number(amount);
      return amount && Number.isFinite(numericAmount) && numericAmount > 0;
    }).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="text-xs text-gray-400 uppercase tracking-wide">
          Multi-Chain Batch Deposit
        </div>
        <div className="text-sm text-gray-300">
          Enter deposit amounts for multiple chains and execute them in sequence
        </div>
      </div>

      {/* Chain Input Grid */}
      <div className="space-y-4">
        {SUPPORTED_CHAINS.map((chainId) => {
          const chainBalance = chainBalances[chainId];
          const amount = batchState.inputs[chainId] || "";
          const chainErrors = batchState.errors[chainId] || [];
          const chainWarnings = batchState.warnings[chainId] || [];
          const hasErrors = chainErrors.length > 0;
          const hasWarnings = chainWarnings.length > 0;

          return (
            <div
              key={chainId}
              className={cn(
                "border border-white/10 rounded-lg p-4 space-y-3 transition-colors",
                amount && Number(amount) > 0 && "border-teal-500/30 bg-teal-500/5"
              )}
            >
              {/* Chain Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-teal-400" />
                  </div>
                  <span className="font-mono text-sm text-white">
                    {getChainName(chainId)}
                  </span>
                </div>
                <button
                  onClick={() => onMaxClick(chainId)}
                  disabled={disabled || isProcessing || chainBalance.isLoading}
                  className="text-xs text-teal-400 hover:text-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  MAX
                </button>
              </div>

              {/* Available Balance */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Available Balance</span>
                <div className="flex items-center gap-1">
                  <Image
                    src={getTokenLogo("USDC")}
                    alt="USDC"
                    width={12}
                    height={12}
                    className="rounded-full"
                  />
                  <span className="font-mono text-gray-300">
                    {chainBalance.isLoading ? (
                      "Loading..."
                    ) : chainBalance.error ? (
                      "Error"
                    ) : (
                      `${formatBalance(chainBalance.data)} USDC`
                    )}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => onAmountChange(chainId, e.target.value)}
                  placeholder="0.00"
                  step={stepValue}
                  min="0"
                  inputMode="decimal"
                  disabled={disabled || isProcessing}
                  className={cn(
                    "w-full p-3 bg-transparent border text-white font-mono text-lg focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                    hasErrors
                      ? "border-red-400/60 focus:border-red-400"
                      : hasWarnings
                      ? "border-yellow-400/60 focus:border-yellow-400"
                      : "border-white/10 focus:border-teal-500/50"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">
                  USDC
                </div>
              </div>

              {/* Validation Messages */}
              {hasErrors && (
                <div className="space-y-1">
                  {chainErrors.map((error, index) => (
                    <div
                      key={index}
                      className="text-xs text-red-400 px-2 py-1 border border-red-400/40 rounded bg-red-400/5"
                    >
                      ⚠️ {error}
                    </div>
                  ))}
                </div>
              )}

              {hasWarnings && !hasErrors && (
                <div className="space-y-1">
                  {chainWarnings.map((warning, index) => (
                    <div
                      key={index}
                      className="text-xs text-yellow-400 px-2 py-1 border border-yellow-400/40 rounded bg-yellow-400/5"
                    >
                      💡 {warning}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch Summary */}
      {hasAnyAmount && (
        <div className="border border-teal-500/30 rounded-lg p-4 bg-teal-500/5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Active Chains</span>
              <span className="text-white font-mono">{getActiveChainCount()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Total Amount</span>
              <div className="flex items-center gap-1">
                <Image
                  src={getTokenLogo("USDC")}
                  alt="USDC"
                  width={16}
                  height={16}
                  className="rounded-full"
                />
                <span className="text-white font-mono font-semibold">
                  {getTotalAmount()} USDC
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Estimated Transactions</span>
              <span className="text-gray-400 font-mono">
                {getActiveChainCount() * 2} (Approval + Deposit per chain)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Execute Button */}
      <button
        type="button"
        onClick={onExecuteBatch}
        disabled={isButtonDisabled}
        className={cn(
          "w-full p-4 font-mono uppercase text-sm transition-colors relative",
          !isButtonDisabled
            ? "bg-teal-500 text-white hover:bg-teal-600"
            : "bg-gray-700 text-gray-400 cursor-not-allowed"
        )}
      >
        {isProcessing && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <div className="size-4 border border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <span className={cn(isProcessing && "ml-6")}>
          {isProcessing
            ? "Processing Batch..."
            : `Execute Batch Deposit (${getActiveChainCount()} chains)`}
        </span>
      </button>

      {!address && (
        <div className="text-center text-gray-400 text-sm">
          Connect your wallet to view balances and deposit
        </div>
      )}
    </div>
  );
}
