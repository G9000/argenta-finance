import { useMemo } from "react";
import { parseUnits, formatUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { USDC_DECIMALS } from "@/lib/contracts";
import {
  OperationType,
  OPERATION_TYPES,
  SupportedTokenSymbol,
  VALIDATION_CONFIG,
  VALIDATION_MESSAGES,
  ValidationResult,
} from "@/types/operations";

export interface UseInputValidationProps {
  amount: string;
  type: OperationType;
  walletBalance?: bigint;
  vaultBalance?: bigint;
  chainId?: number;
  token?: {
    symbol: SupportedTokenSymbol;
    decimals: number;
    minAmount?: string;
  };
}

export function useInputValidation({
  amount,
  type,
  walletBalance,
  vaultBalance,
  chainId,
  token = {
    symbol: "USDC" as const,
    decimals: USDC_DECIMALS,
    minAmount: VALIDATION_CONFIG.MIN_AMOUNTS.USDC,
  },
}: UseInputValidationProps): ValidationResult {
  const { address, isConnected } = useAccount();

  const { data: ethBalance } = useBalance({
    address,
    chainId,
  });

  return useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Wallet connection validation
    if (!isConnected || !address) {
      errors.push(VALIDATION_MESSAGES.ERRORS.WALLET_NOT_CONNECTED);
      return { isValid: false, errors, warnings };
    }

    // 2. Amount format validation
    if (!amount || amount.trim() === "") {
      return { isValid: false, errors: [], warnings };
    }

    // Check for invalid characters and ensure valid decimal format
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(amount)) {
      errors.push(VALIDATION_MESSAGES.ERRORS.INVALID_NUMBER_FORMAT);
      return { isValid: false, errors, warnings };
    }

    let amountInWei: bigint;
    try {
      amountInWei = parseUnits(amount, token.decimals);
    } catch {
      errors.push(VALIDATION_MESSAGES.ERRORS.INVALID_AMOUNT_FORMAT);
      return { isValid: false, errors, warnings };
    }

    // 3. Amount must be positive
    if (amountInWei <= 0n) {
      errors.push(VALIDATION_MESSAGES.ERRORS.AMOUNT_NOT_POSITIVE);
      return { isValid: false, errors, warnings };
    }

    // 4. Check decimal precision
    const decimalParts = amount.split(".");
    if (decimalParts.length > 1 && decimalParts[1].length > token.decimals) {
      errors.push(
        VALIDATION_MESSAGES.ERRORS.DECIMAL_PRECISION_EXCEEDED(
          token.decimals,
          token.symbol
        )
      );
      return { isValid: false, errors, warnings };
    }

    // 5. Minimum amount validation
    if (token.minAmount) {
      const minAmountInWei = parseUnits(token.minAmount, token.decimals);
      if (amountInWei < minAmountInWei) {
        errors.push(
          VALIDATION_MESSAGES.ERRORS.MINIMUM_AMOUNT_NOT_MET(
            token.minAmount,
            token.symbol
          )
        );
        return { isValid: false, errors, warnings };
      }
    }

    if (type === OPERATION_TYPES.DEPOSIT) {
      // 6. Check wallet balance
      if (walletBalance !== undefined) {
        if (amountInWei > walletBalance) {
          const maxDeposit = formatUnits(walletBalance, token.decimals);
          errors.push(
            VALIDATION_MESSAGES.ERRORS.INSUFFICIENT_WALLET_BALANCE(
              token.symbol,
              maxDeposit
            )
          );
        }
      } else {
        warnings.push(VALIDATION_MESSAGES.WARNINGS.WALLET_BALANCE_UNKNOWN);
      }
    } else if (type === OPERATION_TYPES.WITHDRAW) {
      // 6. Check vault balance
      if (vaultBalance !== undefined) {
        if (amountInWei > vaultBalance) {
          const maxWithdraw = formatUnits(vaultBalance, token.decimals);
          errors.push(
            VALIDATION_MESSAGES.ERRORS.INSUFFICIENT_VAULT_BALANCE(maxWithdraw)
          );
        }
      } else {
        warnings.push(VALIDATION_MESSAGES.WARNINGS.VAULT_BALANCE_UNKNOWN);
      }
    }

    // 7. Gas balance validation (warn if ETH balance is low)
    if (
      ethBalance &&
      ethBalance.value < parseUnits(VALIDATION_CONFIG.GAS_WARNING_THRESHOLD, 18)
    ) {
      warnings.push(VALIDATION_MESSAGES.WARNINGS.LOW_GAS_BALANCE);
    }

    // 8. Large amount warning
    const largeAmountThresholdInWei = parseUnits(
      VALIDATION_CONFIG.LARGE_AMOUNT_WARNING.toString(),
      token.decimals
    );
    if (amountInWei > largeAmountThresholdInWei) {
      warnings.push(VALIDATION_MESSAGES.WARNINGS.LARGE_TRANSACTION_AMOUNT);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [
    amount,
    type,
    walletBalance,
    vaultBalance,
    token,
    isConnected,
    address,
    ethBalance,
  ]);
}
