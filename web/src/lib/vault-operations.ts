import {
  parseUnits,
  UserRejectedRequestError,
  TransactionRejectedRpcError,
  type Address,
  type Hash,
} from "viem";
import {
  SupportedChainId,
  USDC_DECIMALS,
  getUsdcAddress,
  getVaultAddress,
} from "@/lib/contracts";
import { createComponentLogger } from "@/lib/logger";
import {
  CommonValidations,
  validateOrThrow,
  composeValidators,
  collectValidationResults,
  type ValidationResult,
} from "@/lib/validators";
import type {
  BatchOperationError,
  BatchErrorType,
  ChainOperation,
} from "@/types/batch-operations";

const logger = createComponentLogger("VaultOperations");

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * Check if an error is a user rejection
 */
export function isUserRejection(error: any): boolean {
  return (
    error instanceof UserRejectedRequestError ||
    error instanceof TransactionRejectedRpcError ||
    error?.code === 4001 || // MetaMask user rejection
    error?.message?.toLowerCase().includes("user rejected") ||
    error?.message?.toLowerCase().includes("user denied")
  );
}

/**
 * Categorize error by type for better handling
 */
export function categorizeError(error: any): BatchErrorType {
  if (isUserRejection(error)) {
    return "user_rejection";
  }

  if (error?.message?.toLowerCase().includes("insufficient")) {
    return "insufficient_funds";
  }

  if (
    error?.message?.toLowerCase().includes("network") ||
    error?.message?.toLowerCase().includes("rpc") ||
    error?.message?.toLowerCase().includes("connection") ||
    error?.code === -32603 // Internal error often network related
  ) {
    return "network";
  }

  if (
    error?.message?.toLowerCase().includes("transaction") ||
    error?.message?.toLowerCase().includes("execution reverted") ||
    error?.code === -32000 // Transaction failed
  ) {
    return "transaction";
  }

  return "unknown";
}

/**
 * Create a standardized BatchOperationError from any error
 */
export function createBatchError(
  error: any,
  chainId: SupportedChainId,
  step?: string
): BatchOperationError {
  const errorType = categorizeError(error);

  let message: string;
  let isRetryable: boolean;
  let suggestedAction: string | undefined;

  switch (errorType) {
    case "user_rejection":
      message = "Transaction cancelled by user";
      isRetryable = true;
      suggestedAction = "Try again or skip this chain";
      break;

    case "insufficient_funds":
      message = "Insufficient funds for this transaction";
      isRetryable = false;
      suggestedAction = "Reduce the amount or add more funds";
      break;

    case "network":
      message = "Network error occurred";
      isRetryable = true;
      suggestedAction = "Check your connection and try again";
      break;

    case "transaction":
      message = error?.shortMessage || error?.message || "Transaction failed";
      isRetryable = true;
      suggestedAction = "Try again with different settings";
      break;

    default:
      message =
        error?.shortMessage || error?.message || "An unexpected error occurred";
      isRetryable = true;
      suggestedAction = "Try again or contact support";
      break;
  }

  return {
    type: errorType,
    code: error?.code?.toString(),
    message,
    originalError: error,
    chainId,
    step: step as any,
    isRetryable,
    suggestedAction,
  };
}

// ============================================================================
// Amount and Validation Utilities
// ============================================================================

/**
 * Parse amount string to bigint
 */
export function parseAmountToBigInt(amount: string): bigint {
  validateOrThrow(
    CommonValidations.tokenAmountWithMin(amount, USDC_DECIMALS, "USDC"),
    "Amount validation failed"
  );

  return parseUnits(amount.trim(), USDC_DECIMALS);
}

/**
 * Validate that all necessary addresses are available for a chain operation
 */
