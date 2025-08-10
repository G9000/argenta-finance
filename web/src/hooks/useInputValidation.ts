import { useMemo } from "react";
import { parseUnits, formatUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { USDC_DECIMALS } from "@/lib/contracts";
import {
  OperationType,
  OPERATION_TYPES,
  SupportedTokenSymbol,
  VALIDATION_CONFIG,
} from "@/types/operations";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

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
      errors.push("Please connect your wallet");
      return { isValid: false, errors, warnings };
    }

    // 2. Amount format validation
    if (!amount || amount.trim() === "") {
      return { isValid: false, errors: [], warnings };
    }

    // Check for invalid characters and ensure valid decimal format
    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(amount)) {
      errors.push("Please enter a valid number");
      return { isValid: false, errors, warnings };
    }

    const numericAmount = parseFloat(amount);

    // 3. Amount must be positive
    if (numericAmount <= 0) {
      errors.push("Amount must be greater than 0");
      return { isValid: false, errors, warnings };
    }

    // 4. Check decimal precision
    const decimalParts = amount.split(".");
    if (decimalParts.length > 1 && decimalParts[1].length > token.decimals) {
      errors.push(
        `Maximum ${token.decimals} decimal places allowed for ${token.symbol}`
      );
      return { isValid: false, errors, warnings };
    }

    // 5. Minimum amount validation
    if (token.minAmount && numericAmount < parseFloat(token.minAmount)) {
      errors.push(`Minimum amount is ${token.minAmount} ${token.symbol}`);
      return { isValid: false, errors, warnings };
    }

    let amountInWei: bigint;
    try {
      amountInWei = parseUnits(amount, token.decimals);
    } catch {
      errors.push("Invalid amount format");
      return { isValid: false, errors, warnings };
    }

    if (type === OPERATION_TYPES.DEPOSIT) {
      // 6. Check wallet balance
      if (walletBalance !== undefined) {
        if (amountInWei > walletBalance) {
          const maxDeposit = formatUnits(walletBalance, token.decimals);
          errors.push(
            `Insufficient ${token.symbol} balance. Maximum: ${maxDeposit}`
          );
        }
      } else {
        warnings.push("Unable to verify wallet balance");
      }
    } else if (type === OPERATION_TYPES.WITHDRAW) {
      // 6. Check vault balance
      if (vaultBalance !== undefined) {
        if (amountInWei > vaultBalance) {
          const maxWithdraw = formatUnits(vaultBalance, token.decimals);
          errors.push(`Insufficient vault balance. Maximum: ${maxWithdraw}`);
        }
      } else {
        warnings.push("Unable to verify vault balance");
      }
    }

    // 7. Gas balance validation (warn if ETH balance is low)
    if (
      ethBalance &&
      ethBalance.value < parseUnits(VALIDATION_CONFIG.GAS_WARNING_THRESHOLD, 18)
    ) {
      warnings.push("Low ETH balance. You may not have enough for gas fees");
    }

    // 8. Large amount warning
    if (numericAmount > VALIDATION_CONFIG.LARGE_AMOUNT_WARNING) {
      warnings.push(
        "Large transaction amount. Please double-check before proceeding"
      );
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
