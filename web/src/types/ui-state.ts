import { SupportedChainId } from "@/constant/contracts";
import {
  OPERATION_TYPES,
  SUPPORTED_TOKENS,
  BUTTON_STATES,
} from "@/constant/operation-constants";
import type { BatchTransactionType } from "@/types/batch-operations";

export type OperationType =
  (typeof OPERATION_TYPES)[keyof typeof OPERATION_TYPES];

export type SupportedTokenSymbol =
  (typeof SUPPORTED_TOKENS)[keyof typeof SUPPORTED_TOKENS]["symbol"];

export type ButtonState = (typeof BUTTON_STATES)[keyof typeof BUTTON_STATES];

export interface ChainDepositAmount {
  chainId: SupportedChainId;
  amount: string;
}

export interface BatchDepositState {
  inputs: Record<SupportedChainId, string>;
  isValid: boolean;
  totalAmount: string;
  errors: Record<SupportedChainId, string[]>;
  warnings: Record<SupportedChainId, string[]>;
}

export interface ChainOperationStatus {
  chainId: SupportedChainId;
  status:
    | "pending"
    | "approving"
    | "depositing"
    | "completed"
    | "failed"
    | "retrying"
    | "partial";
  approveTxHash?: string;
  depositTxHash?: string;
  error?: string;
  canRetry?: boolean;
}

export interface BatchDepositProgress {
  totalSteps: number;
  currentStep: number;
  percentage: number;
  currentChain?: SupportedChainId;
  currentOperation?: BatchTransactionType;
  chainStatuses: ChainOperationStatus[];
  isComplete: boolean;
  hasFailures: boolean;
  batchCompletedSuccessfully: boolean;
  isRetrying?: boolean;
  retryingChainId?: SupportedChainId | null;
}
