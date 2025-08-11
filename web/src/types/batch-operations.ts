import type { Address, Hash, PublicClient, WalletClient } from "viem";
import { SupportedChainId } from "@/constant/contracts";

// Core Operation Types
export type BatchDepositStatus =
  | "success"
  | "failed"
  | "cancelled"
  | "partial"
  | "retrying";

export type BatchDepositStep = "switching" | "approving" | "depositing";

export type BatchTransactionType = "approval" | "deposit";

// Core Batch Operation Types

export interface ChainAmount {
  chainId: SupportedChainId;
  amount: string;
  amountWei: bigint;
}

export interface ChainExecutionResult {
  chainId: SupportedChainId;
  status: ChainExecutionStatus;
  approvalTxHash?: string;
  depositTxHash?: string;
  error?: BatchOperationError;
  startedAt?: number;
  completedAt?: number;
  canRetry: boolean;
}

export type ChainExecutionStatus =
  | "idle"
  | "switching"
  | "approving"
  | "depositing"
  | "success"
  | "failed"
  | "cancelled";

export type BatchExecutionStatus =
  | "idle"
  | "validating"
  | "executing"
  | "paused"
  | "completed"
  | "cancelled";

export interface BatchExecutionState {
  status: BatchExecutionStatus;
  currentChainIndex: number;
  currentStep: BatchExecutionStep;
  chainResults: ChainExecutionResult[];
  totalSteps: number;
  completedSteps: number;
  startedAt?: number;
  completedAt?: number;
  progress: BatchProgress;
  hasFailures: boolean;
  canRetry: boolean;
  canCancel: boolean;
  successCount: number;
  failureCount: number;
  totalAmountWei: bigint;
}

export type BatchExecutionStep =
  | "validation"
  | "switching"
  | "approving"
  | "depositing"
  | "confirming"
  | "completed";

export interface BatchProgress {
  percentage: number;
  currentChainId?: SupportedChainId;
  currentOperation?: BatchTransactionType;
  estimatedTimeRemaining?: number;
  message: string;
}

// Error Types and Retry Mechanisms

export type BatchErrorType =
  | "validation"
  | "network"
  | "transaction"
  | "user_rejection"
  | "insufficient_funds"
  | "unknown";

export interface BatchOperationError {
  type: BatchErrorType;
  code?: string;
  message: string;
  originalError?: any;
  chainId?: SupportedChainId;
  step?: BatchExecutionStep;
  isRetryable: boolean;
  suggestedAction?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  retryableErrorTypes: BatchErrorType[];
}

export interface RetryState {
  attempts: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  canRetry: boolean;
}

// Batch Execution Configuration

export interface BatchExecutionConfig {
  retry: RetryConfig;
  timeouts: {
    chainSwitch: number;
    approval: number;
    deposit: number;
    confirmation: number;
  };
  gasConfig: {
    estimateGas: boolean;
    gasLimitMultiplier: number;
  };
  continueOnFailure: boolean;
  confirmBeforeStart: boolean;
  autoRetryOnNetworkError: boolean;
}

// Service Types and Interfaces

export interface BatchDepositResult {
  chainId: SupportedChainId;
  status: BatchDepositStatus;
  approvalTxHash?: Hash;
  depositTxHash?: Hash;
  error?: string;
  userCancelled?: boolean;
  startedAt: number;
  completedAt?: number;
}

export interface BatchDepositEvents {
  batchStarted: { chainCount: number; totalSteps: number };
  batchCompleted: { results: BatchDepositResult[] };
  batchFailed: { error: string };
  chainStarted: { chainId: SupportedChainId; index: number };
  chainCompleted: { chainId: SupportedChainId; result: BatchDepositResult };
  chainFailed: { chainId: SupportedChainId; error: string };

  stepStarted: {
    chainId: SupportedChainId;
    step: BatchDepositStep;
    stepNumber: number;
    totalSteps: number;
    chainStep: number;
    chainTotal: number;
  };
  stepCompleted: {
    chainId: SupportedChainId;
    step: BatchDepositStep;
    stepNumber: number;
    totalSteps: number;
    chainStep: number;
    chainTotal: number;
  };
  transactionSubmitted: {
    chainId: SupportedChainId;
    txHash: Hash;
    type: BatchTransactionType;
  };
  transactionConfirmed: {
    chainId: SupportedChainId;
    txHash: Hash;
    type: BatchTransactionType;
  };
  progressUpdated: { completed: number; total: number; percentage: number };
}

export interface BatchDepositConfig {
  timeoutMs: number;
  confirmationTimeoutMs: number;
  retryAttempts: number;
  retryDelayMs: number;
}

// Event Types for Progress Tracking

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

export type BatchExecutionEventHandler = (event: BatchExecutionEvent) => void;

// Helper Types

export interface ChainOperation {
  chainId: SupportedChainId;
  needsApproval: boolean;
  amount: bigint;
  tokenAddress: string;
  vaultAddress: string;
}

export interface BatchExecutionSummary {
  totalChains: number;
  successfulChains: number;
  failedChains: number;
  totalAmount: string;
  totalGasCost?: string;
  executionTime: number;
  results: ChainExecutionResult[];
}
