import { parseUnits, isAddress, maxUint256, type Address } from "viem";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates that a string is not empty after trimming
 */
export function validateRequired(
  value: string,
  fieldName = "Field"
): ValidationResult {
  if (value === null || value === undefined) {
    return {
      isValid: false,
      error: `${fieldName} is required and cannot be empty`,
    };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: `${fieldName} is required and cannot be empty`,
    };
  }
  return { isValid: true };
}

/**
 * Validates wallet connection status
 */
export function validateWalletConnection(
  isConnected: boolean,
  address?: string
): ValidationResult {
  if (!isConnected || !address) {
    return {
      isValid: false,
      error: "Wallet not connected",
    };
  }
  return { isValid: true };
}

/**
 * Validates Ethereum address format using viem's isAddress utility
 */
export function validateEthereumAddress(address: unknown): ValidationResult {
  if (typeof address !== "string") {
    return {
      isValid: false,
      error: "Address must be a string",
    };
  }

  const trimmed = address.trim();
  const requiredCheck = validateRequired(trimmed, "Address");
  if (!requiredCheck.isValid) {
    return requiredCheck;
  }

  if (!isAddress(trimmed)) {
    return {
      isValid: false,
      error: "Invalid address format. Must be a valid Ethereum address",
    };
  }

  return { isValid: true };
}

/**
 * Validates numeric string format including scientific notation
 */
export function validateNumericString(value: string): ValidationResult {
  const requiredCheck = validateRequired(value, "Amount");
  if (!requiredCheck.isValid) {
    return requiredCheck;
  }

  const trimmed = value.trim();

  // Check format - supports: 123, 123.45, .45, 1e5, 2.5E-3, +123, -456.78, etc.
  const numericRegex = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/; // to be very honest im not quite sure bout this
  if (!numericRegex.test(trimmed)) {
    return {
      isValid: false,
      error: "Please enter a valid number format",
    };
  }

  return { isValid: true };
}

/**
 * Validates that a numeric string represents a positive number
 */
export function validatePositiveNumber(value: string): ValidationResult {
  const formatCheck = validateNumericString(value);
  if (!formatCheck.isValid) {
    return formatCheck;
  }

  const trimmed = value.trim();
  const numericValue = Number(trimmed);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return {
      isValid: false,
      error: "Please enter a valid amount greater than 0",
    };
  }

  return { isValid: true };
}

/**
 * Validates BigInt for blockchain operations, ensures it's within safe EVM bounds
 */
export function validateBlockchainBigInt(
  value: bigint,
  fieldName = "Amount"
): ValidationResult {
  // Check if positive
  if (value <= 0n) {
    return {
      isValid: false,
      error: `${fieldName} must be greater than zero`,
    };
  }

  // Check against maxUint256, EVM maximum
  if (value > maxUint256) {
    return {
      isValid: false,
      error: `${fieldName} exceeds maximum EVM value (${maxUint256})`,
    };
  }

  return { isValid: true };
}

/**
 * Validates decimal precision doesn't exceed token decimals
 */
export function validateDecimalPrecision(
  value: string,
  maxDecimals: number,
  tokenSymbol = "token"
): ValidationResult {
  const formatCheck = validateNumericString(value);
  if (!formatCheck.isValid) {
    return formatCheck;
  }

  const decimalParts = value.trim().split(".");
  if (decimalParts.length > 1 && decimalParts[1].length > maxDecimals) {
    return {
      isValid: false,
      error: `${tokenSymbol} supports maximum ${maxDecimals} decimal places`,
    };
  }

  return { isValid: true };
}

/**
 * Validates minimum amount requirement
 */
export function validateMinimumAmount(
  value: string,
  minAmount: string,
  tokenSymbol: string
): ValidationResult {
  const trimmedValue = value.trim();
  const numericValue = Number(trimmedValue);
  const minNumericValue = Number(minAmount);

  if (!Number.isFinite(numericValue) || !Number.isFinite(minNumericValue)) {
    return {
      isValid: false,
      error: "Invalid number format",
    };
  }

  if (numericValue < minNumericValue) {
    return {
      isValid: false,
      error: `Minimum ${tokenSymbol} amount is ${minAmount}`,
    };
  }

  return { isValid: true };
}

/**
 * Validates amount conversion to wei using viem's parseUnits
 */
