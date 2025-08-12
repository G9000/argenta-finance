import { useState, useCallback, useMemo } from "react";
import { parseUnits } from "viem";
import { SupportedChainId, SUPPORTED_CHAINS } from "@/constant/chains";
import { useChainBalances } from "./useChainBalances";
import { CommonValidations } from "@/lib/validators";
import { VALIDATION_MESSAGES } from "@/constant/operation-constants";
import type { BatchDepositState } from "@/types/ui-state";

interface UseBatchDepositValidationParams {
  enabled?: boolean;
}

export function useBatchDepositValidation({
  enabled = true,
}: UseBatchDepositValidationParams = {}) {
  const [inputs, setInputs] = useState<Record<SupportedChainId, string>>(() =>
    SUPPORTED_CHAINS.reduce((acc, chainId) => {
      acc[chainId] = "";
      return acc;
    }, {} as Record<SupportedChainId, string>)
  );

  const ethSepoliaBalance = useChainBalances({
    chainId: SupportedChainId.ETH_SEPOLIA,
    enabled,
  });
  const seiTestnetBalance = useChainBalances({
    chainId: SupportedChainId.SEI_TESTNET,
    enabled,
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

  const updateAmount = useCallback(
    (chainId: SupportedChainId, amount: string) => {
      setInputs((prev) => ({
        ...prev,
        [chainId]: amount,
      }));
    },
    []
  );

  const setMaxAmount = useCallback(
    (chainId: SupportedChainId) => {
      const balance = chainBalances[chainId];
      if (balance.data) {
        const maxAmount = (Number(balance.data) / Math.pow(10, 6)).toString();
        updateAmount(chainId, maxAmount);
      }
    },
    [chainBalances, updateAmount]
  );

  const clearAll = useCallback(() => {
    setInputs(
      SUPPORTED_CHAINS.reduce((acc, chainId) => {
        acc[chainId] = "";
        return acc;
      }, {} as Record<SupportedChainId, string>)
    );
  }, []);

  const batchState = useMemo((): BatchDepositState => {
    const errors = SUPPORTED_CHAINS.reduce((acc, chainId) => {
      acc[chainId] = [];
      return acc;
    }, {} as Record<SupportedChainId, string[]>);

    const warnings = SUPPORTED_CHAINS.reduce((acc, chainId) => {
      acc[chainId] = [];
      return acc;
    }, {} as Record<SupportedChainId, string[]>);

    let isValid = false;
    let hasAnyAmount = false;

    SUPPORTED_CHAINS.forEach((chainId) => {
      const amount = inputs[chainId];
      const chainBalance = chainBalances[chainId];

      if (!amount || amount === "0") {
        return;
      }

      hasAnyAmount = true;

      const amountValidation = CommonValidations.amount(amount);
      if (!amountValidation.isValid) {
        errors[chainId].push(amountValidation.error!);
        return;
      }

      if (chainBalance.error) {
        warnings[chainId].push(
          VALIDATION_MESSAGES.WARNINGS.WALLET_BALANCE_UNKNOWN
        );
      } else if (chainBalance.data !== undefined) {
        try {
          const amountInWei = parseUnits(amount, 6);
          if (amountInWei > chainBalance.data) {
            const maxAmount = (
              Number(chainBalance.data) / Math.pow(10, 6)
            ).toFixed(6);
            errors[chainId].push(
              VALIDATION_MESSAGES.ERRORS.INSUFFICIENT_WALLET_BALANCE(
                "USDC",
                maxAmount
              )
            );
          }
        } catch {
          errors[chainId].push(
            VALIDATION_MESSAGES.ERRORS.INVALID_AMOUNT_FORMAT
          );
        }
      }

      const numericAmount = Number(amount);
      if (numericAmount > 10000) {
        warnings[chainId].push(
          VALIDATION_MESSAGES.WARNINGS.LARGE_TRANSACTION_AMOUNT
        );
      }
    });

    const hasValidAmounts = SUPPORTED_CHAINS.some((chainId) => {
      const amount = inputs[chainId];
      const hasAmount = amount && Number(amount) > 0;
      const hasErrors = errors[chainId].length > 0;
      return hasAmount && !hasErrors;
    });

    isValid = hasAnyAmount && hasValidAmounts;

    let totalAmount = "0";
    try {
      const total = SUPPORTED_CHAINS.reduce((sum, chainId) => {
        const amount = inputs[chainId];
        if (amount && Number(amount) > 0 && errors[chainId].length === 0) {
          const amountInWei = parseUnits(amount, 6);
          return sum + amountInWei;
        }
        return sum;
      }, 0n);

      totalAmount = (Number(total) / Math.pow(10, 6)).toString();
    } catch {
      totalAmount = "0";
    }

    return {
      inputs,
      isValid,
      totalAmount,
      errors,
      warnings,
    };
  }, [inputs, chainBalances]);

  const getValidChainAmounts = useCallback(() => {
    return SUPPORTED_CHAINS.filter((chainId) => {
      const amount = inputs[chainId];
      const hasAmount = amount && Number(amount) > 0;
      const hasErrors = batchState.errors[chainId].length > 0;
      return hasAmount && !hasErrors;
    }).map((chainId) => ({
      chainId,
      amount: inputs[chainId],
    }));
  }, [inputs, batchState.errors]);

  return {
    batchState,
    updateAmount,
    setMaxAmount,
    clearAll,
    getValidChainAmounts,
    chainBalances,
  };
}
