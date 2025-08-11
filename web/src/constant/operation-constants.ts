/**
 * Operation type constants
 */
export const OPERATION_TYPES = {
  DEPOSIT: "DEPOSIT",
  WITHDRAW: "WITHDRAW",
} as const;

/**
 * Supported token configurations
 */
export const SUPPORTED_TOKENS = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
  },
  ETH: {
    symbol: "ETH",
    name: "Ethereum",
  },
} as const;

/**
 * Validation configuration constants
 */
export const VALIDATION_CONFIG = {
  MIN_AMOUNTS: {
    USDC: "0.000001",
    ETH: "0.000000000000001",
  },
  MAX_DECIMALS: {
    USDC: 6,
    ETH: 18,
  },
  GAS_WARNING_THRESHOLD: "0.001",
  LARGE_AMOUNT_WARNING: 10000,
} as const;

/**
 * Button state constants
 */
export const BUTTON_STATES = {
  IDLE: "idle",
  PROCESSING: "processing",
  SUCCESS: "success",
  ERROR: "error",
} as const;

/**
 * Validation error and warning messages
 */
export const VALIDATION_MESSAGES = {
  ERRORS: {
    WALLET_NOT_CONNECTED: "Please connect your wallet",
    INVALID_NUMBER_FORMAT: "Please enter a valid number",
    AMOUNT_NOT_POSITIVE: "Amount must be greater than 0",
    INVALID_AMOUNT_FORMAT: "Invalid amount format",
    DECIMAL_PRECISION_EXCEEDED: (decimals: number, symbol: string) =>
      `Maximum ${decimals} decimal places allowed for ${symbol}`,
    MINIMUM_AMOUNT_NOT_MET: (minAmount: string, symbol: string) =>
      `Minimum amount is ${minAmount} ${symbol}`,
    INSUFFICIENT_WALLET_BALANCE: (symbol: string, maxAmount: string) =>
      `Insufficient ${symbol} balance. Maximum: ${maxAmount}`,
    INSUFFICIENT_VAULT_BALANCE: (maxAmount: string) =>
      `Insufficient vault balance. Maximum: ${maxAmount}`,
  },
  WARNINGS: {
    WALLET_BALANCE_UNKNOWN: "Unable to verify wallet balance",
    VAULT_BALANCE_UNKNOWN: "Unable to verify vault balance",
    LOW_GAS_BALANCE: "Low ETH balance. You may not have enough for gas fees",
    LARGE_TRANSACTION_AMOUNT:
      "Large transaction amount. Please double-check before proceeding",
  },
} as const;
