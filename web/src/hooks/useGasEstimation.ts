"use client";

import { useMemo } from "react";
import {
  useAccount,
  useGasPrice,
  useReadContract,
  useSimulateContract,
  useBalance,
} from "wagmi";
import { SupportedChainId } from "@/constant/chains";
import { getVaultAddress, getUsdcAddress } from "@/constant/contracts";
import { parseUnits, formatUnits } from "viem";
import { erc20Abi } from "viem";
import { simpleVaultAbi } from "@/generated/wagmi";

const GAS_BUFFER_PERCENT = 20n;

export interface TransactionEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  estimatedCost: bigint;
  estimatedCostFormatted: string;
}

export interface GasEstimateData {
  chainId: SupportedChainId;
  approvalGas: TransactionEstimate | null;
  depositGas: TransactionEstimate | null;
  totalGasCost: bigint;
  totalGasCostFormatted: string;
  isLoading: boolean;
  error: string | null;
  hasEnoughAllowance: boolean;
  needsApproval: boolean;
  allowanceState: "loading" | "loaded" | "error";
  canAffordGas: boolean;
  nativeBalance: bigint;
  approvalSimulation: any;
  depositSimulation: any;
}

export interface UseGasEstimationParams {
  chainAmounts: Array<{
    chainId: SupportedChainId;
    amount: string;
  }>;
  enabled?: boolean;
}

export interface UseGasEstimationReturn {
  gasEstimates: GasEstimateData[];
  totalGasCostAcrossChains: bigint;
  totalGasCostFormattedETH: string;
  isLoading: boolean;
  hasErrors: boolean;
  needsApprovalOnAnyChain: boolean;
  allChainsApproved: boolean;
  canProceedWithDeposit: boolean;
  hasAllowanceLoading: boolean;
  hasAllowanceErrors: boolean;
  allAllowancesLoaded: boolean;
}

function useChainGasEstimation(
  chainId: SupportedChainId,
  amount: string,
  enabled: boolean
) {
  const { address } = useAccount();

  const vaultAddress = getVaultAddress(chainId);
  const usdcAddress = getUsdcAddress(chainId);
  const amountWei = amount ? parseUnits(amount, 6) : 0n;

  // Check current allowance
  const {
    data: currentAllowance,
    isLoading: allowanceLoading,
    error: allowanceError,
  } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && vaultAddress ? [address, vaultAddress] : undefined,
    chainId,
    query: { enabled: enabled && !!address },
  });

  // Determine allowance state
  const allowanceState: "loading" | "loaded" | "error" = allowanceLoading
    ? "loading"
    : allowanceError
    ? "error"
    : "loaded";

  // Only calculate approval logic when allowance is actually loaded
  const hasEnoughAllowance =
    allowanceState === "loaded" &&
    currentAllowance !== undefined &&
    currentAllowance >= amountWei;

  const needsApproval =
    amountWei > 0n &&
    allowanceState === "loaded" &&
    currentAllowance !== undefined &&
    currentAllowance < amountWei;

  // Get native balance for gas affordability check
  const { data: nativeBalance } = useBalance({
    address,
    chainId,
    query: { enabled: enabled && !!address },
  });

  const { data: gasPrice, isLoading: gasPriceLoading } = useGasPrice({
    chainId,
    query: { enabled: enabled && !!address && !!amount },
  });

  // Simulate approval transaction (only if needed)
  const {
    data: approvalSimulation,
    isLoading: approvalSimLoading,
    error: approvalError,
  } = useSimulateContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [vaultAddress, amountWei],
    account: address,
    chainId,
    query: {
      enabled: enabled && !!address && needsApproval && amountWei > 0n,
    },
  });

  // Simulate deposit transaction
  const {
    data: depositSimulation,
    isLoading: depositSimLoading,
    error: depositError,
  } = useSimulateContract({
    address: vaultAddress,
    abi: simpleVaultAbi,
    functionName: "deposit",
    args: [usdcAddress, amountWei],
    account: address,
    chainId,
    query: {
      enabled: enabled && !!address && !!amount && amountWei > 0n,
    },
  });

  return useMemo(() => {
    const isLoading =
      gasPriceLoading || approvalSimLoading || depositSimLoading;
    const hasError = approvalError || depositError;

    const nativeBalanceValue = nativeBalance?.value || 0n;

    if (!gasPrice || isLoading || hasError) {
      return {
        chainId,
        approvalGas: null,
        depositGas: null,
        totalGasCost: 0n,
        totalGasCostFormatted: "0",
        isLoading,
        error: hasError
          ? (() => {
              const msg =
                approvalError?.message ??
                depositError?.message ??
                "unknown error";
              return `Simulation failed: ${msg}`;
            })()
          : null,
        hasEnoughAllowance: hasEnoughAllowance || false,
        needsApproval: needsApproval || false,
        allowanceState,
        canAffordGas: false,
        nativeBalance: nativeBalanceValue,
        approvalSimulation: null,
        depositSimulation: null,
      };
    }

    // Extract gas limits from simulations and add 20% buffer
    const approvalGasLimit = approvalSimulation?.request?.gas;
    const depositGasLimit = depositSimulation?.request?.gas;

    const multiplier = 100n + GAS_BUFFER_PERCENT;
    const approvalGasWithBuffer = approvalGasLimit
      ? (approvalGasLimit * multiplier) / 100n
      : 0n;
    const depositGasWithBuffer = depositGasLimit
      ? (depositGasLimit * multiplier) / 100n
      : 0n;

    const approvalCost = needsApproval ? approvalGasWithBuffer * gasPrice : 0n;
    const depositCost = depositGasWithBuffer * gasPrice;
    const totalCost = approvalCost + depositCost;

    const canAffordGas = nativeBalanceValue >= totalCost;

    const approvalGas =
      needsApproval && approvalGasLimit
        ? {
            gasLimit: approvalGasWithBuffer,
            gasPrice,
            estimatedCost: approvalCost,
            estimatedCostFormatted: formatUnits(approvalCost, 18),
          }
        : null;

    const depositGas = depositGasLimit
      ? {
          gasLimit: depositGasWithBuffer,
          gasPrice,
          estimatedCost: depositCost,
          estimatedCostFormatted: formatUnits(depositCost, 18),
        }
      : null;

    return {
      chainId,
      approvalGas,
      depositGas,
      totalGasCost: totalCost,
      totalGasCostFormatted: formatUnits(totalCost, 18),
      isLoading: false,
      error: null,
      hasEnoughAllowance: hasEnoughAllowance || false,
      needsApproval: needsApproval || false,
      allowanceState,
      canAffordGas,
      nativeBalance: nativeBalanceValue,
      approvalSimulation: needsApproval ? approvalSimulation : null,
      depositSimulation,
    };
  }, [
    chainId,
    gasPrice,
    gasPriceLoading,
    approvalSimLoading,
    depositSimLoading,
    approvalError,
    depositError,
    hasEnoughAllowance,
    needsApproval,
    allowanceState,
    nativeBalance,
    approvalSimulation,
    depositSimulation,
  ]);
}

