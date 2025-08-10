import { describe, it, expect } from "vitest";
import { parseUnits } from "viem";
import { validateInput } from "@/lib/validation";
import { OPERATION_TYPES, VALIDATION_MESSAGES } from "@/types/operations";

// For brevity we focus on USDC only
const USDC_TOKEN = {
  symbol: "USDC" as const,
  decimals: 6,
  minAmount: "0.000001",
};

const MOCK_ADDRESS = "0x1234567890123456789012345678901234567890";

describe("USDC Input Validation - Simple Tests", () => {
  describe("Basic Validation", () => {
    it("should require wallet connection", () => {
      const result = validateInput({
        amount: "100",
        type: OPERATION_TYPES.DEPOSIT,
        isConnected: false,
        token: USDC_TOKEN,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        VALIDATION_MESSAGES.ERRORS.WALLET_NOT_CONNECTED
      );
    });

    it("should reject invalid number formats", () => {
      const result = validateInput({
        amount: "abc",
        type: OPERATION_TYPES.DEPOSIT,
        isConnected: true,
        address: MOCK_ADDRESS,
        token: USDC_TOKEN,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        VALIDATION_MESSAGES.ERRORS.INVALID_NUMBER_FORMAT
      );
    });

    it("should reject zero amount", () => {
      const result = validateInput({
        amount: "0",
        type: OPERATION_TYPES.DEPOSIT,
        isConnected: true,
        address: MOCK_ADDRESS,
        token: USDC_TOKEN,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        VALIDATION_MESSAGES.ERRORS.AMOUNT_NOT_POSITIVE
      );
    });

    it("should reject too many decimal places", () => {
      const result = validateInput({
        amount: "1.1234567",
        type: OPERATION_TYPES.DEPOSIT,
        isConnected: true,
        address: MOCK_ADDRESS,
        token: USDC_TOKEN,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        VALIDATION_MESSAGES.ERRORS.DECIMAL_PRECISION_EXCEEDED(6, "USDC")
      );
    });

    it("should accept valid amounts", () => {
      const result = validateInput({
        amount: "100.50",
        type: OPERATION_TYPES.DEPOSIT,
        isConnected: true,
        address: MOCK_ADDRESS,
        walletBalance: parseUnits("500", 6),
        token: USDC_TOKEN,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle insufficient wallet balance", () => {
      const result = validateInput({
        amount: "150",
        type: OPERATION_TYPES.DEPOSIT,
        isConnected: true,
        address: MOCK_ADDRESS,
        walletBalance: parseUnits("100", 6),
        token: USDC_TOKEN,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain(
        VALIDATION_MESSAGES.ERRORS.INSUFFICIENT_WALLET_BALANCE("USDC", "100")
      );
    });

    it("should handle empty amounts", () => {
      const result = validateInput({
        amount: "",
        type: OPERATION_TYPES.DEPOSIT,
        isConnected: true,
        address: MOCK_ADDRESS,
        token: USDC_TOKEN,
      });

      expect(result.isValid).toBe(false);
    });

    it("should warn about large transaction amounts", () => {
      const result = validateInput({
        amount: "15000",
        type: OPERATION_TYPES.DEPOSIT,
        isConnected: true,
        address: MOCK_ADDRESS,
        walletBalance: parseUnits("20000", 6),
        token: USDC_TOKEN,
      });

      expect(result.warnings).toContain(
        VALIDATION_MESSAGES.WARNINGS.LARGE_TRANSACTION_AMOUNT
      );
    });

    it("should warn when wallet balance is unknown", () => {
      const result = validateInput({
        amount: "100",
        type: OPERATION_TYPES.DEPOSIT,
        isConnected: true,
        address: MOCK_ADDRESS,
        token: USDC_TOKEN,
      });

      expect(result.warnings).toContain(
        VALIDATION_MESSAGES.WARNINGS.WALLET_BALANCE_UNKNOWN
      );
    });

    it("should warn when vault balance is unknown", () => {
      const result = validateInput({
        amount: "50",
        type: OPERATION_TYPES.WITHDRAW,
        isConnected: true,
        address: MOCK_ADDRESS,
        token: USDC_TOKEN,
      });

      expect(result.warnings).toContain(
        VALIDATION_MESSAGES.WARNINGS.VAULT_BALANCE_UNKNOWN
      );
    });

    it("should handle minimum amount validation", () => {
      const result = validateInput({
        amount: "0.0000001",
        type: OPERATION_TYPES.DEPOSIT,
        isConnected: true,
        address: MOCK_ADDRESS,
        token: USDC_TOKEN,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        VALIDATION_MESSAGES.ERRORS.DECIMAL_PRECISION_EXCEEDED(6, "USDC")
      );
    });

    it("should handle parseUnits errors gracefully", () => {
      const result = validateInput({
        amount: "12..34",
        type: OPERATION_TYPES.DEPOSIT,
        isConnected: true,
        address: MOCK_ADDRESS,
        token: USDC_TOKEN,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        VALIDATION_MESSAGES.ERRORS.INVALID_NUMBER_FORMAT
      );
    });
  });
});
