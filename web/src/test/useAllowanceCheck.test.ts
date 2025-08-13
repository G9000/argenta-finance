import { renderHook } from "@testing-library/react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockedFunction,
} from "vitest";
import { useAccount, useReadContracts } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "viem";

import { useAllowanceCheck, ALLOWANCE_STATE } from "../useAllowanceCheck";
import { SupportedChainId } from "@/constant/chains";

vi.mock("wagmi", () => ({
  useAccount: vi.fn(),
  useReadContracts: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}));

vi.mock("@/constant/chains", () => ({
  SupportedChainId: {
    ETH_SEPOLIA: 11155111,
    SEI_TESTNET: 713715,
  },
}));

vi.mock("@/constant/contracts", () => ({
  getVaultAddress: vi.fn(() => "0xVaultAddress"),
  getUsdcAddress: vi.fn(() => "0xUsdcAddress"),
}));

const MOCK_ADDRESS = "0x1234567890123456789012345678901234567890" as const;
const CHAIN_1 = SupportedChainId.ETH_SEPOLIA;
const CHAIN_2 = SupportedChainId.SEI_TESTNET;

const mockUseAccount = useAccount as MockedFunction<typeof useAccount>;
const mockUseReadContracts = useReadContracts as MockedFunction<
  typeof useReadContracts
>;
const mockUseQueryClient = useQueryClient as MockedFunction<
  typeof useQueryClient
>;

const createMockQueryClient = () => ({
  invalidateQueries: vi.fn(),
});

const createMockContractResults = (
  decimalsResults: Array<{ result?: number; error?: Error }>,
  allowanceResults: Array<{ result?: bigint; error?: Error }>
) => {
  const results: any[] = [];
  decimalsResults.forEach((decimals, i) => {
    results.push(decimals);
    results.push(allowanceResults[i]);
  });
  return results;
};

