import { useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { USDC_DECIMALS } from "@/constant/contracts";
import { OperationType, SupportedTokenSymbol } from "@/types/ui-state";
import { VALIDATION_CONFIG } from "@/constant/operation-constants";
import { validateInput, ValidationResult } from "@/lib/validation";

export interface UseInputValidationProps {
  amount: string;
  type: OperationType;
  walletBalance?: bigint;
  vaultBalance?: bigint;
  chainId?: number;
  token?: {
    symbol: SupportedTokenSymbol;
    decimals: number;
    minAmount?: string;
  };
}

export function useInputValidation({
  amount,
  type,
  walletBalance,
  vaultBalance,
  chainId,
  token = {
    symbol: "USDC" as const,
    decimals: USDC_DECIMALS,
    minAmount: VALIDATION_CONFIG.MIN_AMOUNTS.USDC,
  },
}: UseInputValidationProps): ValidationResult {
  const { address, isConnected } = useAccount();

  const { data: ethBalance } = useBalance({
    address,
    chainId,
  });

  return useMemo(() => {
    return validateInput({
      amount,
      type,
      walletBalance,
      vaultBalance,
      isConnected,
      address,
      ethBalance: ethBalance?.value,
      token,
    });
  }, [
    amount,
    type,
    walletBalance,
    vaultBalance,
    token,
    isConnected,
    address,
    ethBalance?.value,
  ]);
}
