import { z } from "zod";
import { parseUnits } from "viem";
import {
  type SupportedChainId,
  SupportedChainId as SupportedChainIdEnum,
} from "@/constant/chains";

export enum ValidationReasonCode {
  WALLET_NOT_CONNECTED = "WALLET_NOT_CONNECTED",
  CHAIN_NOT_SUPPORTED = "CHAIN_NOT_SUPPORTED",
  AMOUNT_CONTAINS_COMMAS = "AMOUNT_CONTAINS_COMMAS",
  AMOUNT_CONTAINS_WHITESPACE = "AMOUNT_CONTAINS_WHITESPACE",
  AMOUNT_MULTIPLE_DOTS = "AMOUNT_MULTIPLE_DOTS",
  AMOUNT_INVALID_FORMAT = "AMOUNT_INVALID_FORMAT",
  AMOUNT_ZERO_OR_NEGATIVE = "AMOUNT_ZERO_OR_NEGATIVE",
  AMOUNT_TOO_MANY_DECIMALS = "AMOUNT_TOO_MANY_DECIMALS",
  AMOUNT_TOO_SMALL = "AMOUNT_TOO_SMALL",
  AMOUNT_TOO_LARGE = "AMOUNT_TOO_LARGE",
  AMOUNT_EXCEEDS_BALANCE = "AMOUNT_EXCEEDS_BALANCE",
}

function normalizeLeadingDot(amount: string): string {
  return amount.startsWith(".") ? "0" + amount : amount;
}

function normalizeUnicodeDigits(amount: string): string {
  return amount
    .replace(/[０-９]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xff10 + 0x30)
    )
    .replace(/[．]/g, ".");
}

const MIN_WEI = 1n; // Dust threshold
const MAX_WEI = parseUnits("1000000000", 6); // Absurd amount threshold

const SupportedChainEnum = z.union([
  z.literal(SupportedChainIdEnum.ETH_SEPOLIA),
  z.literal(SupportedChainIdEnum.SEI_TESTNET),
]);

export const ChainInputSchema = z
  .object({
    chainId: SupportedChainEnum,
    amount: z.string(),
    decimals: z.number().int().min(0).max(18).default(6),
    minWei: z.bigint().default(MIN_WEI),
    maxWei: z.bigint().default(MAX_WEI),
    balanceWei: z.bigint().optional(),
  })
  .transform((input, ctx) => {
    const { chainId, amount, decimals, minWei, maxWei, balanceWei } = input;

    // Step 1: Preprocess - trim, normalize Unicode digits, normalize leading dot
    let processedAmount = amount.trim();
    processedAmount = normalizeUnicodeDigits(processedAmount);
    processedAmount = normalizeLeadingDot(processedAmount);

    // Step 2: Reject commas
    if (processedAmount.includes(",")) {
      ctx.addIssue({
        code: "custom",
        message: "Remove commas from amount",
        params: { reasonCode: ValidationReasonCode.AMOUNT_CONTAINS_COMMAS },
      });
      return z.NEVER;
    }

    // Step 3: Reject any whitespace
    if (/\s/.test(processedAmount)) {
      ctx.addIssue({
        code: "custom",
        message: "Remove whitespace from amount",
        params: { reasonCode: ValidationReasonCode.AMOUNT_CONTAINS_WHITESPACE },
      });
      return z.NEVER;
    }

    // Step 4: Restrict to at most one decimal point
    const dotCount = (processedAmount.match(/\./g) || []).length;
    if (dotCount > 1) {
      ctx.addIssue({
        code: "custom",
        message: "Amount cannot contain multiple decimal points",
        params: { reasonCode: ValidationReasonCode.AMOUNT_MULTIPLE_DOTS },
      });
      return z.NEVER;
    }

    // Step 5: Check decimal precision doesn't exceed token decimals
    if (processedAmount.includes(".")) {
      const fractionalPart = processedAmount.split(".")[1];
      if (fractionalPart && fractionalPart.length > decimals) {
        ctx.addIssue({
          code: "custom",
          message: `Amount cannot have more than ${decimals} decimal places`,
          params: { reasonCode: ValidationReasonCode.AMOUNT_TOO_MANY_DECIMALS },
        });
        return z.NEVER;
      }
    }

    // Step 6: Ensure numeric and > 0, transform to amountWei
    try {
      const amountWei = parseUnits(processedAmount, decimals);

      if (amountWei <= 0n) {
        ctx.addIssue({
          code: "custom",
          message: "Amount must be greater than zero",
          params: { reasonCode: ValidationReasonCode.AMOUNT_ZERO_OR_NEGATIVE },
        });
        return z.NEVER;
      }

      // Check for dust amounts (too small)
      if (amountWei < minWei) {
        ctx.addIssue({
          code: "custom",
          message: "Amount is too small (below dust threshold)",
          params: { reasonCode: ValidationReasonCode.AMOUNT_TOO_SMALL },
        });
        return z.NEVER;
      }

      // Check for absurd amounts (too large)
      if (amountWei > maxWei) {
        ctx.addIssue({
          code: "custom",
          message: "Amount is too large",
          params: { reasonCode: ValidationReasonCode.AMOUNT_TOO_LARGE },
        });
        return z.NEVER;
      }

      // Check if amount exceeds balance (if balance is provided)
      if (balanceWei !== undefined && amountWei > balanceWei) {
        ctx.addIssue({
          code: "custom",
          message: "Amount exceeds available balance",
          params: { reasonCode: ValidationReasonCode.AMOUNT_EXCEEDS_BALANCE },
        });
        return z.NEVER;
      }

      return {
        chainId: chainId as SupportedChainId,
        rawAmount: amount,
        normalizedAmount: processedAmount,
        amountWei,
        decimals,
      };
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Invalid amount format",
        params: { reasonCode: ValidationReasonCode.AMOUNT_INVALID_FORMAT },
      });
      return z.NEVER;
    }
  });

export const ChainInputArraySchema = z.array(ChainInputSchema);

export type ValidatedChainInput = z.infer<typeof ChainInputSchema>;
export type ValidatedChainInputArray = z.infer<typeof ChainInputArraySchema>;

export function getValidationReasonCode(
  err: z.ZodError
): ValidationReasonCode | undefined {
  const withCode = err.issues.find(
    (i) => i.code === "custom" && (i as any).params?.reasonCode
  );
  return withCode
    ? ((withCode as any).params?.reasonCode as ValidationReasonCode)
    : undefined;
}

export function getValidationReasonCodeFromIssue(
  issue: z.ZodError["issues"][number]
): ValidationReasonCode | undefined {
  return issue.code === "custom" && (issue as any).params?.reasonCode
    ? ((issue as any).params?.reasonCode as ValidationReasonCode)
    : undefined;
}
