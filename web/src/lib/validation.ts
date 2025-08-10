import { parseUnits, formatUnits } from "viem";
import {
  OperationType,
  OPERATION_TYPES,
  SupportedTokenSymbol,
  VALIDATION_CONFIG,
  VALIDATION_MESSAGES,
} from "@/types/operations";
import {
  CommonValidations,
  collectValidationResults,
  validateWithEarlyReturn,
  validateRequired,
  validateSufficientBalance,
} from "./validators";

export interface ValidationInput {
  amount: string;
  type: OperationType;
  walletBalance?: bigint;
  vaultBalance?: bigint;
  isConnected: boolean;
  address?: string;
  ethBalance?: bigint;
  token: {
    symbol: SupportedTokenSymbol;
    decimals: number;
    minAmount?: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateInput(input: ValidationInput): ValidationResult {
  const {
    amount,
    type,
    walletBalance,
    vaultBalance,
    isConnected,
    address,
    ethBalance,
    token,
  } = input;

  const criticalValidations = [
    CommonValidations.walletConnection(isConnected, address),
  ];

  const earlyReturn = validateWithEarlyReturn(criticalValidations);
  if (!earlyReturn.isValid) {
    return {
      isValid: false,
      errors: [VALIDATION_MESSAGES.ERRORS.WALLET_NOT_CONNECTED],
      warnings: [],
    };
  }

  // 2. Empty amount check using consistent validation logic
  const requiredCheck = validateRequired(amount, "Amount");
  if (!requiredCheck.isValid) {
    return { isValid: false, errors: [], warnings: [] };
  }

  // 3. Basic amount validation using reusable validators
  const basicAmountValidation = CommonValidations.tokenAmountWithMin(
    amount,
    token.decimals,
    token.symbol,
    token.minAmount
  );

  if (!basicAmountValidation.isValid) {
    const errorMessage = mapValidationErrorToBusinessMessage(
      basicAmountValidation.error!,
      token
    );
    return {
      isValid: false,
      errors: [errorMessage],
      warnings: [],
    };
  }

  // 4. Convert to wei for balance comparisons
  const amountInWei = parseUnits(amount, token.decimals);
  const numericAmount = parseFloat(amount);

  // 5. Collect all validation results (errors and warnings)
  const validationResults = [];

  if (type === OPERATION_TYPES.DEPOSIT) {
    if (walletBalance !== undefined) {
      validationResults.push({
        result: validateSufficientBalance(
          amountInWei,
          walletBalance,
          "wallet balance"
        ),
        isWarning: false,
      });
    } else {
      validationResults.push({
        result: {
          isValid: false,
          error: VALIDATION_MESSAGES.WARNINGS.WALLET_BALANCE_UNKNOWN,
        },
        isWarning: true,
      });
    }
  } else if (type === OPERATION_TYPES.WITHDRAW) {
    if (vaultBalance !== undefined) {
      validationResults.push({
        result: validateSufficientBalance(
          amountInWei,
          vaultBalance,
          "vault balance"
        ),
        isWarning: false,
      });
    } else {
      validationResults.push({
        result: {
          isValid: false,
          error: VALIDATION_MESSAGES.WARNINGS.VAULT_BALANCE_UNKNOWN,
        },
        isWarning: true,
      });
    }
  }

  // Gas balance validation,  warning only
  if (ethBalance !== undefined) {
    const gasThreshold = parseUnits(
      VALIDATION_CONFIG.GAS_WARNING_THRESHOLD,
      18
    );
    validationResults.push({
      result: CommonValidations.gasBalance(ethBalance, gasThreshold),
      isWarning: true,
    });
  }

  // Large amount validation, warning only
  validationResults.push({
    result: CommonValidations.largeAmountWarning(
      amount,
      VALIDATION_CONFIG.LARGE_AMOUNT_WARNING
    ),
    isWarning: true,
  });

  const { errors, warnings } = collectValidationResults(validationResults);

  // Map balance errors to specific business messages
  const mappedErrors = errors.map((error) => {
    if (error.includes("Insufficient wallet balance")) {
      if (walletBalance !== undefined) {
        const maxDeposit = formatUnits(walletBalance, token.decimals);
        return VALIDATION_MESSAGES.ERRORS.INSUFFICIENT_WALLET_BALANCE(
          token.symbol,
          maxDeposit
        );
      } else {
        return VALIDATION_MESSAGES.ERRORS.INSUFFICIENT_WALLET_BALANCE(
          token.symbol,
          "unknown"
        );
      }
    }
    if (error.includes("Insufficient vault balance")) {
      if (vaultBalance !== undefined) {
        const maxWithdraw = formatUnits(vaultBalance, token.decimals);
        return VALIDATION_MESSAGES.ERRORS.INSUFFICIENT_VAULT_BALANCE(
          maxWithdraw
        );
      } else {
        return VALIDATION_MESSAGES.ERRORS.INSUFFICIENT_VAULT_BALANCE("unknown");
      }
    }
    return error;
  });

  // Map warnings to business messages
  const mappedWarnings = warnings.map((warning) => {
    if (warning.includes("Low ETH balance")) {
      return VALIDATION_MESSAGES.WARNINGS.LOW_GAS_BALANCE;
    }
    if (warning.includes("Large transaction")) {
      return VALIDATION_MESSAGES.WARNINGS.LARGE_TRANSACTION_AMOUNT;
    }
    return warning;
  });

  return {
    isValid: mappedErrors.length === 0,
    errors: mappedErrors,
    warnings: mappedWarnings,
  };
}

/**
 * Maps generic validation errors to specific business error messages
 */
function mapValidationErrorToBusinessMessage(
  error: string,
  token: { symbol: SupportedTokenSymbol; decimals: number }
): string {
  if (error.includes("valid number format")) {
    return VALIDATION_MESSAGES.ERRORS.INVALID_NUMBER_FORMAT;
  }
  if (error.includes("greater than 0")) {
    return VALIDATION_MESSAGES.ERRORS.AMOUNT_NOT_POSITIVE;
  }
  if (error.includes("decimal places")) {
    return VALIDATION_MESSAGES.ERRORS.DECIMAL_PRECISION_EXCEEDED(
      token.decimals,
      token.symbol
    );
  }
  if (error.includes("Minimum") && error.includes("amount")) {
    return error;
  }
  if (error.includes("conversion")) {
    return VALIDATION_MESSAGES.ERRORS.INVALID_AMOUNT_FORMAT;
  }

  return error;
}
