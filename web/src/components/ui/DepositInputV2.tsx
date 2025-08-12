"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import {
  SupportedChainId,
  SUPPORTED_CHAINS,
  getChainName,
} from "@/constant/chains";
import { getUsdc } from "@/constant/tokens";
import { useChainBalances } from "@/hooks";
import { useInputValidation } from "@/hooks/useInputValidation";
import {
  ChainInput,
  DepositTypeModeToggle,
  ChainDropdown,
  DepositSummary,
  ExecuteButton,
  DepositTypeHeader,
} from "@/components/ui";

interface DepositInputProps {
  inputs: Record<SupportedChainId, string>;
  onAmountChange: (chainId: SupportedChainId, amount: string) => void;
  onMaxClick: (chainId: SupportedChainId) => void;
  onExecuteDeposit: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  selectedChainId: SupportedChainId;
  canRetryAll?: boolean;
  onRetryAllFailed?: () => void;
  onReset?: () => void;
  executeLocked?: boolean;
}

export function DepositInputV2({
  inputs,
  onAmountChange,
  onMaxClick,
  onExecuteDeposit,
  disabled = false,
  isProcessing = false,
  selectedChainId,
  canRetryAll,
  onRetryAllFailed,
  onReset,
  executeLocked = false,
}: DepositInputProps) {
  const { address } = useAccount();
  const [isMultiChainMode, setIsMultiChainMode] = useState(false);
  const [activeChains, setActiveChains] = useState<Set<SupportedChainId>>(
    new Set([selectedChainId])
  );

  // Get balances for all chains (for max button functionality)
  const ethSepoliaBalance = useChainBalances({
    chainId: SupportedChainId.ETH_SEPOLIA,
  });
  const seiTestnetBalance = useChainBalances({
    chainId: SupportedChainId.SEI_TESTNET,
  });

  const chainBalances = {
    [SupportedChainId.ETH_SEPOLIA]: {
      data: ethSepoliaBalance.data?.walletBalance,
      isLoading: ethSepoliaBalance.isLoading,
      error: ethSepoliaBalance.error,
    },
    [SupportedChainId.SEI_TESTNET]: {
      data: seiTestnetBalance.data?.walletBalance,
      isLoading: seiTestnetBalance.isLoading,
      error: seiTestnetBalance.error,
    },
  };

  // Prepare inputs for validation
  const validationInputs = Array.from(activeChains).map((chainId) => ({
    chainId,
    amount: inputs[chainId] || "",
    decimals: getUsdc(chainId).decimals,
    balanceWei: chainBalances[chainId]?.data,
  }));

  const { validChains, canProceed, firstError, hasEmptyAmounts } =
    useInputValidation(validationInputs);

  useEffect(() => {
    if (!isMultiChainMode) {
      setActiveChains(new Set([selectedChainId]));
    }
  }, [isMultiChainMode, selectedChainId]);

  // Helper functions for validation results
  const getValidationForChain = (chainId: SupportedChainId) => {
    return validChains.find((v) => v.chainId === chainId);
  };

  const hasAnyAmount = Array.from(activeChains).some((chainId) => {
    const amount = inputs[chainId] || "";
    const numericAmount = Number(amount);
    return amount && Number.isFinite(numericAmount) && numericAmount > 0;
  });

  const isButtonDisabled =
    !hasAnyAmount || !canProceed || disabled || isProcessing || executeLocked;

  const getTotalAmount = () => {
    try {
      const total = validChains
        .filter((v) => v.isValid)
        .reduce((sum, validation) => sum + validation.amountWei, 0n);

      // Use decimals from the first active chain (all USDC tokens should have same decimals)
      const firstChain = Array.from(activeChains)[0];
      const usdcDecimals = getUsdc(firstChain).decimals;
      return formatUnits(total, usdcDecimals);
    } catch {
      return "0";
    }
  };

  const getActiveChainCount = () => {
    return validChains.filter((v) => v.isValid).length;
  };

  const getActiveChainIds = () => {
    return validChains.filter((v) => v.isValid).map((v) => v.chainId);
  };

  const getButtonText = () => {
    const activeChains = getActiveChainCount();
    if (isProcessing) {
      return activeChains > 1
        ? "Processing Multi-Chain Deposit..."
        : "Processing Deposit...";
    }

    // Show first error if there is one and user has entered amounts
    if (firstError && !hasEmptyAmounts) return firstError;
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
      setActiveChains(new Set([selectedChainId]));
      SUPPORTED_CHAINS.forEach((chainId) => {
        if (chainId !== selectedChainId) {
          onAmountChange(chainId, "");
        }
      });
    }
  };

  // Convert validation errors to the format expected by ChainInput
  const getChainErrors = (chainId: SupportedChainId): string[] => {
    const validation = getValidationForChain(chainId);
    return validation?.error ? [validation.error] : [];
  };

  const getChainWarnings = (chainId: SupportedChainId): string[] => {
    const validation = getValidationForChain(chainId);
    const warnings: string[] = [];

    // Show normalized amount as a helpful hint when it differs from input
    if (
      validation?.normalizedAmount &&
      validation.normalizedAmount !== inputs[chainId]?.trim()
    ) {
      warnings.push(
        `Input will be processed as: ${validation.normalizedAmount}`
      );
    }

    return warnings;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-start justify-between gap-6">
          <DepositTypeHeader
            isMultiChainMode={isMultiChainMode}
            selectedChainName={getChainName(selectedChainId)}
            activeChainCount={getActiveChainCount()}
          />

          <DepositTypeModeToggle
            isMultiChainMode={isMultiChainMode}
            onToggle={handleToggleMode}
            disabled={disabled}
            isProcessing={isProcessing}
          />
        </div>

        {isMultiChainMode && (
          <ChainDropdown
            availableChains={getAvailableChains()}
            onAddChain={handleAddChain}
            disabled={disabled}
            isProcessing={isProcessing}
          />
        )}
      </div>

      <div className="space-y-4">
        {Array.from(activeChains).map((chainId) => {
          const chainBalance = chainBalances[chainId];
          const amount = inputs[chainId] || "";
          const chainErrors = getChainErrors(chainId);
          const chainWarnings = getChainWarnings(chainId);
          const canRemove = isMultiChainMode && activeChains.size > 1;

          return (
            <ChainInput
              key={chainId}
              chainId={chainId}
              amount={amount}
              errors={chainErrors}
              warnings={chainWarnings}
              balance={chainBalance}
              onAmountChange={(amount) => onAmountChange(chainId, amount)}
              onMaxClick={() => onMaxClick(chainId)}
              onRemove={
                canRemove ? () => handleRemoveChain(chainId) : undefined
              }
              canRemove={canRemove}
              disabled={disabled}
              isProcessing={isProcessing}
            />
          );
        })}
      </div>

      {hasAnyAmount && (
        <DepositSummary
          activeChainIds={getActiveChainIds()}
          totalAmount={getTotalAmount()}
        />
      )}

      <ExecuteButton
        onClick={onExecuteDeposit}
        disabled={isButtonDisabled}
        isProcessing={isProcessing}
        text={getButtonText()}
      />

      {(() => {
        const showReset = Boolean(
          onReset &&
            (hasAnyAmount || isProcessing || executeLocked || canRetryAll)
        );
        const showActions = Boolean(canRetryAll || showReset);
        if (!showActions) return null;
        return (
          <div className="flex gap-3">
            {canRetryAll && onRetryAllFailed && (
              <button
                onClick={onRetryAllFailed}
                disabled={isProcessing}
                className={cn(
                  "flex-1 p-3 font-mono uppercase tracking-wide border whitespace-nowrap transition-colors",
                  isProcessing
                    ? "bg-gray-700 text-gray-300 cursor-not-allowed border-gray-700"
                    : "bg-gradient-to-br from-teal-500/90 to-teal-600/90 border-teal-500/60 text-white hover:from-teal-500 hover:to-teal-600"
                )}
              >
                {isProcessing ? "Retrying..." : "Retry All Failed"}
              </button>
            )}
            {showReset && onReset && (
              <button
                onClick={onReset}
                disabled={isProcessing}
                className="flex-1 p-3 font-mono uppercase tracking-wide border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        );
      })()}

      {!address && (
        <div className="text-center text-gray-400 text-sm">
          Connect your wallet to view balances and deposit
        </div>
      )}
    </div>
  );
}
