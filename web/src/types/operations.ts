export const OPERATION_TYPES = {
  DEPOSIT: "deposit",
  WITHDRAW: "withdraw",
} as const;

export type OperationType =
  (typeof OPERATION_TYPES)[keyof typeof OPERATION_TYPES];

export const SUPPORTED_TOKENS = {
  USDC: {
    symbol: "USDC",
    name: "USD Coin",
  },
} as const;

export type SupportedTokenSymbol =
  (typeof SUPPORTED_TOKENS)[keyof typeof SUPPORTED_TOKENS]["symbol"];

export const VALIDATION_CONFIG = {
  MIN_AMOUNTS: {
    USDC: "0.000001",
  },
  MAX_DECIMALS: {
    USDC: 6,
  },
  GAS_WARNING_THRESHOLD: "0.001",
  LARGE_AMOUNT_WARNING: 10000,
} as const;

export const BUTTON_STATES = {
  IDLE: "idle",
  PROCESSING: "processing",
  SUCCESS: "success",
  ERROR: "error",
} as const;

export type ButtonState = (typeof BUTTON_STATES)[keyof typeof BUTTON_STATES];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