describe("useAllowanceCheck", () => {
  beforeEach(() => {
    mockUseAccount.mockReturnValue({ address: MOCK_ADDRESS } as any);
    mockUseQueryClient.mockReturnValue(createMockQueryClient() as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("marks all chains approved when allowances >= required", async () => {
      const chainAmounts = [
        { chainId: CHAIN_1, amount: "100" },
        { chainId: CHAIN_2, amount: "50" },
      ];

      const mockData = createMockContractResults(
        [{ result: 6 }, { result: 6 }],
        [{ result: parseUnits("200", 6) }, { result: parseUnits("100", 6) }]
      );

      mockUseReadContracts.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(result.current.allowanceData).toHaveLength(2);
      expect(result.current.allChainsApproved).toBe(true);
      expect(result.current.needsApprovalOnAnyChain).toBe(false);
      expect(result.current.allAllowancesLoaded).toBe(true);
      expect(result.current.hasAllowanceErrors).toBe(false);
      expect(result.current.hasAllowanceLoading).toBe(false);

      expect(result.current.allowanceData[0]).toMatchObject({
        chainId: CHAIN_1,
        allowanceState: ALLOWANCE_STATE.LOADED,
        hasEnoughAllowance: true,
        needsApproval: false,
        tokenDecimals: 6,
      });
    });

    it("handles mixed approval states across chains", async () => {
      const chainAmounts = [
        { chainId: CHAIN_1, amount: "100" },
        { chainId: CHAIN_2, amount: "50" },
      ];

      const mockData = createMockContractResults(
        [{ result: 6 }, { result: 6 }],
        [{ result: parseUnits("50", 6) }, { result: parseUnits("100", 6) }]
      );

      mockUseReadContracts.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(result.current.needsApprovalOnAnyChain).toBe(true);
      expect(result.current.allChainsApproved).toBe(false);
      expect(result.current.allowanceData[0].needsApproval).toBe(true);
      expect(result.current.allowanceData[1].needsApproval).toBe(false);
    });
  });

  describe("Loading and Error States", () => {
    it("shows loading when query is loading", async () => {
      const chainAmounts = [{ chainId: CHAIN_1, amount: "100" }];

      mockUseReadContracts.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(result.current.allowanceData[0].allowanceState).toBe(
        ALLOWANCE_STATE.LOADING
      );
      expect(result.current.hasAllowanceLoading).toBe(true);
      expect(result.current.allAllowancesLoaded).toBe(false);
    });

    it("sets ERROR when allowance call fails", async () => {
      const chainAmounts = [{ chainId: CHAIN_1, amount: "100" }];
      const err = new Error("RPC failed");
      const mockData = createMockContractResults(
        [{ result: 6 }],
        [{ error: err }]
      );

      mockUseReadContracts.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(result.current.allowanceData[0]).toMatchObject({
        allowanceState: ALLOWANCE_STATE.ERROR,
        error: err,
        currentAllowance: 0n,
        hasEnoughAllowance: false,
        needsApproval: false,
      });
      expect(result.current.hasAllowanceErrors).toBe(true);
      expect(result.current.allAllowancesLoaded).toBe(false);
    });

    it("falls back to provided decimals when decimals call fails (still LOADED)", async () => {
      const chainAmounts = [{ chainId: CHAIN_1, amount: "100" }];
      const mockData = createMockContractResults(
        [{ error: new Error("decimals failed") }],
        [{ result: parseUnits("150", 6) }]
      );

      mockUseReadContracts.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() =>
        useAllowanceCheck({ chainAmounts, decimals: 6 })
      );

      expect(result.current.allowanceData[0]).toMatchObject({
        allowanceState: ALLOWANCE_STATE.LOADED,
        tokenDecimals: 6,
        hasEnoughAllowance: true,
        needsApproval: false,
      });
    });
  });

  describe("Input Handling", () => {
    it("treats invalid amount strings as 0n", async () => {
      const chainAmounts = [{ chainId: CHAIN_1, amount: "invalid-amount" }];

      const mockData = createMockContractResults(
        [{ result: 6 }],
        [{ result: parseUnits("100", 6) }]
      );

      mockUseReadContracts.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(result.current.allowanceData[0]).toMatchObject({
        requiredAmount: 0n,
        hasEnoughAllowance: true,
        needsApproval: false,
      });
    });

    it("returns empty results when chainAmounts is empty", async () => {
      const chainAmounts: any[] = [];

      mockUseReadContracts.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(result.current.allowanceData).toHaveLength(0);
      expect(result.current.allChainsApproved).toBe(false);
      expect(result.current.needsApprovalOnAnyChain).toBe(false);
      expect(result.current.allAllowancesLoaded).toBe(false);
      expect(result.current.hasAllowanceLoading).toBe(false);
      expect(result.current.hasAllowanceErrors).toBe(false);
    });

    it("filters out empty amount rows for reads but keeps base order", async () => {
      const chainAmounts = [
        { chainId: CHAIN_1, amount: "100" },
        { chainId: CHAIN_2, amount: "   " },
      ];

      const mockData = createMockContractResults(
        [{ result: 6 }],
        [{ result: parseUnits("200", 6) }]
      );

      mockUseReadContracts.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(result.current.allowanceData).toHaveLength(2);
      expect(result.current.allowanceData[0].allowanceState).toBe(
        ALLOWANCE_STATE.LOADED
      );
      expect(result.current.allowanceData[1].allowanceState).toBe(
        ALLOWANCE_STATE.LOADING
      );
      expect(result.current.hasAllowanceLoading).toBe(true);
      expect(result.current.allAllowancesLoaded).toBe(false);
    });
  });

  describe("State Transitions", () => {
    it("returns LOADING when user is disconnected", async () => {
      const chainAmounts = [{ chainId: CHAIN_1, amount: "100" }];
      mockUseAccount.mockReturnValue({ address: undefined } as any);
      mockUseReadContracts.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(result.current.allowanceData[0]).toMatchObject({
        allowanceState: ALLOWANCE_STATE.LOADING,
        hasEnoughAllowance: false,
        needsApproval: false,
        currentAllowance: 0n,
      });
    });

    it("returns LOADING when hook is disabled", async () => {
      const chainAmounts = [{ chainId: CHAIN_1, amount: "100" }];
      mockUseReadContracts.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() =>
        useAllowanceCheck({ chainAmounts, enabled: false })
      );

      expect(result.current.allowanceData[0]).toMatchObject({
        allowanceState: ALLOWANCE_STATE.LOADING,
        hasEnoughAllowance: false,
        needsApproval: false,
        currentAllowance: 0n,
      });
    });
  });

  describe("Boundary Conditions", () => {
    it("handles zero amounts (never needs approval)", async () => {
      const chainAmounts = [{ chainId: CHAIN_1, amount: "0" }];
      const mockData = createMockContractResults(
        [{ result: 6 }],
        [{ result: parseUnits("100", 6) }]
      );

      mockUseReadContracts.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(result.current.allowanceData[0]).toMatchObject({
        requiredAmount: 0n,
        hasEnoughAllowance: true,
        needsApproval: false,
      });
    });

    it("handles exact allowance equals required", async () => {
      const chainAmounts = [{ chainId: CHAIN_1, amount: "100" }];
      const exact = parseUnits("100", 6);
      const mockData = createMockContractResults(
        [{ result: 6 }],
        [{ result: exact }]
      );

      mockUseReadContracts.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(result.current.allowanceData[0]).toMatchObject({
        hasEnoughAllowance: true,
        needsApproval: false,
        currentAllowance: exact,
        requiredAmount: exact,
      });
    });

    it("handles very large amounts via BigInt", async () => {
      const large = "999999999999999999999";
      const chainAmounts = [{ chainId: CHAIN_1, amount: large }];
      const mockData = createMockContractResults(
        [{ result: 6 }],
        [{ result: parseUnits(large, 6) }]
      );

      mockUseReadContracts.mockReturnValue({
        data: mockData,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(typeof result.current.allowanceData[0].currentAllowance).toBe(
        "bigint"
      );
      expect(result.current.allowanceData[0].hasEnoughAllowance).toBe(true);
    });
  });

  describe("Utilities", () => {
    it("exposes working refetch function", async () => {
      const mockRefetch = vi.fn();
      const chainAmounts = [{ chainId: CHAIN_1, amount: "100" }];
      mockUseReadContracts.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));
      result.current.refetch();
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it("invalidates only allowance scope queries", async () => {
      const mockInvalidateQueries = vi.fn();
      const mockQueryClient = { invalidateQueries: mockInvalidateQueries };
      mockUseQueryClient.mockReturnValue(mockQueryClient as any);
      const chainAmounts = [{ chainId: CHAIN_1, amount: "100" }];

      mockUseReadContracts.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useAllowanceCheck({ chainAmounts }));
      result.current.invalidateAllowances();

      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
      const [{ predicate }] = mockInvalidateQueries.mock.calls[0];
      expect(typeof predicate).toBe("function");
      expect(predicate({ meta: { scopeKey: "allowance-v1" } } as any)).toBe(
        true
      );
      expect(predicate({ meta: { scopeKey: "other" } } as any)).toBe(false);
    });

    it("builds contracts and query options correctly", async () => {
      const chainAmounts = [
        { chainId: CHAIN_1, amount: "100" },
        { chainId: CHAIN_2, amount: "50" },
      ];

      const ret = { data: [], isLoading: false, error: null, refetch: vi.fn() };
      mockUseReadContracts.mockReturnValue(ret as any);

      renderHook(() => useAllowanceCheck({ chainAmounts }));

      expect(mockUseReadContracts).toHaveBeenCalledTimes(1);
      const call = mockUseReadContracts.mock.calls[0] as any[];
      const args = call[0] as any;
      expect(Array.isArray(args.contracts)).toBe(true);
      expect(args.contracts.length).toBe(4); // 2 calls per chain
      expect(args.allowFailure).toBe(true);
      expect(args.query.enabled).toBe(true);
      expect(args.query.staleTime).toBe(0);
      expect(typeof args.query.placeholderData).toBe("function");
      expect(args.query.meta).toEqual({ scopeKey: "allowance-v1" });
    });
  });
});
