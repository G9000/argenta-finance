import type {
  BatchExecutionConfig,
  BatchDepositConfig,
} from "@/types/batch-operations";

/**
 * Default configuration for batch execution
 */
export const DEFAULT_BATCH_CONFIG: BatchExecutionConfig = {
  retry: {
    maxAttempts: 3,
    delayMs: 2000,
    backoffMultiplier: 1.5,
    retryableErrorTypes: ["network", "transaction"],
  },
  timeouts: {
    chainSwitch: 30000, // 30 seconds
    approval: 300000, // 5 minutes
    deposit: 300000, // 5 minutes
    confirmation: 180000, // 3 minutes
  },
  gasConfig: {
    estimateGas: true,
    gasLimitMultiplier: 1.2,
  },
  continueOnFailure: true,
  confirmBeforeStart: true,
  autoRetryOnNetworkError: true,
};

/**
 * Default configuration for batch deposit service
 */
export const DEFAULT_BATCH_DEPOSIT_CONFIG: BatchDepositConfig = {
  timeoutMs: 60000,
  confirmationTimeoutMs: 300000,
  retryAttempts: 3,
  retryDelayMs: 1000,
};
