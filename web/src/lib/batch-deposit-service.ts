import type { Address, Hash, PublicClient, WalletClient, Chain } from "viem";
import { erc20Abi, createPublicClient, http } from "viem";
import {
  SupportedChainId,
  getUsdcAddress,
  getVaultAddress,
} from "@/constant/contracts";
import { appChains } from "@/lib/chains";
import { simpleVaultAbi } from "@/generated/wagmi";
import { parseAmountToBigInt, isUserRejection } from "@/lib/vault-operations";
import { createTypedEventEmitter } from "@/types/typed-event-emitter";
import type {
  ChainAmount,
  BatchDepositConfig,
  BatchDepositResult,
  BatchDepositEvents,
  WagmiDependencies,
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
 * Wrap a promise with timeout
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
 * Retry a function with exponential backoff
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
 * Execute user transaction without retries on user rejection
 * If user rejects, immediately throw error instead of retrying
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
 * Create a functional batch deposit service
 */
export function createBatchDepositService(
  wagmi: WagmiDependencies,
  config: BatchDepositConfig = DEFAULT_CONFIG
): BatchDepositService {
  // Private state using closure
  let isRunning = false;
  let isCancelled = false;
  let results: BatchDepositResult[] = [];
  let currentStep = 0;
  let totalSteps = 0;

  // track an active retry chain to prevent concurrent retries on multiple chains
  let activeRetryChain: SupportedChainId | null = null;

  const events = createTypedEventEmitter<BatchDepositEvents>();

  // Cache per-chain public clients to avoid using a stale single-chain client after switches
  const publicClients: Partial<Record<SupportedChainId, PublicClient>> = {};

  function getPublicClient(chainId: SupportedChainId): PublicClient {
    if (!publicClients[chainId]) {
      publicClients[chainId] = createPublicClient({
        chain: getViemChain(chainId),
        transport: http(),
      });
    }
    return publicClients[chainId]!;
  }

  function updateProgress() {
    const percentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
    events.emit("progressUpdated", {
      completed: currentStep,
      total: totalSteps,
      percentage: Math.round(percentage * 100) / 100,
    });
  }

  function incrementStep() {
    currentStep++;
    updateProgress();
  }

  /**
   * Calculate total steps needed for batch execution.
   * Each chain = 1 switch + 1 approval + 1 deposit = 3 steps
   */
  async function calculateTotalSteps(
    chainAmounts: ChainAmount[]
  ): Promise<number> {
    return chainAmounts.length * 3;
  }

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
            // Ensure we're really on the intended chain before reading.
            // Some providers lag after switch; verify and wait if needed.
            try {
              // Prefer the configured publicClient's chain id; fall back to walletClient.chain?.id
              const activeChainId: number | undefined =
                wagmi.publicClient.chain?.id ?? wagmi.walletClient.chain?.id;

              if (activeChainId !== undefined && activeChainId !== chainId) {
                console.warn(
                  `[BatchDeposit] Chain mismatch (expected ${chainId}, got ${activeChainId}) before allowance read. Retrying after short delay.`
                );
                // Short delay to allow provider to finish switching
                await new Promise((r) => setTimeout(r, 500));
              }
            } catch (chainDetectError) {
              console.warn(
                `[BatchDeposit] Failed to determine active chain before allowance read (proceeding anyway):`,
                chainDetectError
              );
            }

            const currentAllowance = (await getPublicClient(
              chainId
            ).readContract({
              address: tokenAddress,
              abi: erc20Abi,
              functionName: "allowance",
              args: [wagmi.userAddress, spenderAddress],
            })) as bigint;
            return currentAllowance < amount;
          } catch (contractError) {
            // Handle specific case where contract returns no data
            const errorMsg =
              contractError instanceof Error
                ? contractError.message
                : String(contractError);
            if (errorMsg.includes('returned no data ("0x")')) {
              // Return true to indicate approval is needed since we can't determine current allowance
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

  async function executeChainSwitch(chainId: SupportedChainId): Promise<void> {
    return withRetry(
      async () => {
        await wagmi.switchChain(chainId);
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
        return await wagmi.walletClient.writeContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [spenderAddress, amount],
          account: wagmi.userAddress,
          chain,
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
        await getPublicClient(chainId).waitForTransactionReceipt({ hash });
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
        return await wagmi.walletClient.writeContract({
          address: vaultAddress,
          abi: simpleVaultAbi,
          functionName: "deposit",
          args: [tokenAddress, amount],
          account: wagmi.userAddress,
          chain,
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
        await getPublicClient(chainId).waitForTransactionReceipt({ hash });
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
    const usdcAddress = getUsdcAddress(chainId);
    const vaultAddress = getVaultAddress(chainId);

    // Step 3: Check and handle approval (if needed)
    const needsApproval = await checkNeedsApproval(
      chainId,
      usdcAddress,
      vaultAddress,
      amountWei
    );

    // If retrying and previous approval already confirmed (passed in via external state), caller cannot easily pass that here.
    // Heuristic: if allowance check says not needed OR isRetry and allowance sufficient, we skip.
    // (needsApproval already false if allowance sufficient)

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
