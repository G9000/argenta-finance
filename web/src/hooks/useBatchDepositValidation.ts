import { useState, useCallback, useMemo } from "react";
import { parseUnits } from "viem";
import {
  SupportedChainId,
  SUPPORTED_CHAINS,
  USDC_DECIMALS,
} from "@/lib/contracts";
import { useChainBalances } from "./useChainBalances";
import { CommonValidations } from "@/lib/validators";
import type { BatchDepositState } from "@/types/operations";

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

  const chainBalances = SUPPORTED_CHAINS.reduce((acc, chainId) => {
    const { walletBalance } = useChainBalances({
      chainId,
      enabled,
    });
    acc[chainId] = walletBalance;
    return acc;
  }, {} as Record<SupportedChainId, ReturnType<typeof useChainBalances>["walletBalance"]>);

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
        const maxAmount = (
          Number(balance.data) / Math.pow(10, USDC_DECIMALS)
        ).toString();
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
        warnings[chainId].push("Unable to verify wallet balance");
      } else if (chainBalance.data !== undefined) {
        try {
          const amountInWei = parseUnits(amount, USDC_DECIMALS);
          if (amountInWei > chainBalance.data) {
            const maxAmount = (
              Number(chainBalance.data) / Math.pow(10, USDC_DECIMALS)
            ).toFixed(6);
            errors[chainId].push(
              `Insufficient balance. Maximum: ${maxAmount} USDC`
            );
          }
        } catch (error) {
          errors[chainId].push("Invalid amount format");
        }
      }

      const numericAmount = Number(amount);
      if (numericAmount > 10000) {
        warnings[chainId].push(
          "Large transaction amount. Please double-check before proceeding"
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
          const amountInWei = parseUnits(amount, USDC_DECIMALS);
          return sum + amountInWei;
        }
        return sum;
      }, 0n);

      totalAmount = (Number(total) / Math.pow(10, USDC_DECIMALS)).toString();
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
