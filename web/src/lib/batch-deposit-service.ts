import type { Address, Hash } from "viem";
import { erc20Abi } from "viem";
import {
  readContract,
  writeContract,
  simulateContract,
  switchChain,
  waitForTransactionReceipt,
  getAccount,
} from "@wagmi/core";
import { SupportedChainId } from "@/constant/contracts";
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
import { BATCH_MESSAGES } from "@/constant/batch-messages";

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(BATCH_MESSAGES.ERRORS.TIMEOUT(timeoutMs))),
      timeoutMs
    )
  );
  return Promise.race([promise, timeoutPromise]);
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  delayMs: number,
  operationName: string
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(
          `${operationName} failed after ${maxAttempts} attempts: ${error}`
        );
      }

      const delay = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
      console.warn(
        `${operationName} attempt ${attempt} failed, retrying in ${delay}ms`
      );
      await sleep(delay);
    }
  }
  throw new Error(`${operationName} failed unexpectedly`);
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

export function createBatchDepositService(
  config: BatchDepositConfig = DEFAULT_CONFIG
): BatchDepositService {
  const account = getAccount(wagmiConfig);
  if (!account.address) {
    throw new Error(BATCH_MESSAGES.ERRORS.NO_WALLET_CONNECTED);
  }
  const userAddress = account.address;

  let isRunning = false;
  let isCancelled = false;
  let results: BatchDepositResult[] = [];
  let currentStep = 0;
  let totalSteps = 0;
  let activeRetryChain: SupportedChainId | null = null;

  const events = createTypedEventEmitter<BatchDepositEvents>();

  function updateProgress(): void {
    const percentage =
      totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;
    events.emit("progressUpdated", {
      completed: currentStep,
      total: totalSteps,
      percentage,
    });
  }

  function incrementProgress(): void {
    currentStep++;
    updateProgress();
  }

  async function switchToChain(chainId: SupportedChainId): Promise<void> {
    await retryOperation(
      async () => {
        await switchChain(wagmiConfig, { chainId });
        await sleep(1000);
      },
      config.retryAttempts,
      config.retryDelayMs,
      `Chain switch to ${chainId}`
    );
  }

  async function checkNeedsApproval(
    chainId: SupportedChainId,
    tokenAddress: Address,
    spenderAddress: Address,
    amount: bigint
  ): Promise<boolean> {
    try {
      const allowance = await retryOperation(
        () =>
          readContract(wagmiConfig, {
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "allowance",
            args: [userAddress, spenderAddress],
            chainId,
          }),
        2,
        500,
        `Allowance check for chain ${chainId}`
      );
      return allowance < amount;
    } catch {
      return true;
    }
  }

  async function executeApproval(
    chainId: SupportedChainId,
    tokenAddress: Address,
    spenderAddress: Address,
    amount: bigint
  ): Promise<Hash> {
    const { request } = await retryOperation(
      () =>
        simulateContract(wagmiConfig, {
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [spenderAddress, amount],
          account: userAddress,
          chainId,
        }),
      2,
      500,
      `Approval simulation for chain ${chainId}`
    );

    const submitTx = async () => writeContract(wagmiConfig, request);

    let hash: Hash;
    try {
      hash = await withTimeout(submitTx(), config.timeoutMs);
    } catch (error) {
      if (isUserRejection(error)) {
        throw new Error(BATCH_MESSAGES.ERRORS.USER_CANCELLED_APPROVAL);
      }
      hash = await retryOperation(
        submitTx,
        config.retryAttempts,
        config.retryDelayMs,
        "Approval transaction"
      );
    }

    events.emit("transactionSubmitted", {
      chainId,
      txHash: hash,
      type: "approval",
    });

    await retryOperation(
      () => waitForTransactionReceipt(wagmiConfig, { hash, chainId }),
      config.retryAttempts,
      config.retryDelayMs,
      "Approval confirmation"
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
    const { request } = await retryOperation(
      () =>
        simulateContract(wagmiConfig, {
          address: vaultAddress,
          abi: simpleVaultAbi,
          functionName: "deposit",
          args: [tokenAddress, amount],
          account: userAddress,
          chainId,
        }),
      2,
      500,
      `Deposit simulation for chain ${chainId}`
    );

    const submitTx = async () => writeContract(wagmiConfig, request);

    let hash: Hash;
    try {
      hash = await withTimeout(submitTx(), config.timeoutMs);
    } catch (error) {
      if (isUserRejection(error)) {
        throw new Error(BATCH_MESSAGES.ERRORS.USER_CANCELLED_DEPOSIT);
      }
      hash = await retryOperation(
        submitTx,
        config.retryAttempts,
        config.retryDelayMs,
        "Deposit transaction"
      );
    }

    events.emit("transactionSubmitted", {
      chainId,
      txHash: hash,
      type: "deposit",
    });

    await retryOperation(
      () => waitForTransactionReceipt(wagmiConfig, { hash, chainId }),
      config.retryAttempts,
      config.retryDelayMs,
      "Deposit confirmation"
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
    isRetry = false
  ): Promise<BatchDepositResult> {
    const { chainId, amount } = chainAmount;
    const amountWei = parseAmountToBigInt(amount);

    const result: BatchDepositResult = {
      chainId,
      status: "success",
      startedAt: Date.now(),
    };

    let currentChainStep = 0;

    const emitStepEvent = (
      step: "switching" | "approving" | "depositing",
      type: "Started" | "Completed"
    ) => {
      if (type === "Started") {
        currentChainStep++;
      }

      const eventName = `step${type}` as keyof BatchDepositEvents;
      events.emit(eventName, {
        chainId,
        step,
        stepNumber: currentStep + 1,
        totalSteps: isRetry ? 3 : totalSteps,
        chainStep: currentChainStep,
        chainTotal: 3,
      });
    };

    try {
      // Step 1: Switch chain
      emitStepEvent("switching", "Started");
      await switchToChain(chainId);
      emitStepEvent("switching", "Completed");
      if (!isRetry) incrementProgress();

      if (isCancelled)
        throw new Error(BATCH_MESSAGES.ERRORS.OPERATION_CANCELLED);

      // Get contract addresses
      const { usdcAddress, vaultAddress } = validateChainOperation(chainId);

      // Step 2: Approval (if needed)
      const needsApproval = await checkNeedsApproval(
        chainId,
        usdcAddress,
        vaultAddress,
        amountWei
      );

      if (needsApproval) {
        emitStepEvent("approving", "Started");
        try {
          result.approvalTxHash = await executeApproval(
            chainId,
            usdcAddress,
            vaultAddress,
            amountWei
          );
          emitStepEvent("approving", "Completed");
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("User cancelled")
          ) {
            result.status = "cancelled";
            result.userCancelled = true;
            result.error = BATCH_MESSAGES.ERRORS.USER_CANCELLED_APPROVAL;
            result.completedAt = Date.now();
            return result;
          }
          throw error;
        }
      } else {
        // Skip approval step but still increment chain step counter
        currentChainStep++;
      }
      if (!isRetry) incrementProgress();

      if (isCancelled)
        throw new Error(BATCH_MESSAGES.ERRORS.OPERATION_CANCELLED);

      // Step 3: Deposit
      emitStepEvent("depositing", "Started");
      try {
        result.depositTxHash = await executeDeposit(
          chainId,
          vaultAddress,
          usdcAddress,
          amountWei
        );
        emitStepEvent("depositing", "Completed");
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("User cancelled")
        ) {
          result.status = "partial";
          result.userCancelled = true;
          result.error = BATCH_MESSAGES.ERRORS.USER_CANCELLED_DEPOSIT;
          result.completedAt = Date.now();
          return result;
        }
        throw error;
      }
      if (!isRetry) incrementProgress();

      result.completedAt = Date.now();
      return result;
    } catch (error) {
      result.status = "failed";
      result.error =
        error instanceof Error ? error.message : BATCH_MESSAGES.ERRORS.UNKNOWN;
      result.completedAt = Date.now();
      throw error;
    }
  }

  async function executeBatch(
    chainAmounts: ChainAmount[]
  ): Promise<BatchDepositResult[]> {
    if (isRunning) {
      throw new Error(BATCH_MESSAGES.ERRORS.BATCH_ALREADY_RUNNING);
    }

    isRunning = true;
    isCancelled = false;
    results = [];
    currentStep = 0;
    totalSteps = chainAmounts.length * 3; // 3 steps per chain

    try {
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
          const result = await executeChainDeposit(chainAmount);
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
            error:
              error instanceof Error
                ? error.message
                : BATCH_MESSAGES.ERRORS.UNKNOWN,
            startedAt: Date.now(),
            completedAt: Date.now(),
          };
          results.push(failedResult);
          events.emit("chainFailed", {
            chainId: chainAmount.chainId,
            error: failedResult.error || BATCH_MESSAGES.ERRORS.UNKNOWN,
          });
        }
      }

      events.emit("batchCompleted", { results });
      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : BATCH_MESSAGES.ERRORS.BATCH_FAILED;
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
      throw new Error(BATCH_MESSAGES.ERRORS.CANNOT_RETRY_WHILE_RUNNING);
    }

    if (activeRetryChain) {
      throw new Error(
        BATCH_MESSAGES.ERRORS.RETRY_ALREADY_IN_PROGRESS(activeRetryChain)
      );
    }

    activeRetryChain = chainId;

    try {
      const chainAmount: ChainAmount = {
        chainId,
        amount,
        amountWei: parseAmountToBigInt(amount),
      };

      const result = await executeChainDeposit(chainAmount, true);
      events.emit("chainCompleted", { chainId, result });
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : BATCH_MESSAGES.ERRORS.RETRY_FAILED;
      events.emit("chainFailed", { chainId, error: errorMessage });
      throw error;
    } finally {
      activeRetryChain = null;
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
