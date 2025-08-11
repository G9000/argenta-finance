import { describe, it, expect, beforeEach, vi } from "vitest";
import { createBatchDepositService } from "@/lib/batch-deposit-service";
import { SupportedChainId } from "@/constant/contracts";
import type {
  WagmiDependencies,
  BatchDepositConfig,
} from "@/types/batch-operations";

const publicClients: Record<number, any> = {};

vi.mock("viem", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    erc20Abi: [
      {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
    ],
    createPublicClient: ({ chain }: any) => {
      const client = {
        chain,
        readContract: vi.fn().mockImplementation(() => {
          const val = (global as any).__mockAllowance;
          return val !== undefined ? val : 0n;
        }),
        waitForTransactionReceipt: vi
          .fn()
          .mockResolvedValue({ status: "success" }),
      };
      publicClients[chain.id] = client;
      return client;
    },
    http: () => ({}),
  };
});

function userRejectedError(message = "User rejected") {
  return { message } as any;
}

function createMockWagmi(
  overrides?: Partial<WagmiDependencies>
): WagmiDependencies {
  let currentChain: number | undefined;
  const writeContract = vi.fn().mockImplementation(({ functionName }: any) => {
    if (functionName === "approve")
      return ("0xapprove" + Math.random().toString(16).slice(2, 8)).padEnd(
        66,
        "0"
      );
    return ("0xdeposit" + Math.random().toString(16).slice(2, 8)).padEnd(
      66,
      "0"
    );
  });

  const wagmi: WagmiDependencies = {
    publicClient: { chain: { id: SupportedChainId.ETH_SEPOLIA } } as any,
    walletClient: {
      writeContract,
      chain: { id: SupportedChainId.ETH_SEPOLIA },
    } as any,
    userAddress: "0x1234567890123456789012345678901234567890" as any,
    switchChain: async (chainId: SupportedChainId) => {
      currentChain = chainId;
      (wagmi.publicClient as any).chain = { id: chainId };
      (wagmi.walletClient as any).chain = { id: chainId };
    },
    ...overrides,
  };
  return wagmi;
}

const TEST_CONFIG: BatchDepositConfig = {
  timeoutMs: 15000,
  confirmationTimeoutMs: 15000,
  retryAttempts: 2,
  retryDelayMs: 10,
};

const NO_RETRY_CONFIG: BatchDepositConfig = {
  ...TEST_CONFIG,
  retryAttempts: 1,
};

// Capture emitted events for assertions
function captureEvents(service: ReturnType<typeof createBatchDepositService>) {
  const events: Record<string, any[]> = {};
  const on = (event: any) => {
    events[event] = [];
    service.on(event, (data: any) => events[event].push(data));
  };
  [
    "batchStarted",
    "batchCompleted",
    "batchFailed",
    "chainStarted",
    "chainCompleted",
    "chainFailed",
    "stepStarted",
    "stepCompleted",
    "transactionSubmitted",
    "transactionConfirmed",
    "progressUpdated",
  ].forEach(on);
  return events;
}

