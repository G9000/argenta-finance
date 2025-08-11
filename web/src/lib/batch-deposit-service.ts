import type { Address, Hash, Chain } from "viem";
import { erc20Abi } from "viem";
import {
  readContract,
  writeContract,
  switchChain,
  waitForTransactionReceipt,
  getAccount,
} from "@wagmi/core";
import { SupportedChainId } from "@/constant/contracts";
import { appChains } from "@/lib/chains";
import { simpleVaultAbi } from "@/generated/wagmi";
import { wagmiConfig } from "@/wagmi";
import {
  parseAmountToBigInt,
  isUserRejection,
  validateChainOperation,
} from "@/lib/vault-operations";
import { createTypedEventEmitter } from "@/types/typed-event-emitter";
import type {
  ChainAmount,
  BatchDepositConfig,
  BatchDepositResult,
  BatchDepositEvents,
} from "@/types/batch-operations";
import { DEFAULT_BATCH_DEPOSIT_CONFIG as DEFAULT_CONFIG } from "@/constant/batch-operation-constants";

function getViemChain(chainId: SupportedChainId): Chain {
  const chain = appChains.find((c) => c.id === chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return chain;
}

/**
 * Wraps a promise with a timeout. If the promise does not resolve within the specified time,
 * the returned promise rejects with a timeout error.
 *
 * @template T
 * @param {Promise<T>} promise - The promise to wrap.
 * @param {number} timeoutMs - Timeout in milliseconds.
 * @returns {Promise<T>} The wrapped promise.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Retries an async operation with exponential backoff and timeout.
 *
 * @template T
 * @param {() => Promise<T>} operation - The async operation to retry.
 * @param {BatchDepositConfig} config - Retry and timeout configuration.
 * @param {string} operationName - Name for logging and error messages.
 * @returns {Promise<T>} Resolves with operation result or rejects after all retries fail.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  config: BatchDepositConfig,
  operationName: string
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      return await withTimeout(operation(), config.timeoutMs);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.retryAttempts) {
        throw new Error(
          `${operationName} failed after ${config.retryAttempts} attempts: ${lastError.message}`
        );
      }

      // Exponential backoff
      const delay = config.retryDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `${operationName} attempt ${attempt} failed, retrying in ${delay}ms:`,
        lastError.message
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  // Fallback: if we exit loop without returning or throwing earlier, propagate the last captured error
  throw lastError ?? new Error(`${operationName} failed with unknown error`);
}

/**
 * Executes a user transaction, immediately aborting on user rejection.
 * If the user cancels, throws a cancellation error. Otherwise, retries on other errors.
 *
 * @template T
 * @param {() => Promise<T>} operation - The async transaction to execute.
 * @param {BatchDepositConfig} config - Retry and timeout configuration.
 * @param {string} operationName - Name for error messages.
 * @returns {Promise<T>} Resolves with transaction result or throws on user cancellation.
 */
async function withUserTransaction<T>(
  operation: () => Promise<T>,
  config: BatchDepositConfig,
  operationName: string
): Promise<T> {
  try {
    return await withTimeout(operation(), config.timeoutMs);
  } catch (error) {
    if (isUserRejection(error)) {
      throw new Error(`User cancelled ${operationName.toLowerCase()}`);
    }
    return withRetry(operation, config, operationName);
  }
}

export interface BatchDepositService {
  executeBatch: (chainAmounts: ChainAmount[]) => Promise<BatchDepositResult[]>;
  retryChain: (
    chainId: SupportedChainId,
    amount: string
  ) => Promise<BatchDepositResult>;
  cancel: () => void;
  getStatus: () => {
    isRunning: boolean;
    isCancelled: boolean;
    resultsCount: number;
  };
  on: <K extends keyof BatchDepositEvents>(
    event: K,
    listener: (data: BatchDepositEvents[K]) => void
  ) => void;
  off: <K extends keyof BatchDepositEvents>(
    event: K,
    listener: (data: BatchDepositEvents[K]) => void
  ) => void;
}

/**
 * Creates a batch deposit service for multi-chain vault deposits.
 *
 * The service manages the full lifecycle of batch deposits:
 * - Chain switching, approval, and deposit for each chain
 * - Progress tracking and event emission for UI updates
 * - Error handling, retries, and user cancellation
 *
 * @param {BatchDepositConfig} [config=DEFAULT_CONFIG] - Optional configuration for retries and timeouts.
 * @returns {BatchDepositService} The batch deposit service instance.
 * @throws {Error} If no wallet is connected or user address is invalid.
 */
export function createBatchDepositService(
  config: BatchDepositConfig = DEFAULT_CONFIG
): BatchDepositService {
  // Get the current user address from wagmi
  const account = getAccount(wagmiConfig as any);
  if (!account.address) {
    throw new Error("No wallet connected");
  }
  const userAddress = account.address;

  if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    throw new Error("Invalid user address");
  }

  let isRunning = false;
  let isCancelled = false;
  let results: BatchDepositResult[] = [];
  let currentStep = 0;
  let totalSteps = 0;

  // track an active retry chain to prevent concurrent retries on multiple chains
  let activeRetryChain: SupportedChainId | null = null;

  const events = createTypedEventEmitter<BatchDepositEvents>();

  /**
   * Emits a progress update event with the current step and percentage.
   */
  function updateProgress() {
    const percentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
    events.emit("progressUpdated", {
      completed: currentStep,
      total: totalSteps,
      percentage: Math.round(percentage * 100) / 100,
    });
  }

  /**
   * Increments the current step and updates progress.
   */
  function incrementStep() {
    currentStep++;
    updateProgress();
  }

  /**
   * Calculate total steps needed for batch execution.
   * Each chain = 1 switch + 1 approval + 1 deposit = 3 steps
   */
  /**
   * Calculates the total number of steps for a batch operation.
   * Each chain requires 3 steps: switch, approve, deposit.
   *
   * @param {ChainAmount[]} chainAmounts - Array of chain/amount pairs.
   * @returns {Promise<number>} Total steps for the batch.
   */
  async function calculateTotalSteps(
    chainAmounts: ChainAmount[]
  ): Promise<number> {
    return chainAmounts.length * 3;
  }

  /**
   * Checks if the user needs to approve the vault contract for the given token and amount.
   * Reads the current allowance and compares to the required amount.
   *
   * @param {SupportedChainId} chainId - The chain to check.
   * @param {Address} tokenAddress - The token contract address.
   * @param {Address} spenderAddress - The vault contract address.
   * @param {bigint} amount - The required allowance amount.
   * @returns {Promise<boolean>} True if approval is needed, false otherwise.
   */
  async function checkNeedsApproval(
    chainId: SupportedChainId,
    tokenAddress: Address,
    spenderAddress: Address,
    amount: bigint
  ): Promise<boolean> {
    console.log(
      `[BatchDeposit] checkNeedsApproval called for chain ${chainId}`
    );
    const allowanceConfig = {
      ...config,
      retryAttempts: 2,
      retryDelayMs: 500,
    };

    try {
      return await withRetry(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));

          console.log(
            `[BatchDeposit] Reading allowance for chain ${chainId}, token: ${tokenAddress}`
          );

          try {
            const currentAllowance = await readContract(wagmiConfig as any, {
              address: tokenAddress,
              abi: erc20Abi,
              functionName: "allowance",
              args: [userAddress, spenderAddress],
              chainId,
            });
            return currentAllowance < amount;
          } catch (contractError) {
            const errorMsg =
              contractError instanceof Error
                ? contractError.message
                : String(contractError);
            if (errorMsg.includes('returned no data ("0x")')) {
              return true;
            }
            throw contractError;
          }
        },
        {
          ...allowanceConfig,
          retryAttempts: 1,
        },
        `Allowance check for chain ${chainId}`
      );
    } catch (error) {
      return true;
    }
  }

  /**
   * Switches the user's wallet to the specified chain.
   * Retries on failure using the configured retry logic.
   *
   * @param {SupportedChainId} chainId - The chain to switch to.
   * @returns {Promise<void>} Resolves when the chain is switched.
   */
  async function executeChainSwitch(chainId: SupportedChainId): Promise<void> {
    return withRetry(
      async () => {
        await switchChain(wagmiConfig as any, { chainId });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      },
      config,
      `Chain switch to ${chainId}`
    );
  }

  async function executeApproval(
    chainId: SupportedChainId,
    tokenAddress: Address,
    spenderAddress: Address,
    amount: bigint
  ): Promise<Hash> {
    const chain = getViemChain(chainId);

    const hash = await withUserTransaction(
      async () => {
        return await writeContract(wagmiConfig as any, {
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [spenderAddress, amount],
          account: userAddress,
          chainId,
        });
      },
      config,
      `Approval transaction for chain ${chainId}`
    );

    events.emit("transactionSubmitted", {
      chainId,
      txHash: hash,
      type: "approval",
    });

    // Wait for confirmation with longer timeout and retry
    await withRetry(
      async () => {
        await waitForTransactionReceipt(wagmiConfig as any, {
          hash,
          chainId,
        });
      },
      { ...config, timeoutMs: config.confirmationTimeoutMs },
      `Approval confirmation for chain ${chainId}`
    );

    events.emit("transactionConfirmed", {
      chainId,
      txHash: hash,
      type: "approval",
    });

    return hash;
  }

  async function executeDeposit(
    chainId: SupportedChainId,
    vaultAddress: Address,
    tokenAddress: Address,
    amount: bigint
  ): Promise<Hash> {
    const chain = getViemChain(chainId);

    const hash = await withUserTransaction(
      async () => {
        return await writeContract(wagmiConfig as any, {
          address: vaultAddress,
          abi: simpleVaultAbi,
          functionName: "deposit",
          args: [tokenAddress, amount],
          account: userAddress,
          chainId,
        });
      },
      config,
      `Deposit transaction for chain ${chainId}`
    );
    events.emit("transactionSubmitted", {
      chainId,
      txHash: hash,
      type: "deposit",
    });
    await withRetry(
      async () => {
        await waitForTransactionReceipt(wagmiConfig as any, {
          hash,
          chainId,
        });
      },
      { ...config, timeoutMs: config.confirmationTimeoutMs },
      `Deposit confirmation for chain ${chainId}`
    );

    events.emit("transactionConfirmed", {
      chainId,
      txHash: hash,
      type: "deposit",
    });

    return hash;
  }

  async function executeChainDeposit(
    chainAmount: ChainAmount,
    chainIndex: number,
    totalChains: number,
    isRetry: boolean = false
  ): Promise<BatchDepositResult> {
    const { chainId, amount } = chainAmount;
    const amountWei = parseAmountToBigInt(amount);

    // Each chain has 3 steps: switch, approve, deposit
    const stepsPerChain = 3;
    let chainStep = 0;

    const result: BatchDepositResult = {
      chainId,
      status: "success",
      startedAt: Date.now(),
    };

    // function to get current global step number
    const getGlobalStepNumber = () => chainIndex * stepsPerChain + chainStep;

    // For retries, we don't increment global progress
    const incrementStepIfNotRetry = () => {
      if (!isRetry) {
        incrementStep();
      }
    };

    // Step 1: Switch chain
    chainStep = 1;
    events.emit("stepStarted", {
      chainId,
      step: "switching",
      stepNumber: isRetry ? chainStep : getGlobalStepNumber(),
      totalSteps: isRetry ? 3 : totalSteps,
      chainStep,
      chainTotal: stepsPerChain,
    });

    await executeChainSwitch(chainId);
    events.emit("stepCompleted", {
      chainId,
      step: "switching",
      stepNumber: isRetry ? chainStep : getGlobalStepNumber(),
      totalSteps: isRetry ? 3 : totalSteps,
      chainStep,
      chainTotal: stepsPerChain,
    });

    incrementStepIfNotRetry();

    if (isCancelled) throw new Error("Operation cancelled");

    // Step 2: Get contract addresses
    // Validate and fetch chain-specific contract addresses (ensures correct format)
    const { usdcAddress, vaultAddress } = validateChainOperation(chainId);

    // Step 3: Check and handle approval (if needed)
    const needsApproval = await checkNeedsApproval(
      chainId,
      usdcAddress,
      vaultAddress,
      amountWei
    );

    // If retrying and previous approval already confirmed (passed in via external state), caller cannot easily pass that here.
    // Heuristic: if allowance check says not needed OR isRetry and allowance sufficient, we skip.
    // needsApproval already false if allowance sufficient

    if (needsApproval) {
      if (isCancelled) throw new Error("Operation cancelled");

      try {
        chainStep = 2;
        events.emit("stepStarted", {
          chainId,
          step: "approving",
          stepNumber: isRetry ? chainStep : getGlobalStepNumber(),
          totalSteps: isRetry ? 3 : totalSteps,
          chainStep,
          chainTotal: stepsPerChain,
        });
        result.approvalTxHash = await executeApproval(
          chainId,
          usdcAddress,
          vaultAddress,
          amountWei
        );
        events.emit("stepCompleted", {
          chainId,
          step: "approving",
          stepNumber: isRetry ? chainStep : getGlobalStepNumber(),
          totalSteps: isRetry ? 3 : totalSteps,
          chainStep,
          chainTotal: stepsPerChain,
        });
        incrementStepIfNotRetry();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        if (errorMessage.includes("User cancelled")) {
          result.status = "cancelled";
          result.userCancelled = true;
          result.error = "User cancelled approval";
          result.completedAt = Date.now();
          incrementStepIfNotRetry(); // still increment to maintain progress
          return result;
        }
        throw error;
      }
    } else {
      incrementStepIfNotRetry();
    }

    if (isCancelled) throw new Error("Operation cancelled");

    // Step 4: Execute deposit
    try {
      chainStep = 3;
      events.emit("stepStarted", {
        chainId,
        step: "depositing",
        stepNumber: isRetry ? chainStep : getGlobalStepNumber(),
        totalSteps: isRetry ? 3 : totalSteps,
        chainStep,
        chainTotal: stepsPerChain,
      });
      result.depositTxHash = await executeDeposit(
        chainId,
        vaultAddress,
        usdcAddress,
        amountWei
      );
      events.emit("stepCompleted", {
        chainId,
        step: "depositing",
        stepNumber: isRetry ? chainStep : getGlobalStepNumber(),
        totalSteps: isRetry ? 3 : totalSteps,
        chainStep,
        chainTotal: stepsPerChain,
      });
      incrementStepIfNotRetry();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("User cancelled")) {
        // treat any user cancellation during deposit phase as partial so user can retry deposit
        result.status = "partial";
        result.userCancelled = true;
        result.error = "User cancelled deposit";
        result.completedAt = Date.now();
        incrementStepIfNotRetry(); // still increment to maintain progress
        return result;
      }
      throw error;
    }

    result.completedAt = Date.now();
    return result;
  }

  // Main batch execution function
  async function executeBatch(
    chainAmounts: ChainAmount[]
  ): Promise<BatchDepositResult[]> {
    if (isRunning) {
      throw new Error("Batch execution already in progress");
    }

    isRunning = true;
    isCancelled = false;
    results = [];
    currentStep = 0;

    try {
      totalSteps = await calculateTotalSteps(chainAmounts);

      events.emit("batchStarted", {
        chainCount: chainAmounts.length,
        totalSteps,
      });
      updateProgress();

      for (let i = 0; i < chainAmounts.length; i++) {
        if (isCancelled) break;

        const chainAmount = chainAmounts[i];
        events.emit("chainStarted", { chainId: chainAmount.chainId, index: i });

        try {
          const result = await executeChainDeposit(
            chainAmount,
            i,
            chainAmounts.length
          );
          results.push(result);
          events.emit("chainCompleted", {
            chainId: chainAmount.chainId,
            result,
          });
        } catch (error) {
          if (isCancelled) break;

          const failedResult: BatchDepositResult = {
            chainId: chainAmount.chainId,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
            startedAt: Date.now(),
            completedAt: Date.now(),
          };
          results.push(failedResult);
          events.emit("chainFailed", {
            chainId: chainAmount.chainId,
            error: failedResult.error || "Unknown error",
          });
        }
      }

      events.emit("batchCompleted", { results });
      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Batch failed";
      events.emit("batchFailed", { error: errorMessage });
      throw error;
    } finally {
      isRunning = false;
    }
  }

  async function retryChain(
    chainId: SupportedChainId,
    amount: string
  ): Promise<BatchDepositResult> {
    if (isRunning) {
      throw new Error("Cannot retry while batch is running");
    }

    if (activeRetryChain && activeRetryChain !== chainId) {
      throw new Error(
        `Retry for chain ${activeRetryChain} already in progress; please wait until it finishes.`
      );
    }
    if (activeRetryChain === chainId) {
      throw new Error(
        `Retry for chain ${chainId} already in progress; please wait until it finishes.`
      );
    }
    activeRetryChain = chainId;

    // For retry, we don't reset the global progress, we just execute the chain
    // The UI will handle updating the specific chain result
    const chainAmount: ChainAmount = {
      chainId,
      amount,
      amountWei: parseAmountToBigInt(amount),
    };

    try {
      // For retry, we treat it as a single chain operation (index 0, total 1)
      // But we don't emit batchStarted/Completed to avoid clearing the UI
      const result = await executeChainDeposit(chainAmount, 0, 1, true);

      events.emit("chainCompleted", {
        chainId,
        result,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Retry failed";

      events.emit("chainFailed", {
        chainId,
        error: errorMessage,
      });

      throw error;
    } finally {
      // Clear active retry marker regardless of outcome
      if (activeRetryChain === chainId) {
        activeRetryChain = null;
      }
    }
  }

  function cancel(): void {
    isCancelled = true;
  }

  function getStatus() {
    return {
      isRunning,
      isCancelled,
      resultsCount: results.length,
    };
  }

  return {
    executeBatch,
    retryChain,
    cancel,
    getStatus,
    on: events.on,
    off: events.off,
  };
}
