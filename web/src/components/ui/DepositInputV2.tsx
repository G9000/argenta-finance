"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { SupportedChainId, SUPPORTED_CHAINS } from "@/constant/chains";
import { getUsdc } from "@/constant/tokens";
import { useChainBalances } from "@/hooks";
import { useInputValidation } from "@/hooks/useInputValidation";
import { ChainInput, ChainDropdown, ExecuteButton } from "@/components/ui";

interface DepositInputProps {
  inputs: Record<SupportedChainId, string>;
  onAmountChange: (chainId: SupportedChainId, amount: string) => void;
  onMaxClick: (chainId: SupportedChainId) => void;
  onExecuteDeposit: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  selectedChainId: SupportedChainId;
}

export function DepositInputV2({
  inputs,
  onAmountChange,
  onMaxClick,
  onExecuteDeposit,
  disabled = false,
  isProcessing = false,
  selectedChainId,
}: DepositInputProps) {
  const { address } = useAccount();
  const [activeChains, setActiveChains] = useState<Set<SupportedChainId>>(
    new Set([selectedChainId])
  );

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

  const validationInputs = Array.from(activeChains).map((chainId) => ({
    chainId,
    amount: inputs[chainId] || "",
    decimals: getUsdc(chainId).decimals,
    balanceWei: chainBalances[chainId]?.data,
  }));

  const { validChains, canProceed, firstError, hasEmptyAmounts } =
    useInputValidation(validationInputs);

  const isButtonDisabled = !canProceed || disabled || isProcessing;
  const availableChains = SUPPORTED_CHAINS.filter(
    (chainId) => !activeChains.has(chainId)
  );

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
      onAmountChange(chainId, "");
    }
  };

  const getValidationForChain = (chainId: SupportedChainId) => {
    return validChains.find((v) => v.chainId === chainId);
  };

  const getChainErrors = (chainId: SupportedChainId): string[] => {
    const validation = getValidationForChain(chainId);
    return validation?.error ? [validation.error] : [];
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white font-mono">
            MULTI-CHAIN DEPOSIT
          </h2>
          <div className="text-sm text-gray-400">
            {validChains.filter((v) => v.isValid).length} chain(s) active
          </div>
        </div>

        <ChainDropdown
          availableChains={availableChains}
          onAddChain={handleAddChain}
          disabled={disabled}
          isProcessing={isProcessing}
        />
      </div>

      <div className="space-y-4">
        {Array.from(activeChains).map((chainId) => {
          const chainBalance = chainBalances[chainId];
          const amount = inputs[chainId] || "";
          const chainErrors = getChainErrors(chainId);
          const canRemove = activeChains.size > 1;

          return (
            <ChainInput
              key={chainId}
              chainId={chainId}
              amount={amount}
              errors={chainErrors}
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

      <ExecuteButton
        onClick={onExecuteDeposit}
        disabled={isButtonDisabled}
        isProcessing={isProcessing}
        text={
          isProcessing
            ? "Processing Deposit..."
            : firstError && !hasEmptyAmounts
            ? firstError
            : canProceed
            ? "Execute Deposit"
            : "Enter Amount to Deposit"
        }
      />

      {!address && (
        <div className="text-center text-gray-400 text-sm">
          Connect your wallet to view balances and deposit
        </div>
      )}
    </div>
  );
}
