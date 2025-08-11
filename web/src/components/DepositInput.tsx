"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  SupportedChainId,
  SUPPORTED_CHAINS,
  getChainName,
  USDC_DECIMALS,
} from "@/constant/contracts";
import { useChainBalances } from "@/hooks";
import {
  ChainInput,
  DepositTypeModeToggle,
  ChainDropdown,
  DepositSummary,
  ExecuteButton,
  DepositTypeHeader,
} from "@/components/ui";
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

  // Get balances for all chains
  const ethSepoliaBalance = useChainBalances({
    chainId: SupportedChainId.ETH_SEPOLIA,
  });
  const seiTestnetBalance = useChainBalances({
    chainId: SupportedChainId.SEI_TESTNET,
  });

  const chainBalances = {
    [SupportedChainId.ETH_SEPOLIA]: ethSepoliaBalance.walletBalance,
    [SupportedChainId.SEI_TESTNET]: seiTestnetBalance.walletBalance,
  };

  useEffect(() => {
    if (!isMultiChainMode) {
      setActiveChains(new Set([selectedChainId]));
    }
  }, [isMultiChainMode, selectedChainId]);

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

  const getActiveChainIds = () => {
    return Array.from(activeChains).filter((chainId) => {
      const amount = batchState.inputs[chainId] || "";
      const numericAmount = Number(amount);
      return amount && Number.isFinite(numericAmount) && numericAmount > 0;
    });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-6">
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
          const amount = batchState.inputs[chainId] || "";
          const chainErrors = batchState.errors[chainId] || [];
          const chainWarnings = batchState.warnings[chainId] || [];
          const canRemove = isMultiChainMode && activeChains.size > 1;
          const isSelected = !isMultiChainMode && chainId === selectedChainId;

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
              isSelected={isSelected}
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

      {!address && (
        <div className="text-center text-gray-400 text-sm">
          Connect your wallet to view balances and deposit
        </div>
      )}
    </div>
  );
}