describe("BatchDepositService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes a single chain batch successfully (approval + deposit)", async () => {
    const wagmi = createMockWagmi();
    const service = createBatchDepositService(wagmi, TEST_CONFIG);
    const events = captureEvents(service);

    const results = await service.executeBatch([
      {
        chainId: SupportedChainId.ETH_SEPOLIA,
        amount: "1",
        amountWei: 1_000_000n,
      },
    ]);

    expect(results).toHaveLength(1);
    const res = results[0];
    expect(res.status).toBe("success");
    expect(res.approvalTxHash).toBeDefined();
    expect(res.depositTxHash).toBeDefined();

    // Events sanity
    expect(events.batchStarted?.length).toBe(1);
    expect(events.chainStarted?.length).toBe(1);
    expect(events.transactionSubmitted?.length).toBeGreaterThanOrEqual(2);
    expect(events.transactionConfirmed?.length).toBeGreaterThanOrEqual(2);
  });

  it("prevents concurrent batch executions", async () => {
    const wagmi = createMockWagmi();
    const service = createBatchDepositService(wagmi, TEST_CONFIG);

    const firstPromise = service.executeBatch([
      {
        chainId: SupportedChainId.ETH_SEPOLIA,
        amount: "1",
        amountWei: 1_000_000n,
      },
    ]);

    await expect(
      service.executeBatch([
        {
          chainId: SupportedChainId.SEI_TESTNET,
          amount: "1",
          amountWei: 1_000_000n,
        },
      ])
    ).rejects.toThrow(/already in progress/);

    await firstPromise;
  });

  it("handles user cancellation during approval (status cancelled)", async () => {
    const wagmi = createMockWagmi({
      walletClient: {
        writeContract: vi.fn().mockImplementation(({ functionName }: any) => {
          if (functionName === "approve") throw userRejectedError();
          return "0xnever";
        }),
        chain: { id: SupportedChainId.ETH_SEPOLIA },
      } as any,
    });

    const service = createBatchDepositService(wagmi, TEST_CONFIG);

    const results = await service.executeBatch([
      {
        chainId: SupportedChainId.ETH_SEPOLIA,
        amount: "2",
        amountWei: 2_000_000n,
      },
    ]);

    const res = results[0];
    expect(res.status).toBe("cancelled");
    expect(res.userCancelled).toBe(true);
    expect(res.error).toMatch(/User cancelled approval/i);
  });

  it("handles user cancellation during deposit (status partial)", async () => {
    const wagmi = createMockWagmi();
    (wagmi.walletClient as any).writeContract = vi
      .fn()
      .mockImplementation(({ functionName }: any) => {
        if (functionName === "approve") {
          return "0xapprovehash".padEnd(66, "0");
        }
        if (functionName === "deposit") {
          throw userRejectedError();
        }
      });

    const service = createBatchDepositService(wagmi, TEST_CONFIG);

    const results = await service.executeBatch([
      {
        chainId: SupportedChainId.ETH_SEPOLIA,
        amount: "3",
        amountWei: 3_000_000n,
      },
    ]);

    const res = results[0];
    expect(res.status).toBe("partial");
    expect(res.userCancelled).toBe(true);
    expect(res.error).toMatch(/User cancelled deposit/i);
    expect(res.approvalTxHash).toBeDefined();
    expect(res.depositTxHash).toBeUndefined();
  });

  it("allows retryChain after a failed deposit execution", async () => {
    const wagmi = createMockWagmi();

    (wagmi.walletClient as any).writeContract = vi
      .fn()
      .mockImplementation(({ functionName }: any) => {
        if (functionName === "approve") return "0xapprovehash".padEnd(66, "0");
        if (functionName === "deposit") {
          throw new Error("deposit failed consistently");
        }
      });

    const service = createBatchDepositService(wagmi, NO_RETRY_CONFIG);

    const initial = await service.executeBatch([
      {
        chainId: SupportedChainId.ETH_SEPOLIA,
        amount: "4",
        amountWei: 4_000_000n,
      },
    ]);
    expect(initial[0].status).toBe("failed");

    // Now make deposit succeed on retry
    (wagmi.walletClient as any).writeContract = vi
      .fn()
      .mockImplementation(({ functionName }: any) => {
        if (functionName === "approve") return "0xapprovehash".padEnd(66, "0");
        if (functionName === "deposit") return "0xdeposithash".padEnd(66, "0");
      });

    const retryResult = await service.retryChain(
      SupportedChainId.ETH_SEPOLIA,
      "4"
    );

    expect(retryResult.status).toBe("success");
    expect(retryResult.depositTxHash).toBeDefined();
  });

  it("skips approval when allowance already sufficient", async () => {
    (global as any).__mockAllowance = 10_000_000_000n; // high allowance
    const wagmi = createMockWagmi();
    const service = createBatchDepositService(wagmi, TEST_CONFIG);
    const chainId = SupportedChainId.ETH_SEPOLIA;

    const events = captureEvents(service);
    const results = await service.executeBatch([
      { chainId, amount: "5", amountWei: 5_000_000n },
    ]);

    delete (global as any).__mockAllowance;

    expect(results[0].status).toBe("success");
    const submittedTypes = (events.transactionSubmitted || []).map(
      (e) => e.type
    );
    expect(submittedTypes.filter((t) => t === "approval")).toHaveLength(0);
    expect(submittedTypes.filter((t) => t === "deposit")).toHaveLength(1);
  });

  it("executes a multi-chain batch (two chains) successfully", async () => {
    const wagmi = createMockWagmi();
    const service = createBatchDepositService(wagmi, TEST_CONFIG);
    const events = captureEvents(service);

    const results = await service.executeBatch([
      {
        chainId: SupportedChainId.ETH_SEPOLIA,
        amount: "1",
        amountWei: 1_000_000n,
      },
      {
        chainId: SupportedChainId.SEI_TESTNET,
        amount: "2",
        amountWei: 2_000_000n,
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("success");
    expect(results[1].status).toBe("success");
    expect(events.batchStarted[0].totalSteps).toBe(6); // 2 chains * 3 steps
    expect(events.chainStarted.length).toBe(2);
    expect(events.chainCompleted.length).toBe(2);
    const finalProgress = events.progressUpdated.at(-1);
    expect(finalProgress.percentage).toBe(100);
  });

  it("handles failure on second chain while first succeeds", async () => {
    const wagmi = createMockWagmi();
    let currentChain: number | undefined = SupportedChainId.ETH_SEPOLIA;
    wagmi.switchChain = async (chainId: SupportedChainId) => {
      currentChain = chainId;
      (wagmi.publicClient as any).chain = { id: chainId };
      (wagmi.walletClient as any).chain = { id: chainId };
    };
    (wagmi.walletClient as any).writeContract = vi
      .fn()
      .mockImplementation(({ functionName }: any) => {
        if (functionName === "approve") return "0xapprovehash".padEnd(66, "0");
        if (functionName === "deposit") {
          if (currentChain === SupportedChainId.SEI_TESTNET) {
            throw new Error("forced deposit failure");
          }
          return "0xdeposithash".padEnd(66, "0");
        }
      });

    const service = createBatchDepositService(wagmi, NO_RETRY_CONFIG);
    const events = captureEvents(service);

    const results = await service.executeBatch([
      {
        chainId: SupportedChainId.ETH_SEPOLIA,
        amount: "1",
        amountWei: 1_000_000n,
      },
      {
        chainId: SupportedChainId.SEI_TESTNET,
        amount: "2",
        amountWei: 2_000_000n,
      },
    ]);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("success");
    expect(results[1].status).toBe("failed");
    expect(events.batchCompleted.length + events.batchFailed.length).toBe(1);
  });

  it("throws on invalid user address format", () => {
    const badWagmi = createMockWagmi({ userAddress: "0x123" as any });
    expect(() => createBatchDepositService(badWagmi, TEST_CONFIG)).toThrow(
      /Invalid user address/
    );
  });

  it("errors when chain contract addresses invalid (simulate by patching validation)", async () => {
    const wagmi = createMockWagmi();

    const vaultOps = await import("@/lib/vault-operations");
    const originalValidate = vaultOps.validateChainOperation;
    vi.spyOn(vaultOps, "validateChainOperation").mockImplementation(
      (chainId: any) => {
        if (chainId === SupportedChainId.ETH_SEPOLIA) {
          throw new Error("Invalid vault address");
        }
        return originalValidate(chainId);
      }
    );

    const service = createBatchDepositService(wagmi, TEST_CONFIG);
    const results = await service.executeBatch([
      {
        chainId: SupportedChainId.ETH_SEPOLIA,
        amount: "1",
        amountWei: 1_000_000n,
      },
    ]);

    expect(results[0].status).toBe("failed");
    expect(results[0].error).toMatch(/Invalid vault address/);

    (vaultOps.validateChainOperation as any).mockRestore?.();
  });
});
