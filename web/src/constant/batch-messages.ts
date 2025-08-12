import type { SupportedChainId } from "@/constant/chains";

export const BATCH_MESSAGES = {
  ERRORS: {
    // Service / lifecycle
    NO_WALLET_CONNECTED: "No wallet connected",
    BATCH_ALREADY_RUNNING: "Batch execution already in progress",
    CANNOT_RETRY_WHILE_RUNNING: "Cannot retry while batch is running",
    SERVICE_NOT_AVAILABLE: "Service not available",
    SERVICE_INITIALIZATION_FAILED: "Service initialization failed",
    OPERATION_CANCELLED: "Operation cancelled",

    // Generic fallbacks
    UNKNOWN: "Unknown error",
    BATCH_FAILED: "Batch failed",
    RETRY_FAILED: "Retry failed",

    // Network/tx categories
    TRANSACTION_CANCELLED_BY_USER: "Transaction cancelled by user",
    INSUFFICIENT_FUNDS: "Insufficient funds for this transaction",
    NETWORK_ERROR_OCCURRED: "Network error occurred",
    TRANSACTION_FAILED_GENERIC: "Transaction failed",
    UNEXPECTED_ERROR_OCCURRED: "An unexpected error occurred",

    // Step-specific user cancellations
    USER_CANCELLED_APPROVAL: "User cancelled approval",
    USER_CANCELLED_DEPOSIT: "User cancelled deposit",

    // Dynamic formatters
    TIMEOUT: (ms: number) => `Timeout after ${ms}ms`,
    RETRY_ALREADY_IN_PROGRESS: (activeChainId: SupportedChainId) =>
      `Retry already in progress for chain ${activeChainId}`,
    RETRY_IN_PROGRESS_OTHER: (activeChainId: SupportedChainId) =>
      `Another chain (id ${activeChainId}) is currently retrying. Please wait for it to finish before retrying this chain.`,
    RETRY_ALREADY_IN_PROGRESS_FOR: (chainId: SupportedChainId) =>
      `Retry for chain ${chainId} already in progress; please wait.`,
    INVALID_CHAIN_CONFIGURATION: (chainId: SupportedChainId, reason?: string) =>
      `Invalid chain configuration for chain ${chainId}: ${
        reason ?? "Unknown error"
      }`,
  },

  WARNINGS: {},
} as const;

export type BatchMessageKey = keyof typeof BATCH_MESSAGES;
