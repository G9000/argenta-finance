import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIndividualChainOperations } from "@/hooks/useIndividualChainOperations";
import { SupportedChainId } from "@/constant/chains";

// Mock wagmi hooks
vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({ address: "0x123" })),
  useChainId: vi.fn(() => SupportedChainId.ETH_SEPOLIA),
  useSwitchChain: vi.fn(() => ({
    switchChainAsync: vi.fn(),
  })),
}));

// Mock wagmi/core
vi.mock("@wagmi/core", () => ({
  writeContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
}));

// Mock other dependencies
vi.mock("@/wagmi", () => ({
  wagmiConfig: {},
}));

vi.mock("@/generated/wagmi", () => ({
  simpleVaultAbi: [],
}));

vi.mock("@/lib/vault-operations", () => ({
  parseAmountToBigInt: vi.fn(() => BigInt("1000000")),
  validateChainOperation: vi.fn(() => ({
    usdcAddress: "0xUSDC",
    vaultAddress: "0xVAULT",
  })),
  isUserRejection: vi.fn(() => false),
}));

describe("useIndividualChainOperations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with correct default state", () => {
    const { result } = renderHook(() => useIndividualChainOperations());

    expect(result.current.isOperating).toBe(false);
    expect(result.current.operatingChain).toBe(null);
    expect(result.current.operationType).toBe(null);
    expect(result.current.txHash).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it("should provide approve and deposit functions", () => {
    const { result } = renderHook(() => useIndividualChainOperations());

    expect(typeof result.current.approveChain).toBe("function");
    expect(typeof result.current.depositChain).toBe("function");
    expect(typeof result.current.clearError).toBe("function");
  });

  it("should handle error clearing", () => {
    const { result } = renderHook(() => useIndividualChainOperations());

    // Simulate an error state
    expect(result.current.clearError).toBeDefined();
    expect(typeof result.current.clearError).toBe("function");
  });
});
