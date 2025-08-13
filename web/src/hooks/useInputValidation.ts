import { useMemo } from "react";
import { useAccount } from "wagmi";
import { z } from "zod";
import { type SupportedChainId, SUPPORTED_CHAINS } from "@/constant/chains";
import {
  ChainInputSchema,
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

    // Validate each input individually for proper error mapping
    inputs.forEach((input, inputIndex) => {
      if (!input.amount.trim()) return; // Skip empty inputs

      const result = validationResults[inputIndex];
      if (!result || result.chainId !== input.chainId) return;

      try {
        const validatedResult = ChainInputSchema.parse(input);

        result.amountWei = validatedResult.amountWei;
        result.normalizedAmount = validatedResult.normalizedAmount;
        result.isValid = true;
        result.error = undefined;
        result.reasonCode = undefined;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const firstIssue = error.issues[0];
          const reasonCode = getValidationReasonCodeFromIssue(firstIssue);
          result.error = firstIssue.message || "Invalid amount format";
          result.reasonCode =
            reasonCode || ValidationReasonCode.AMOUNT_INVALID_FORMAT;
        }
      }
    });

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
