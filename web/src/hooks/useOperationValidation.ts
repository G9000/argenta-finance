import { useInputValidation } from "./useInputValidation";
import { SupportedTokenSymbol } from "@/types/ui-state";
import {
  OPERATION_TYPES,
  VALIDATION_CONFIG,
} from "@/constant/operation-constants";
import {
  SupportedChainId,
  USDC_DECIMALS,
  ETH_DECIMALS,
} from "@/constant/contracts";
import { ValidationResult } from "@/lib/validation";

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

function assertNever(value: never): never {
  throw new Error(`Unhandled token: ${JSON.stringify(value)}`);
}

export const getTokenConfig = (token: SupportedTokenSymbol) => {
  switch (token) {
    case "ETH":
      return {
        symbol: "ETH" as const,
        decimals: ETH_DECIMALS,
        minAmount: VALIDATION_CONFIG.MIN_AMOUNTS.ETH,
      };
    case "USDC":
      return {
        symbol: "USDC" as const,
        decimals: USDC_DECIMALS,
        minAmount: VALIDATION_CONFIG.MIN_AMOUNTS.USDC,
      };
    default:
      return assertNever(token);
  }
};

export function useOperationValidation({
  depositAmount,
  withdrawAmount,
  walletBalance,
  vaultBalance,
  chainId,
  token = "USDC",
}: UseOperationValidationParams): UseOperationValidationReturn {
  const tokenConfig = getTokenConfig(token);

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
