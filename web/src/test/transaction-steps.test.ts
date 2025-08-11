import { describe, it, expect } from "vitest";
import {
  getCurrentStepLabel,
  getCurrentStepDescription,
  TRANSACTION_STEP_LABELS,
  TRANSACTION_STEP_DESCRIPTIONS,
  TransactionStepState,
} from "@/lib/transaction-steps";
import { SupportedChainId } from "@/constant/contracts";

describe("Transaction Steps Utilities", () => {
  const baseState: TransactionStepState = {
    isApproving: false,
    approveTxHash: undefined,
    isApprovalConfirmed: false,
    isDepositing: false,
    depositTxHash: undefined,
    isDepositConfirmed: false,
    selectedChainId: SupportedChainId.ETH_SEPOLIA,
    depositAmount: "100",
  };

  describe("getCurrentStepLabel", () => {
    it("should return requesting approval label when approving without hash", () => {
      const state = { ...baseState, isApproving: true };
      expect(getCurrentStepLabel(state)).toBe(
        TRANSACTION_STEP_LABELS.REQUESTING_APPROVAL
      );
    });

    it("should return approval pending label when hash exists but not confirmed", () => {
      const state = {
        ...baseState,
        approveTxHash: "0x123" as `0x${string}`,
        isApproving: true,
      };
      expect(getCurrentStepLabel(state)).toBe(
        TRANSACTION_STEP_LABELS.APPROVAL_PENDING
      );
    });

    it("should return approval complete when confirmed but not depositing", () => {
      const state = { ...baseState, isApprovalConfirmed: true };
      expect(getCurrentStepLabel(state)).toBe(
        TRANSACTION_STEP_LABELS.APPROVAL_COMPLETE
      );
    });

    it("should return requesting deposit when depositing without hash", () => {
      const state = { ...baseState, isDepositing: true };
      expect(getCurrentStepLabel(state)).toBe(
        TRANSACTION_STEP_LABELS.REQUESTING_DEPOSIT
      );
    });

    it("should return deposit pending when deposit hash exists but not confirmed", () => {
      const state = {
        ...baseState,
        depositTxHash: "0x456" as `0x${string}`,
        isDepositing: true,
      };
      expect(getCurrentStepLabel(state)).toBe(
        TRANSACTION_STEP_LABELS.DEPOSIT_PENDING
      );
    });

    it("should return all complete when deposit is confirmed", () => {
      const state = { ...baseState, isDepositConfirmed: true };
      expect(getCurrentStepLabel(state)).toBe(
        TRANSACTION_STEP_LABELS.ALL_COMPLETE
      );
    });

    it("should return empty string for unknown state", () => {
      expect(getCurrentStepLabel(baseState)).toBe("");
    });
  });

  describe("getCurrentStepDescription", () => {
    it("should return requesting approval description when approving without hash", () => {
      const state = { ...baseState, isApproving: true };
      expect(getCurrentStepDescription(state)).toBe(
        TRANSACTION_STEP_DESCRIPTIONS.REQUESTING_APPROVAL
      );
    });

    it("should return approval pending description with chain name", () => {
      const state = {
        ...baseState,
        approveTxHash: "0x123" as `0x${string}`,
        isApproving: true,
      };
      expect(getCurrentStepDescription(state)).toBe(
        "⏳ Waiting for transaction confirmation on Ethereum Sepolia..."
      );
    });

    it("should return starting deposit description when approval confirmed", () => {
      const state = { ...baseState, isApprovalConfirmed: true };
      expect(getCurrentStepDescription(state)).toBe(
        TRANSACTION_STEP_DESCRIPTIONS.STARTING_DEPOSIT
      );
    });

    it("should return deposit success description with amount and chain", () => {
      const state = { ...baseState, isDepositConfirmed: true };
      expect(getCurrentStepDescription(state)).toBe(
        "Successfully deposited 100 USDC on Ethereum Sepolia"
      );
    });

    it("should return empty string for unknown state", () => {
      expect(getCurrentStepDescription(baseState)).toBe("");
    });
  });

  describe("Constants", () => {
    it("should have all required step labels", () => {
      expect(TRANSACTION_STEP_LABELS.REQUESTING_APPROVAL).toBe(
        "Step 1 of 2: Requesting Approval"
      );
      expect(TRANSACTION_STEP_LABELS.ALL_COMPLETE).toBe(
        "🎉 All Steps Complete!"
      );
    });

    it("should have callable description functions", () => {
      expect(
        TRANSACTION_STEP_DESCRIPTIONS.APPROVAL_PENDING("Ethereum Sepolia")
      ).toBe("⏳ Waiting for transaction confirmation on Ethereum Sepolia...");

      expect(
        TRANSACTION_STEP_DESCRIPTIONS.DEPOSIT_SUCCESS("100", "Ethereum Sepolia")
      ).toBe("Successfully deposited 100 USDC on Ethereum Sepolia");
    });
  });
});