export function validateAmountConversion(
  value: string,
  decimals: number
): ValidationResult {
  try {
    const trimmed = value.trim();

    // Validate that parseUnits doesn't throw and returns a valid BigInt
    const result = parseUnits(trimmed, decimals);

    // Additional validation ensure the result is not negative
    if (result < 0n) {
      return {
        isValid: false,
        error: "Amount cannot be negative",
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: "Invalid amount format for conversion",
    };
  }
}

/**
 * Validates sufficient balance for transaction
 */
export function validateSufficientBalance(
  amount: bigint,
  balance: bigint,
  balanceType = "balance"
): ValidationResult {
  if (amount > balance) {
    return {
      isValid: false,
      error: `Insufficient ${balanceType}`,
    };
  }
  return { isValid: true };
}

/**
 * Validates gas balance warning threshold
 */
export function validateGasBalance(
  ethBalance: bigint,
  warningThreshold: bigint
): ValidationResult {
  if (ethBalance < warningThreshold) {
    return {
      isValid: false,
      error: "Low ETH balance for gas fees",
    };
  }
  return { isValid: true };
}

/**
 * Validates large amount warning
 */
export function validateLargeAmount(
  value: string,
  warningThreshold: number
): ValidationResult {
  const trimmed = value.trim();
  const numericValue = Number(trimmed);

  if (!Number.isFinite(numericValue)) {
    return {
      isValid: false,
      error: "Invalid number format",
    };
  }

  if (numericValue > warningThreshold) {
    return {
      isValid: false,
      error: "Large transaction amount",
    };
  }
  return { isValid: true };
}

/**
 * Composite validator that runs multiple validators in sequence
 */
export function composeValidators(
  ...validators: (() => ValidationResult)[]
): ValidationResult {
  for (const validator of validators) {
    const result = validator();
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
}

/**
 * Convenience functions for common validation scenarios
 */
export const CommonValidations = {
  /**
   * Complete amount validation for string inputs
   */
  amount: (value: string): ValidationResult => {
    return composeValidators(
      () => validateRequired(value, "Amount"),
      () => validateNumericString(value),
      () => validatePositiveNumber(value)
    );
  },

  /**
   * Complete bigint amount validation (optimized for blockchain operations)
   */
  bigIntAmount: (value: bigint): ValidationResult => {
    return validateBlockchainBigInt(value);
  },

  /**
   * Complete address validation (unified for all address types including viem Address)
   */
  address: (value: unknown): ValidationResult => {
    return validateEthereumAddress(value);
  },

  /**
   * Complete wallet connection validation
   */
  walletConnection: (
    isConnected: boolean,
    address?: string
  ): ValidationResult => {
    return validateWalletConnection(isConnected, address);
  },

  /**
   * Token amount with decimal precision validation
   */
  tokenAmount: (
    value: string,
    decimals: number,
    symbol: string
  ): ValidationResult => {
    return composeValidators(
      () => validateRequired(value, "Amount"),
      () => validateNumericString(value),
      () => validatePositiveNumber(value),
      () => validateDecimalPrecision(value, decimals, symbol)
    );
  },

  /**
   * Token amount with minimum amount validation
   */
  tokenAmountWithMin: (
    value: string,
    decimals: number,
    symbol: string,
    minAmount?: string
  ): ValidationResult => {
    const validators = [
      () => validateRequired(value, "Amount"),
      () => validateNumericString(value),
      () => validatePositiveNumber(value),
      () => validateDecimalPrecision(value, decimals, symbol),
      () => validateAmountConversion(value, decimals),
    ];

    if (minAmount) {
      validators.push(() => validateMinimumAmount(value, minAmount, symbol));
    }

    return composeValidators(...validators);
  },

  /**
   * Gas balance validation
   */
  gasBalance: (ethBalance: bigint, threshold: bigint): ValidationResult => {
    return validateGasBalance(ethBalance, threshold);
  },

  /**
   * Large amount warning validation
   */
  largeAmountWarning: (value: string, threshold: number): ValidationResult => {
    return validateLargeAmount(value, threshold);
  },
};

/**
 * Helper to throw an error if validation fails
 */
export function validateOrThrow(
  validationResult: ValidationResult,
  errorPrefix = "Validation failed"
): void {
  if (!validationResult.isValid) {
    throw new Error(`${errorPrefix}: ${validationResult.error}`);
  }
}

/**
 * Helper to collect multiple validation results into errors and warnings arrays
 */
export function collectValidationResults(
  validations: { result: ValidationResult; isWarning?: boolean }[]
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const { result, isWarning = false } of validations) {
    if (!result.isValid && result.error) {
      if (isWarning) {
        warnings.push(result.error);
      } else {
        errors.push(result.error);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Helper to run validation and return early if any critical validation fails
 */
export function validateWithEarlyReturn(validations: ValidationResult[]): {
  isValid: boolean;
  error?: string;
} {
  for (const result of validations) {
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
}
