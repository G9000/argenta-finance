import { useInputValidation } from "./useInputValidation";
import {
  OPERATION_TYPES,
  ValidationResult,
  SupportedTokenSymbol,
} from "@/types/operations";
import { SupportedChainId, USDC_DECIMALS, ETH_DECIMALS } from "@/lib/contracts";

interface UseOperationValidationParams {
  depositAmount: string;
  withdrawAmount: string;
  walletBalance: bigint | undefined;
  vaultBalance: bigint | undefined;
  chainId: SupportedChainId;
  token?: SupportedTokenSymbol;
}

interface UseOperationValidationReturn {
  depositValidation: ValidationResult;
  withdrawValidation: ValidationResult;
}

const TOKEN_CONFIGS = {
  USDC: {
    symbol: "USDC" as const,
    decimals: USDC_DECIMALS,
    minAmount: "0.000001",
  },
  ETH: {
    symbol: "ETH" as const,
    decimals: ETH_DECIMALS,
    minAmount: "0.000000000000001",
  },
} as const;

export function useOperationValidation({
  depositAmount,
  withdrawAmount,
  walletBalance,
  vaultBalance,
  chainId,
  token = "USDC",
}: UseOperationValidationParams): UseOperationValidationReturn {
  const tokenConfig = TOKEN_CONFIGS[token];

  const depositValidation = useInputValidation({
    amount: depositAmount,
    type: OPERATION_TYPES.DEPOSIT,
    walletBalance,
    vaultBalance,
    chainId,
    token: tokenConfig,
  });

  const withdrawValidation = useInputValidation({
    amount: withdrawAmount,
    type: OPERATION_TYPES.WITHDRAW,
    walletBalance,
    vaultBalance,
    chainId,
    token: tokenConfig,
  });

  return {
    depositValidation,
    withdrawValidation,
  };
}