export function validateChainOperation(chainId: SupportedChainId): {
  usdcAddress: Address;
  vaultAddress: Address;
} {
  try {
    const usdcAddress = getUsdcAddress(chainId);
    const vaultAddress = getVaultAddress(chainId);

    validateOrThrow(
      CommonValidations.address(usdcAddress),
      `Invalid USDC address for chain ${chainId}`
    );

    validateOrThrow(
      CommonValidations.address(vaultAddress),
      `Invalid vault address for chain ${chainId}`
    );

    return { usdcAddress, vaultAddress };
  } catch (error) {
    throw new Error(
      `Invalid chain configuration for chain ${chainId}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
// ============================================================================
// Approval Operations
// ============================================================================

/**
 * Check if approval is needed for a given amount
 */
export function checkApprovalNeeded(
  currentAllowance: bigint | undefined,
  amount: bigint
): boolean {
  if (!currentAllowance) {
    return true;
  }
  return currentAllowance < amount;
}

/**
 * Parameters for approval execution
 */
export interface ApprovalParams {
  chainId: SupportedChainId;
  tokenAddress: Address;
  spenderAddress: Address;
  amount: bigint;
  useInfiniteApproval?: boolean;
}

/**
 * Result of approval execution
 */
export interface ApprovalResult {
  txHash: Hash;
  approvalAmount: bigint;
  isInfinite: boolean;
}

/**
 * Execute token approval transaction
 * This function prepares the parameters but doesn't execute the transaction directly
 */
export function prepareApprovalTransaction(params: ApprovalParams) {
  const {
    chainId,
    tokenAddress,
    spenderAddress,
    amount,
    useInfiniteApproval = true,
  } = params;

  validateOrThrow(
    CommonValidations.address(tokenAddress),
    "Invalid token address"
  );

  validateOrThrow(
    CommonValidations.address(spenderAddress),
    "Invalid spender address"
  );

  validateOrThrow(
    CommonValidations.bigIntAmount(amount),
    "Invalid approval amount"
  );

  const approvalAmount = useInfiniteApproval
    ? BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      )
    : amount;

  logger.debug(`Preparing approval transaction:`, {
    chainId,
    tokenAddress,
    spenderAddress,
    amount: amount.toString(),
    approvalAmount: approvalAmount.toString(),
    isInfinite: useInfiniteApproval,
  });

  return {
    chainId,
    address: tokenAddress,
    abi: [
      {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
      },
    ] as const,
    functionName: "approve" as const,
    args: [spenderAddress, approvalAmount] as const,
  };
}

// ============================================================================
// Deposit Operations
// ============================================================================

/**
 * Parameters for deposit execution
 */
export interface DepositParams {
  chainId: SupportedChainId;
  vaultAddress: Address;
  tokenAddress: Address;
  amount: bigint;
}

/**
 * Result of deposit execution
 */
export interface DepositResult {
  txHash: Hash;
  amount: bigint;
  tokenAddress: Address;
}

/**
 * Prepare deposit transaction parameters
 * This function prepares the parameters but doesn't execute the transaction directly
 * The actual execution should be done using wagmi's writeContract
 */
export function prepareDepositTransaction(params: DepositParams) {
  const { chainId, vaultAddress, tokenAddress, amount } = params;

  validateOrThrow(
    CommonValidations.address(vaultAddress),
    "Invalid vault address"
  );

  validateOrThrow(
    CommonValidations.address(tokenAddress),
    "Invalid token address"
  );

  validateOrThrow(
    CommonValidations.bigIntAmount(amount),
    "Invalid deposit amount"
  );

  logger.debug(`Preparing deposit transaction:`, {
    chainId,
    vaultAddress,
    tokenAddress,
    amount: amount.toString(),
  });

  return {
    chainId,
    address: vaultAddress,
    abi: [
      {
        name: "deposit",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [],
      },
    ] as const,
    functionName: "deposit" as const,
    args: [tokenAddress, amount] as const,
  };
}

// ============================================================================
// Chain Operation Preparation
// ============================================================================

/**
 * Prepare all necessary information for executing operations on a specific chain
 */
export function prepareChainOperation(
  chainId: SupportedChainId,
  amount: string
): ChainOperation {
  const amountWei = parseAmountToBigInt(amount);

  const { usdcAddress, vaultAddress } = validateChainOperation(chainId);

  return {
    chainId,
    needsApproval: true,
    amount: amountWei,
    tokenAddress: usdcAddress,
    vaultAddress: vaultAddress,
  };
}

// ============================================================================
// Gas Estimation Utilities
// ============================================================================

/**
 * Estimate gas for approval transaction
 */
export interface GasEstimate {
  gasLimit: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

/**
 * Create a gas estimate with buffer
 */
export function addGasBuffer(
  gasLimit: bigint,
  multiplier: number = 1.2
): bigint {
  return (gasLimit * BigInt(Math.floor(multiplier * 100))) / BigInt(100);
}

// ============================================================================
// Transaction Monitoring Utilities
// ============================================================================

/**
 * Parameters for monitoring transaction status
 */
export interface TransactionMonitorParams {
  txHash: Hash;
  chainId: SupportedChainId;
  timeout?: number;
  pollInterval?: number;
}

/**
 * Transaction status result
 */
export interface TransactionStatus {
  status: "pending" | "success" | "failed";
  blockNumber?: bigint;
  gasUsed?: bigint;
  effectiveGasPrice?: bigint;
  error?: string;
}

// ============================================================================
// Batch Operation Utilities
// ============================================================================

/**
 * Calculate total steps for batch execution
 */
export function calculateTotalSteps(
  chainOperations: ChainOperation[],
  includeChainSwitching: boolean = true
): number {
  let steps = 0;

  for (const operation of chainOperations) {
    if (includeChainSwitching) {
      steps += 1; // Chain switching
    }
    if (operation.needsApproval) {
      steps += 1; // Approval
    }
    steps += 1; // Deposit
  }

  return steps;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(
  completedSteps: number,
  totalSteps: number
): number {
  if (totalSteps === 0) return 0;
  return Math.min(100, Math.round((completedSteps / totalSteps) * 100));
}

/**
 * Format amount for display
 */
export function formatAmount(
  amount: bigint,
  decimals: number = USDC_DECIMALS
): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === BigInt(0)) {
    return wholePart.toString();
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const trimmedFractional = fractionalStr.replace(/0+$/, "");

  return trimmedFractional.length > 0
    ? `${wholePart}.${trimmedFractional}`
    : wholePart.toString();
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate that a chain amount is properly formatted and valid
 */
export function validateChainAmount(
  chainId: SupportedChainId,
  amount: string
): {
  isValid: boolean;
  error?: string;
  amountWei?: bigint;
} {
  try {
    validateChainOperation(chainId);

    const amountValidation = CommonValidations.tokenAmountWithMin(
      amount,
      USDC_DECIMALS,
      "USDC"
    );

    if (!amountValidation.isValid) {
      return {
        isValid: false,
        error: amountValidation.error,
      };
    }

    const amountWei = parseUnits(amount.trim(), USDC_DECIMALS);

    const bigIntValidation = CommonValidations.bigIntAmount(amountWei);
    if (!bigIntValidation.isValid) {
      return {
        isValid: false,
        error: bigIntValidation.error,
      };
    }

    return {
      isValid: true,
      amountWei,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid amount",
    };
  }
}

/**
 * Validate multiple chain amounts for batch operation
 */
export function validateBatchAmounts(
  chainAmounts: Array<{ chainId: SupportedChainId; amount: string }>
): {
  isValid: boolean;
  errors: Partial<Record<SupportedChainId, string>>;
  validAmounts: Array<{
    chainId: SupportedChainId;
    amount: string;
    amountWei: bigint;
  }>;
} {
  const errors: Partial<Record<SupportedChainId, string>> = {};
  const validAmounts: Array<{
    chainId: SupportedChainId;
    amount: string;
    amountWei: bigint;
  }> = [];

  for (const { chainId, amount } of chainAmounts) {
    const validation = validateChainAmount(chainId, amount);

    if (validation.isValid && validation.amountWei) {
      validAmounts.push({
        chainId,
        amount,
        amountWei: validation.amountWei,
      });
    } else {
      errors[chainId] = validation.error || "Invalid amount";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    validAmounts,
  };
}
