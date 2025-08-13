"use client";

import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseUnits, erc20Abi } from "viem";
import { SupportedChainId } from "@/constant/chains";
import { getVaultAddress, getUsdcAddress } from "@/constant/contracts";

export const ALLOWANCE_STATE = {
  LOADING: "loading",
  LOADED: "loaded",
  ERROR: "error",
} as const;
export type AllowanceState =
  (typeof ALLOWANCE_STATE)[keyof typeof ALLOWANCE_STATE];

export interface AllowanceData {
  chainId: SupportedChainId;
  hasEnoughAllowance: boolean;
  needsApproval: boolean;
  allowanceState: AllowanceState;
  currentAllowance: bigint;
  requiredAmount: bigint;
  error?: unknown;
  tokenDecimals?: number;
}

export interface UseAllowanceCheckParams {
  chainAmounts: Array<{ chainId: SupportedChainId; amount: string }>;
  enabled?: boolean;
  decimals?: number;
}

export interface UseAllowanceCheckReturn {
  allowanceData: AllowanceData[];
  needsApprovalOnAnyChain: boolean;
  allChainsApproved: boolean;
  hasAllowanceLoading: boolean;
  hasAllowanceErrors: boolean;
  allAllowancesLoaded: boolean;
  refetch: () => void;
  invalidateAllowances: () => void;
}

const SCOPE = "allowance-v1";

function safeParseUnits(v: string, dec: number): bigint {
  try {
    return v?.trim() ? parseUnits(v, dec) : 0n;
  } catch {
    return 0n;
  }
}

export function useAllowanceCheck({
  chainAmounts,
  enabled = true,
  decimals = 6,
}: UseAllowanceCheckParams): UseAllowanceCheckReturn {
  const { address } = useAccount();
  const qc = useQueryClient();

  const rows = useMemo(
    () =>
      chainAmounts
        .map((r, i) => ({ ...r, _i: i }))
        .filter(({ amount }) => !!amount?.trim()),
    [chainAmounts]
  );

  // Build contracts for filtered rows
  const contracts = useMemo(() => {
    if (!address || rows.length === 0) return [];
    return rows.flatMap(({ chainId }) => {
      const token = getUsdcAddress(chainId);
      const spender = getVaultAddress(chainId);
      return [
        {
          address: token,
          abi: erc20Abi,
          functionName: "decimals" as const,
          chainId,
        },
        {
          address: token,
          abi: erc20Abi,
          functionName: "allowance" as const,
          args: [address, spender] as const,
          chainId,
        },
      ];
    });
  }, [address, rows]);

  console.log("contracts", contracts);

  const isActive = enabled && !!address && rows.length > 0;

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    allowFailure: true,
    query: {
      enabled: isActive,
      staleTime: 0,
      gcTime: 60_000,
      placeholderData: (p) => p,
      meta: { scopeKey: SCOPE },
    },
  });

  const invalidateAllowances = () =>
    qc.invalidateQueries({
      predicate: (q) => (q as any).meta?.scopeKey === SCOPE,
    });

  const base: AllowanceData[] = chainAmounts.map(({ chainId }) => ({
    chainId,
    hasEnoughAllowance: false,
    needsApproval: false,
    allowanceState: ALLOWANCE_STATE.LOADING,
    currentAllowance: 0n,
    requiredAmount: 0n,
  }));

  rows.forEach(({ chainId, amount, _i }, idx) => {
    const decRes = data?.[idx * 2];
    const alloRes = data?.[idx * 2 + 1];

    const decOk = typeof decRes?.result === "number";
    const tokenDecimals = decOk ? (decRes!.result as number) : decimals;

    const required = safeParseUnits(amount, tokenDecimals);
    const onchain =
      alloRes && (alloRes as any).status === "success"
        ? ((alloRes as any).result as bigint)
        : alloRes &&
          (alloRes as any).status == null &&
          (alloRes as any).result !== undefined
        ? ((alloRes as any).result as bigint)
        : 0n;
    const callErr =
      alloRes && (alloRes as any).status === "failure"
        ? (alloRes as any).error
        : alloRes &&
          (alloRes as any).status == null &&
          (alloRes as any).error !== undefined
        ? (alloRes as any).error
        : undefined;

    const state: AllowanceState = !isActive
      ? ALLOWANCE_STATE.LOADING
      : isLoading
      ? ALLOWANCE_STATE.LOADING
      : callErr || error
      ? ALLOWANCE_STATE.ERROR
      : ALLOWANCE_STATE.LOADED;

    const hasEnough = state === ALLOWANCE_STATE.LOADED && onchain >= required;
    const needsApproval =
      state === ALLOWANCE_STATE.LOADED && required > 0n && onchain < required;

    base[_i] = {
      chainId,
      hasEnoughAllowance: hasEnough,
      needsApproval,
      allowanceState: state,
      currentAllowance: state === ALLOWANCE_STATE.LOADED ? onchain : 0n,
      requiredAmount: required,
      error: callErr || error || undefined,
      tokenDecimals,
    };
  });

  const needsApprovalOnAnyChain = base.some((r) => r.needsApproval);
  const allChainsApproved =
    base.length > 0 && base.every((r) => r.hasEnoughAllowance);
  const hasAllowanceLoading = base.some(
    (r) => r.allowanceState === ALLOWANCE_STATE.LOADING
  );
  const hasAllowanceErrors = base.some(
    (r) => r.allowanceState === ALLOWANCE_STATE.ERROR
  );
  const allAllowancesLoaded =
    base.length > 0 &&
    base.every((r) => r.allowanceState === ALLOWANCE_STATE.LOADED);

  return {
    allowanceData: base,
    needsApprovalOnAnyChain,
    allChainsApproved,
    hasAllowanceLoading,
    hasAllowanceErrors,
    allAllowancesLoaded,
    refetch,
    invalidateAllowances,
  };
}