export function useGasEstimation({
  chainAmounts,
  enabled = true,
}: UseGasEstimationParams): UseGasEstimationReturn {
  // Create a map for easier lookup
  const chainAmountMap = useMemo(() => {
    const map = new Map<SupportedChainId, string>();
    chainAmounts.forEach(({ chainId, amount }) => {
      map.set(chainId, amount);
    });
    return map;
  }, [chainAmounts]);

  const ethSepoliaEstimate = useChainGasEstimation(
    SupportedChainId.ETH_SEPOLIA,
    chainAmountMap.get(SupportedChainId.ETH_SEPOLIA) || "",
    enabled && chainAmountMap.has(SupportedChainId.ETH_SEPOLIA)
  );

  const seiTestnetEstimate = useChainGasEstimation(
    SupportedChainId.SEI_TESTNET,
    chainAmountMap.get(SupportedChainId.SEI_TESTNET) || "",
    enabled && chainAmountMap.has(SupportedChainId.SEI_TESTNET)
  );

  return useMemo(() => {
    const gasEstimates: GasEstimateData[] = [];

    if (chainAmountMap.has(SupportedChainId.ETH_SEPOLIA)) {
      gasEstimates.push(ethSepoliaEstimate);
    }

    if (chainAmountMap.has(SupportedChainId.SEI_TESTNET)) {
      gasEstimates.push(seiTestnetEstimate);
    }

    const totalGasCostAcrossChains = gasEstimates.reduce(
      (total, estimate) => total + estimate.totalGasCost,
      0n
    );

    const totalGasCostFormattedETH = formatUnits(totalGasCostAcrossChains, 18);

    const isLoading = gasEstimates.some((estimate) => estimate.isLoading);
    const hasErrors = gasEstimates.some((estimate) => estimate.error !== null);

    // Helper properties for UI logic
    const needsApprovalOnAnyChain = gasEstimates.some(
      (estimate) => estimate.needsApproval
    );
    const allChainsApproved = gasEstimates.every(
      (estimate) => estimate.hasEnoughAllowance
    );

    // Allowance state helpers
    const hasAllowanceLoading = gasEstimates.some(
      (estimate) => estimate.allowanceState === "loading"
    );
    const hasAllowanceErrors = gasEstimates.some(
      (estimate) => estimate.allowanceState === "error"
    );
    const allAllowancesLoaded = gasEstimates.every(
      (estimate) => estimate.allowanceState === "loaded"
    );

    const canProceedWithDeposit =
      allAllowancesLoaded &&
      allChainsApproved &&
      gasEstimates.every((estimate) => estimate.canAffordGas);

    return {
      gasEstimates,
      totalGasCostAcrossChains,
      totalGasCostFormattedETH,
      isLoading,
      hasErrors,
      needsApprovalOnAnyChain,
      allChainsApproved,
      canProceedWithDeposit,
      hasAllowanceLoading,
      hasAllowanceErrors,
      allAllowancesLoaded,
    };
  }, [chainAmountMap, ethSepoliaEstimate, seiTestnetEstimate]);
}
