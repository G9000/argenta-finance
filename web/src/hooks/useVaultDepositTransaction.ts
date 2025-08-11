import { useCallback } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { useWriteSimpleVaultDeposit } from "@/generated/wagmi";
import { SupportedChainId } from "@/constant/contracts";
import { CommonValidations, validateOrThrow } from "@/lib/validators";

export interface UseVaultDepositTransactionParams {
  chainId: SupportedChainId;
  vaultAddress: `0x${string}`;
}

export interface UseVaultDepositTransactionReturn {
  isDepositing: boolean;
  depositTxHash: string | undefined;
  isDepositConfirmed: boolean;
  depositError: Error | null | undefined;
  executeDepositTransaction: (
    tokenAddress: `0x${string}`,
    amount: bigint
  ) => void;
  resetDepositTransaction: () => void;
}

export function useVaultDepositTransaction({
  chainId,
  vaultAddress,
}: UseVaultDepositTransactionParams): UseVaultDepositTransactionReturn {
  const {
    writeContract: depositToVault,
    isPending: isDepositing,
    data: depositTxHash,
    error: depositError,
    reset: resetDepositTransaction,
  } = useWriteSimpleVaultDeposit();

  const { isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({
    hash: depositTxHash,
    chainId,
  });

  const executeDepositTransaction = useCallback(
    (tokenAddress: `0x${string}`, amount: bigint) => {
      validateOrThrow(
        CommonValidations.address(tokenAddress),
        "Token address validation failed"
      );

      validateOrThrow(
        CommonValidations.bigIntAmount(amount),
        "Deposit amount validation failed"
      );

      depositToVault({
        chainId,
        address: vaultAddress,
        args: [tokenAddress, amount],
      });
    },
    [depositToVault, chainId, vaultAddress]
  );

  return {
    isDepositing,
    depositTxHash,
    isDepositConfirmed,
    depositError,
    executeDepositTransaction,
    resetDepositTransaction,
  };
}
