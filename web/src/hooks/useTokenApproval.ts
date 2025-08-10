import { useCallback } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { erc20Abi, maxUint256 } from "viem";
import { SupportedChainId } from "@/lib/contracts";
import { CommonValidations, validateOrThrow } from "@/lib/validators";

export interface UseTokenApprovalParams {
  chainId: SupportedChainId;
  tokenAddress: `0x${string}`;
  spenderAddress: `0x${string}`;
  useInfiniteApproval?: boolean;
}

export interface UseTokenApprovalReturn {
  currentAllowance: bigint | undefined;
  isApproving: boolean;
  approveTxHash: `0x${string}` | undefined;
  isApprovalConfirmed: boolean;
  approveError: unknown;
  allowanceError: unknown;
  approveToken: (amount: bigint) => void;
  revokeApproval: () => void;
  refetchAllowance: () => Promise<unknown>;
  resetApproval: () => void;
  needsApproval: (amount: bigint) => boolean | undefined;
  hasInfiniteApproval: () => boolean;
}

export function useTokenApproval({
  chainId,
  tokenAddress,
  spenderAddress,
  useInfiniteApproval = true,
}: UseTokenApprovalParams): UseTokenApprovalReturn {
  const { address } = useAccount();

  const {
    data: currentAllowance,
    refetch: refetchAllowance,
    error: allowanceError,
  } = useReadContract({
    chainId,
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, spenderAddress] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const {
    writeContract: approveToken,
    isPending: isApproving,
    data: approveTxHash,
    error: approveError,
    reset: resetApproval,
  } = useWriteContract();

  const { isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
    chainId,
  });

  const needsApproval = useCallback(
    (amount: bigint): boolean | undefined => {
      if (currentAllowance === undefined) {
        return undefined;
      }
      return currentAllowance < amount;
    },
    [currentAllowance]
  );

  const handleApproveToken = useCallback(
    (amount: bigint) => {
      validateOrThrow(
        CommonValidations.bigIntAmount(amount),
        "Approval amount validation failed"
      );

      const approvalAmount = useInfiniteApproval ? maxUint256 : amount;

      approveToken({
        chainId,
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [spenderAddress, approvalAmount],
      });
    },
    [approveToken, chainId, tokenAddress, spenderAddress, useInfiniteApproval]
  );

  const revokeApproval = useCallback(() => {
    approveToken({
      chainId,
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [spenderAddress, 0n],
    });
  }, [approveToken, chainId, tokenAddress, spenderAddress]);

  const hasInfiniteApproval = useCallback((): boolean => {
    if (!currentAllowance) return false;
    const threshold = (maxUint256 * 9n) / 10n;
    return currentAllowance >= threshold;
  }, [currentAllowance]);

  return {
    currentAllowance,
    isApproving,
    approveTxHash,
    isApprovalConfirmed,
    approveError,
    allowanceError,
    approveToken: handleApproveToken,
    revokeApproval,
    refetchAllowance,
    resetApproval,
    needsApproval,
    hasInfiniteApproval,
  };
}
