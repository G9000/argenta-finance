"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { SupportedChainId, SUPPORTED_CHAINS } from "@/constant/chains";
import { getUsdc } from "@/constant/tokens";
import { useChainBalances, useIndividualChainOperations } from "@/hooks";
import { useInputValidation } from "@/hooks/useInputValidation";
import { useGasEstimation } from "@/hooks/useGasEstimation";
import {
  ChainInput,
  ChainDropdown,
  ExecuteButton,
  DepositSummary,
} from "@/components/ui";
import { formatUnits, parseUnits } from "viem/utils";

// Helper function to validate amount using BigInt for precision
const isValidAmount = (amount: string, decimals: number): boolean => {
  if (!amount) return false;
  try {
    const amountWei = parseUnits(amount, decimals);
    return amountWei > 0n;
  } catch {
    return false;
  }
};

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
  const {
    approveChain,
    depositChain,
    isOperating,
    operatingChain,
    operationType,
    getChainTransactions,
  } = useIndividualChainOperations();
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

  const {
    validChains,
    canProceed: _canProceed,
    firstError,
    hasEmptyAmounts,
  } = useInputValidation(validationInputs);

  const activeChainIds = Array.from(activeChains).filter((chainId) => {
    const amount = inputs[chainId] || "";
    return isValidAmount(amount, getUsdc(chainId).decimals);
  });

  const hasAnyAmount = activeChainIds.length > 0;

  const chainAmountsForGas = Array.from(activeChains)
    .map((chainId) => ({
      chainId,
      amount: inputs[chainId] || "",
    }))
    .filter((item) =>
      isValidAmount(item.amount, getUsdc(item.chainId).decimals)
    );

  const {
    gasEstimates,
    totalGasCostFormattedETH,
    isLoading: isGasLoading,
    hasErrors: hasGasErrors,
    needsApprovalOnAnyChain,
    allChainsApproved,
    canProceedWithDeposit,
    hasAllowanceLoading,
    hasAllowanceErrors,
    allAllowancesLoaded,
  } = useGasEstimation({
    chainAmounts: chainAmountsForGas,
    enabled: hasAnyAmount && address !== undefined,
  });

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

  const getTotalAmount = () => {
    try {
      const chainAmounts = Array.from(activeChains)
        .map((chainId) => ({
          chainId,
          amount: inputs[chainId] || "",
        }))
        .filter(({ chainId, amount }) =>
          isValidAmount(amount, getUsdc(chainId).decimals)
        );

      if (chainAmounts.length === 0) {
        return "0";
      }

      const total = chainAmounts.reduce((sum, { chainId, amount }) => {
        const usdcDecimals = getUsdc(chainId).decimals;
        const amountInWei = parseUnits(amount, usdcDecimals);
        return sum + amountInWei;
      }, 0n);

      const firstChain = chainAmounts[0].chainId;
      const usdcDecimals = getUsdc(firstChain).decimals;
      return formatUnits(total, usdcDecimals);
    } catch {
      return "0";
    }
  };

  const totalAmount = useMemo(() => getTotalAmount(), [activeChains, inputs]);

  const handleApprove = async (chainId: number) => {
    const amount = inputs[chainId as SupportedChainId];
    console.log("handleApprove called", { chainId, amount });
    if (!amount) {
      console.log("No amount found for chain", chainId);
      return;
    }

    try {
      console.log("Starting approval for chain", chainId, "amount", amount);
      await approveChain(chainId as SupportedChainId, amount);
      console.log("Approval completed for chain", chainId);
    } catch (error) {
      // Error is handled by the hook
      console.error("Approval failed:", error);
    }
  };

  const handleDeposit = async (chainId: number) => {
    const amount = inputs[chainId as SupportedChainId];
    console.log("handleDeposit called", { chainId, amount });
    if (!amount) {
      console.log("No amount found for chain", chainId);
      return;
    }

    try {
      console.log("Starting deposit for chain", chainId, "amount", amount);
      await depositChain(chainId as SupportedChainId, amount);
      console.log("Deposit completed for chain", chainId);
    } catch (error) {
      // Error is handled by the hook
      console.error("Deposit failed:", error);
    }
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
      {hasAnyAmount && (
        <>
          <DepositSummary
            activeChainIds={activeChainIds}
            totalAmount={totalAmount}
            gasEstimates={gasEstimates}
            totalGasCost={totalGasCostFormattedETH}
            isGasLoading={isGasLoading}
            gasError={hasGasErrors}
            needsApprovalOnAnyChain={needsApprovalOnAnyChain}
            allChainsApproved={allChainsApproved}
            hasAllowanceLoading={hasAllowanceLoading}
            hasAllowanceErrors={hasAllowanceErrors}
            allAllowancesLoaded={allAllowancesLoaded}
            onApprove={handleApprove}
            onDeposit={handleDeposit}
            individualOperationState={{
              isOperating,
              operatingChain,
              operationType,
            }}
            getChainTransactions={getChainTransactions}
          />

          <div className="w-1/3 ml-auto">
            <ExecuteButton
              onClick={onExecuteDeposit}
              disabled={!canProceedWithDeposit || disabled || isProcessing}
              isProcessing={isProcessing}
              text={
                isProcessing
                  ? "Processing Deposit..."
                  : needsApprovalOnAnyChain
                  ? "Approve tokens"
                  : firstError && !hasEmptyAmounts
                  ? firstError
                  : canProceedWithDeposit
                  ? "Execute Deposit"
                  : "Enter Amount to Deposit"
              }
            />
          </div>
        </>
      )}

      {!address && (
        <div className="text-center text-gray-400 text-sm">
          Connect your wallet to view balances and deposit
        </div>
      )}
    </div>
  );
}
