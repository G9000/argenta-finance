"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { SupportedChainId, SUPPORTED_CHAINS } from "@/constant/chains";
import { getUsdc } from "@/constant/tokens";
import { useChainBalances } from "@/hooks";
import { useMultiChainOperations } from "@/hooks/useMultiChainOperations";
import {
  useIsAnyChainOperating,
  useOperationsStore,
  useHasPendingTransactions,
  getChainState,
  getChainTransactions,
} from "@/stores/operationsStore";
import { useInputValidation } from "@/hooks/useInputValidation";
import { useAllowanceCheck } from "@/hooks/useAllowanceCheck";
import { ChainInput, ChainDropdown, DepositSummary } from "@/components/ui";
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
  // Multi-chain operation state
  getChainState?: (chainId: SupportedChainId) => any;
  getChainTransactions?: (chainId: SupportedChainId) => any;
  clearError?: (chainId: SupportedChainId) => void;
  isAnyChainOperating?: boolean;
  queueDeposit?: (chainId: SupportedChainId, amount: string) => void;
  queueApprovalAndDeposit?: (chainId: SupportedChainId, amount: string) => void;
}

export function DepositInputV2({
  inputs,
  onAmountChange,
  onMaxClick,
  onExecuteDeposit,
  disabled = false,
  isProcessing = false,
  selectedChainId,
  getChainState: propGetChainState,
  getChainTransactions: propGetChainTransactions,
  clearError: propClearError,
  isAnyChainOperating: propIsAnyChainOperating,
  queueDeposit: propQueueDeposit,
  queueApprovalAndDeposit: propQueueApprovalAndDeposit,
}: DepositInputProps) {
  const { address } = useAccount();

  const {
    queueDeposit: hookQueueDeposit,
    queueApprovalAndDeposit: hookQueueApprovalAndDeposit,
  } = useMultiChainOperations();
  const hookIsAnyChainOperating = useIsAnyChainOperating();
  const store = useOperationsStore();
  const hookClearError = store.clearChainError;

  const queueDeposit = propQueueDeposit || hookQueueDeposit;
  const queueApprovalAndDeposit =
    propQueueApprovalAndDeposit || hookQueueApprovalAndDeposit;
  const getChainStateFunc = propGetChainState || getChainState;
  const getChainTransactionsFunc =
    propGetChainTransactions || getChainTransactions;
  const clearError = propClearError || hookClearError;
  const _isAnyChainOperating =
    propIsAnyChainOperating ?? hookIsAnyChainOperating;
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

  const { validChains, canProceed: _canProceed } =
    useInputValidation(validationInputs);

  const activeChainIds = Array.from(activeChains).filter((chainId) => {
    const amount = inputs[chainId] || "";
    return isValidAmount(amount, getUsdc(chainId).decimals);
  });

  const hasPendingTransactions = useHasPendingTransactions();
  const hasAnyAmount = activeChainIds.length > 0 || hasPendingTransactions;

  // Include chains that have any transactions in store to reflect in summary UI
  const chainsWithAnyTx = useOperationsStore((s) => s.chainTransactions);
  const activeChainIdsForSummary = useMemo(() => {
    const idsFromAmounts = new Set(activeChainIds);
    Object.keys(chainsWithAnyTx).forEach((id) => {
      idsFromAmounts.add(Number(id) as SupportedChainId);
    });
    return Array.from(idsFromAmounts);
  }, [activeChainIds, chainsWithAnyTx]);

  const chainAmountsForAllowance = Array.from(activeChains)
    .map((chainId) => ({
      chainId,
      amount: inputs[chainId] || "",
    }))
    .filter((item) =>
      isValidAmount(item.amount, getUsdc(item.chainId).decimals)
    );

  const {
    allowanceData,
    needsApprovalOnAnyChain,
    allChainsApproved,
    hasAllowanceLoading,
    hasAllowanceErrors,
    allAllowancesLoaded,
  } = useAllowanceCheck({
    chainAmounts: chainAmountsForAllowance,
    enabled: hasAnyAmount && address !== undefined,
  });

  // Create mock gas estimates for compatibility with existing UI components
  const gasEstimates = useMemo(() => {
    return allowanceData.map((allowance) => ({
      chainId: allowance.chainId,
      approvalGas: null,
      depositGas: null,
      totalGasCost: 0n,
      totalGasCostFormatted: "0",
      isLoading: false,
      error: null,
      hasEnoughAllowance: allowance.hasEnoughAllowance,
      needsApproval: allowance.needsApproval,
      allowanceState: allowance.allowanceState,
      canAffordGas: true, // Assume user can afford gas since we're not checking it anymore
      nativeBalance: 0n,
      approvalSimulation: null,
      depositSimulation: null,
    }));
  }, [allowanceData]);

  const hasGasErrors = false; // No gas errors since we don't estimate gas
  const totalGasCostFormattedETH = "0"; // No gas cost estimation

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

    if (!amount) return;
    try {
      queueApprovalAndDeposit(chainId as SupportedChainId, amount);
    } catch (error) {
      console.error("Queue approval and deposit failed:", error);
    }
  };

  const handleDeposit = async (chainId: number) => {
    const amount = inputs[chainId as SupportedChainId];
    if (!amount) return;
    try {
      queueDeposit(chainId as SupportedChainId, amount);
    } catch (error) {
      console.error("Queue deposit failed:", error);
    }
  };

  const handleRetry = async (chainId: number) => {
    const amount = inputs[chainId as SupportedChainId];
    if (!amount) return;
    try {
      const transactions = getChainTransactionsFunc(
        chainId as SupportedChainId
      );

      if (transactions.depositConfirmedTxHash) {
        return;
      }

      clearError?.(chainId as SupportedChainId);

      if (transactions.approvalConfirmedTxHash) {
        queueDeposit(chainId as SupportedChainId, amount);
      } else {
        queueApprovalAndDeposit(chainId as SupportedChainId, amount);
      }
    } catch (error) {
      console.error("Retry failed:", error);
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

      <DepositSummary
        activeChainIds={activeChainIdsForSummary}
        totalAmount={totalAmount}
        gasEstimates={gasEstimates}
        totalGasCost={totalGasCostFormattedETH}
        gasError={hasGasErrors}
        needsApprovalOnAnyChain={needsApprovalOnAnyChain}
        allChainsApproved={allChainsApproved}
        hasAllowanceLoading={hasAllowanceLoading}
        hasAllowanceErrors={hasAllowanceErrors}
        allAllowancesLoaded={allAllowancesLoaded}
        onApprove={handleApprove}
        onDeposit={handleDeposit}
        onRetry={handleRetry}
        onBatchExecute={onExecuteDeposit}
        getChainState={getChainStateFunc}
        getChainTransactions={getChainTransactionsFunc}
        clearError={clearError}
      />

      {/* <div className="w-1/3 ml-auto">
        <ExecuteButton
          onClick={onExecuteDeposit}
          disabled={
            !canProceedWithDeposit ||
            disabled ||
            isProcessing ||
            isAnyChainOperating
          }
          isProcessing={isProcessing || isAnyChainOperating}
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
      </div> */}

      {!address && (
        <div className="text-center text-gray-400 text-sm">
          Connect your wallet to view balances and deposit
        </div>
      )}
    </div>
  );
}
