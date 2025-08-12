import { useMemo } from "react";
import { useAccount } from "wagmi";
import { z } from "zod";
import { type SupportedChainId, SUPPORTED_CHAINS } from "@/constant/chains";
import {
  ChainInputArraySchema,
  ValidationReasonCode,
  getValidationReasonCodeFromIssue,
} from "@/lib/validation";

interface ChainInput {
  chainId: SupportedChainId;
  amount: string;
  decimals?: number;
}

interface ChainValidation {
  chainId: SupportedChainId;
  amount: string;
  amountWei: bigint;
  isValid: boolean;
  error?: string;
  reasonCode?: ValidationReasonCode;
  normalizedAmount?: string;
}

interface UseInputValidationReturn {
  validChains: ChainValidation[];
  canProceed: boolean;
  isLoading: boolean;
  firstError?: string;
  hasEmptyAmounts: boolean;
}

export function useInputValidation(
  inputs: ChainInput[]
): UseInputValidationReturn {
  const { address, isConnected } = useAccount();

  const validChains = useMemo((): ChainValidation[] => {
    if (inputs.length === 0) {
      return [];
    }

    const validationResults = inputs.map(({ chainId, amount }) => {
      const result: ChainValidation = {
        chainId,
        amount,
        amountWei: 0n,
        isValid: false,
      };

      // 1. Check wallet connection
      if (!isConnected || !address) {
        result.error = "Wallet not connected";
        result.reasonCode = ValidationReasonCode.WALLET_NOT_CONNECTED;
        return result;
      }

      // 2. Check if chain is supported
      if (!SUPPORTED_CHAINS.includes(chainId)) {
        result.error = "Chain not supported";
        result.reasonCode = ValidationReasonCode.CHAIN_NOT_SUPPORTED;
        return result;
      }

      return result;
    });

    // Parse the entire array once to catch duplicate chain IDs and get validated results
    const nonEmptyInputs = inputs.filter((input) => input.amount.trim());
    if (nonEmptyInputs.length > 0) {
      try {
        const validatedResults = ChainInputArraySchema.parse(nonEmptyInputs);

        const validatedMap = new Map(
          validatedResults.map((result) => [result.chainId, result])
        );

        validationResults.forEach((result) => {
          const validated = validatedMap.get(result.chainId);
          if (validated && result.amount.trim()) {
            result.amountWei = validated.amountWei;
            result.normalizedAmount = validated.normalizedAmount;
            result.isValid = true;
            result.error = undefined;
            result.reasonCode = undefined;
          }
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.issues.forEach((issue) => {
            const reasonCode = getValidationReasonCodeFromIssue(issue);
            const errorMessage = issue.message || "Invalid amount format";

            // Handle array-level errors (like duplicate chain IDs)
            if (Array.isArray(issue.path) && issue.path.length >= 2) {
              const rowIndex = issue.path[0] as number;
              if (
                typeof rowIndex === "number" &&
                rowIndex < nonEmptyInputs.length
              ) {
                const errorChainId = nonEmptyInputs[rowIndex].chainId;
                const chainResult = validationResults.find(
                  (r) => r.chainId === errorChainId
                );
                if (chainResult) {
                  chainResult.error = errorMessage;
                  chainResult.reasonCode =
                    reasonCode || ValidationReasonCode.AMOUNT_INVALID_FORMAT;
                }
              }
            } else {
              const firstResult = validationResults.find((r) =>
                r.amount.trim()
              );
              if (firstResult) {
                firstResult.error = errorMessage;
                firstResult.reasonCode =
                  reasonCode || ValidationReasonCode.AMOUNT_INVALID_FORMAT;
              }
            }
          });
        }
      }
    }

    return validationResults;
  }, [inputs, isConnected, address]);

  const canProceed = validChains.some((chain) => chain.isValid);
  const firstError = validChains.find((chain) => chain.error)?.error;
  const hasEmptyAmounts = inputs.some((input) => !input.amount.trim());

  return {
    validChains,
    canProceed,
    isLoading: false,
    firstError,
    hasEmptyAmounts,
  };
}
