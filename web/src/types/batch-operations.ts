import { SupportedChainId } from "@/lib/contracts";

// ============================================================================
// Core Batch Operation Types
// ============================================================================

/**
 * Represents a deposit amount for a specific chain
 */
export interface ChainAmount {
  chainId: SupportedChainId;
  amount: string; // String representation for user input
  amountWei: bigint; // Parsed amount in wei for contracts
}

/**
 * Result of executing operations on a single chain
 */
export interface ChainExecutionResult {
  chainId: SupportedChainId;
  status: ChainExecutionStatus;
  approvalTxHash?: string;
  depositTxHash?: string;
  error?: BatchOperationError;
  startedAt?: number; // timestamp
  completedAt?: number; // timestamp
  canRetry: boolean;
}

/**
 * Status of operations on a single chain
 */
export type ChainExecutionStatus =
  | "idle" // Not started
  | "switching" // Switching to this chain
  | "approving" // Approval transaction in progress
  | "depositing" // Deposit transaction in progress
  | "success" // All operations completed successfully
  | "failed" // One or more operations failed
  | "cancelled"; // User cancelled the operation

/**
 * Overall execution state for the entire batch operation
 */
export type BatchExecutionStatus =
  | "idle" // Not started
  | "validating" // Pre-execution validation
  | "executing" // Operations in progress
  | "paused" // Execution paused (e.g., due to error)
  | "completed" // All operations completed
  | "cancelled"; // User cancelled the batch

/**
 * Comprehensive state for batch execution
 */
export interface BatchExecutionState {
  status: BatchExecutionStatus;
  currentChainIndex: number;
  currentStep: BatchExecutionStep;
  chainResults: ChainExecutionResult[];
  totalSteps: number;
  completedSteps: number;
  startedAt?: number; // timestamp
  completedAt?: number; // timestamp

  // Progress calculation
  progress: BatchProgress;

  // Error and retry handling
  hasFailures: boolean;
  canRetry: boolean;
  canCancel: boolean;

  // Statistics
  successCount: number;
  failureCount: number;
  totalAmountWei: bigint;
}

/**
 * Current step in the batch execution process
 */
export type BatchExecutionStep =
  | "validation" // Validating all inputs and balances
  | "switching" // Switching to target chain
  | "approving" // Executing approval transaction
  | "depositing" // Executing deposit transaction
  | "confirming" // Waiting for transaction confirmation
  | "completed"; // Current chain operations completed

/**
 * Progress information for UI display
 */
export interface BatchProgress {
  percentage: number; // 0-100
  currentChainId?: SupportedChainId;
  currentOperation?: "approval" | "deposit";
  estimatedTimeRemaining?: number; // seconds
  message: string; // User-friendly progress message
}

// ============================================================================
// Error Types and Retry Mechanisms
// ============================================================================

/**
 * Categorized error types for better error handling
 */
export type BatchErrorType =
  | "validation" // Pre-execution validation failed
  | "network" // Network/RPC related errors
  | "transaction" // Transaction execution failed
  | "user_rejection" // User rejected transaction
  | "insufficient_funds" // Insufficient balance
  | "unknown"; // Uncategorized error

/**
 * Structured error information
 */
export interface BatchOperationError {
  type: BatchErrorType;
  code?: string; // Error code from viem/wagmi
  message: string; // User-friendly error message
  originalError?: any; // Original error object for debugging
  chainId?: SupportedChainId; // Chain where error occurred
  step?: BatchExecutionStep; // Step where error occurred
  isRetryable: boolean;
  suggestedAction?: string; // Suggested action for user
}

/**
 * Retry configuration for failed operations
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableErrorTypes: BatchErrorType[];
}

/**
 * Retry state for tracking retry attempts
 */
export interface RetryState {
  attempts: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  canRetry: boolean;
}

// ============================================================================
// Batch Execution Configuration
// ============================================================================

/**
 * Configuration options for batch execution
 */
export interface BatchExecutionConfig {
  // Retry configuration
  retry: RetryConfig;

  // Timeout configuration (in milliseconds)
  timeouts: {
    chainSwitch: number;
    approval: number;
    deposit: number;
    confirmation: number;
  };

  // Gas configuration
  gasConfig: {
    estimateGas: boolean;
    gasLimitMultiplier: number; // e.g., 1.2 for 20% buffer
  };

  // Behavior configuration
  continueOnFailure: boolean; // Whether to continue with other chains if one fails
  confirmBeforeStart: boolean; // Whether to show confirmation dialog
  autoRetryOnNetworkError: boolean;
}

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

// ============================================================================
// Event Types for Progress Tracking
// ============================================================================

/**
 * Events that can be emitted during batch execution
 */
export type BatchExecutionEvent =
  | { type: "started"; payload: { chainAmounts: ChainAmount[] } }
  | { type: "chainStarted"; payload: { chainId: SupportedChainId } }
  | {
      type: "stepStarted";
      payload: { chainId: SupportedChainId; step: BatchExecutionStep };
    }
  | {
      type: "stepCompleted";
      payload: {
        chainId: SupportedChainId;
        step: BatchExecutionStep;
        txHash?: string;
      };
    }
  | {
      type: "chainCompleted";
      payload: { chainId: SupportedChainId; result: ChainExecutionResult };
    }
  | {
      type: "error";
      payload: { chainId: SupportedChainId; error: BatchOperationError };
    }
  | {
      type: "retryStarted";
      payload: { chainId: SupportedChainId; attempt: number };
    }
  | { type: "paused"; payload: { reason: string } }
  | { type: "cancelled"; payload: { reason: string } }
  | { type: "completed"; payload: { results: ChainExecutionResult[] } };

/**
 * Event handler type for batch execution events
 */
export type BatchExecutionEventHandler = (event: BatchExecutionEvent) => void;

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Helper type for chain-specific operations that need to be executed
 */
export interface ChainOperation {
  chainId: SupportedChainId;
  needsApproval: boolean;
  amount: bigint;
  tokenAddress: string;
  vaultAddress: string;
}

/**
 * Summary of batch execution results
 */
export interface BatchExecutionSummary {
  totalChains: number;
  successfulChains: number;
  failedChains: number;
  totalAmount: string;
  totalGasCost?: string;
  executionTime: number; // milliseconds
  results: ChainExecutionResult[];
}
