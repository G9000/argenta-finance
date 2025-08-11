"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  SupportedChainId,
  SUPPORTED_CHAINS,
  getChainName,
  USDC_DECIMALS,
  getUsdcAddress,
} from "@/constant/contracts";
import { cn } from "@/lib/utils";
import { formatBalance } from "@/lib/format";
import { getTokenLogo } from "@/lib/tokens";
import { useChainBalances } from "@/hooks";
import type { BatchDepositState } from "@/types/ui-state";

interface DepositInputProps {
  batchState: BatchDepositState;
  onAmountChange: (chainId: SupportedChainId, amount: string) => void;
  onMaxClick: (chainId: SupportedChainId) => void;
  onExecuteDeposit: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  selectedChainId: SupportedChainId;
}

export function DepositInput({
  batchState,
  onAmountChange,
  onMaxClick,
  onExecuteDeposit,
  disabled = false,
  isProcessing = false,
  selectedChainId,
}: DepositInputProps) {
  const { address } = useAccount();
  const [isMultiChainMode, setIsMultiChainMode] = useState(false);
  const [activeChains, setActiveChains] = useState<Set<SupportedChainId>>(
    new Set([selectedChainId])
  );
  const [showChainDropdown, setShowChainDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get balances for all chains (call hooks at top level)
  const ethSepoliaBalance = useChainBalances({
    chainId: SupportedChainId.ETH_SEPOLIA,
  });
  const seiTestnetBalance = useChainBalances({
    chainId: SupportedChainId.SEI_TESTNET,
  });

  // Create balance mapping
  const chainBalances = {
    [SupportedChainId.ETH_SEPOLIA]: ethSepoliaBalance.walletBalance,
    [SupportedChainId.SEI_TESTNET]: seiTestnetBalance.walletBalance,
  };

  const stepValue =
    USDC_DECIMALS > 0 ? `0.${"0".repeat(USDC_DECIMALS - 1)}1` : "1";

  // Update active chains when switching modes
  useEffect(() => {
    if (!isMultiChainMode) {
      setActiveChains(new Set([selectedChainId]));
    }
  }, [isMultiChainMode, selectedChainId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowChainDropdown(false);
      }
    };

    if (showChainDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showChainDropdown]);

  const hasAnyAmount = Array.from(activeChains).some((chainId) => {
    const amount = batchState.inputs[chainId] || "";
    const numericAmount = Number(amount);
    return amount && Number.isFinite(numericAmount) && numericAmount > 0;
  });

  const isButtonDisabled =
    !hasAnyAmount || !batchState.isValid || disabled || isProcessing;

  const getTotalAmount = () => {
    try {
      const total = Array.from(activeChains)
        .map((chainId) => batchState.inputs[chainId] || "")
        .filter((amount) => amount && Number(amount) > 0)
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
    return Array.from(activeChains).filter((chainId) => {
      const amount = batchState.inputs[chainId] || "";
      const numericAmount = Number(amount);
      return amount && Number.isFinite(numericAmount) && numericAmount > 0;
    }).length;
  };

  const getButtonText = () => {
    const activeChains = getActiveChainCount();
    if (isProcessing) {
      return activeChains > 1
        ? "Processing Multi-Chain Deposit..."
        : "Processing Deposit...";
    }

    if (activeChains === 0) {
      return "Enter Amount to Deposit";
    } else if (activeChains === 1) {
      return "Execute Deposit";
    } else {
      return `Execute Multi-Chain Deposit (${activeChains} chains)`;
    }
  };

  const getAvailableChains = () => {
    return SUPPORTED_CHAINS.filter((chainId) => !activeChains.has(chainId));
  };

  const handleAddChain = (chainId: SupportedChainId) => {
    setActiveChains((prev) => new Set([...prev, chainId]));
    setShowChainDropdown(false);
  };

  const handleRemoveChain = (chainId: SupportedChainId) => {
    if (activeChains.size > 1) {
      setActiveChains((prev) => {
        const newSet = new Set(prev);
        newSet.delete(chainId);
        return newSet;
      });
      // Clear the amount for the removed chain
      onAmountChange(chainId, "");
    }
  };

  const handleToggleMode = () => {
    const newMode = !isMultiChainMode;
    setIsMultiChainMode(newMode);

    if (!newMode) {
      // Single mode: keep only the selected chain
      setActiveChains(new Set([selectedChainId]));
      // Clear amounts for other chains
      SUPPORTED_CHAINS.forEach((chainId) => {
        if (chainId !== selectedChainId) {
          onAmountChange(chainId, "");
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              Deposit USDC
            </div>
            <div className="text-sm text-gray-300">
              {isMultiChainMode
                ? "Enter amounts for multiple chains. All deposits will be executed in sequence."
                : `Deposit to ${getChainName(selectedChainId)} only.`}
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-3 p-3 border border-white/10 rounded-lg bg-gray-800/50">
            <span
              className={cn(
                "text-xs font-medium transition-colors",
                !isMultiChainMode ? "text-teal-400" : "text-gray-400"
              )}
            >
              Single Chain
            </span>
            <button
              onClick={handleToggleMode}
              disabled={disabled || isProcessing}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500/50",
                isMultiChainMode ? "bg-teal-500" : "bg-gray-600"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                  isMultiChainMode ? "translate-x-6" : "translate-x-0.5"
                )}
              />
            </button>
            <span
              className={cn(
                "text-xs font-medium transition-colors",
                isMultiChainMode ? "text-teal-400" : "text-gray-400"
              )}
            >
              Multi Chain
            </span>
          </div>
        </div>

        {/* Add Chain Button (Multi-chain mode only) */}
        {isMultiChainMode && getAvailableChains().length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowChainDropdown(!showChainDropdown)}
              disabled={disabled || isProcessing}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs border border-teal-500/30 rounded-lg",
                "hover:border-teal-500/50 transition-colors disabled:opacity-50",
                "text-teal-400 bg-teal-500/5"
              )}
            >
              <span>+ Add Chain</span>
              <div
                className={cn(
                  "transition-transform",
                  showChainDropdown ? "rotate-180" : ""
                )}
              >
                ▼
              </div>
            </button>

            {/* Chain Dropdown */}
            {showChainDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-white/10 rounded-lg shadow-lg z-10">
                {getAvailableChains().map((chainId) => (
                  <button
                    key={chainId}
                    onClick={() => handleAddChain(chainId)}
                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-teal-500/10 transition-colors first:rounded-t-lg last:rounded-b-lg"
                  >
                    {getChainName(chainId)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chain Input Grid */}
      <div className="space-y-4">
        {Array.from(activeChains).map((chainId) => {
          const chainBalance = chainBalances[chainId];
          const amount = batchState.inputs[chainId] || "";
          const chainErrors = batchState.errors[chainId] || [];
          const chainWarnings = batchState.warnings[chainId] || [];
          const hasErrors = chainErrors.length > 0;
          const hasWarnings = chainWarnings.length > 0;
          const canRemove = isMultiChainMode && activeChains.size > 1;

          return (
            <div
              key={chainId}
              className={cn(
                "border border-white/10 rounded-lg p-4 space-y-3 transition-colors",
                amount &&
                  Number(amount) > 0 &&
                  "border-teal-500/30 bg-teal-500/5",
                !isMultiChainMode &&
                  chainId === selectedChainId &&
                  "ring-1 ring-teal-500/30"
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
                  {canRemove && (
                    <button
                      onClick={() => handleRemoveChain(chainId)}
                      disabled={disabled || isProcessing}
                      className="ml-2 text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      ✕
                    </button>
                  )}
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
                    {chainBalance.isLoading
                      ? "Loading..."
                      : chainBalance.error
                      ? "Error"
                      : `${formatBalance(chainBalance.data)} USDC`}
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

      {/* Summary */}
      {hasAnyAmount && (
        <div className="border border-teal-500/30 rounded-lg p-4 bg-teal-500/5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Active Chains</span>
              <span className="text-white font-mono">
                {getActiveChainCount()}
              </span>
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
        onClick={onExecuteDeposit}
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
        <span className={cn(isProcessing && "ml-6")}>{getButtonText()}</span>
      </button>

      {!address && (
        <div className="text-center text-gray-400 text-sm">
          Connect your wallet to view balances and deposit
        </div>
      )}
    </div>
  );
}
