import { useMemo } from "react";

export type DepositStep =
  | "idle"
  | "approval-requested"
  | "approval-pending"
  | "approval-confirmed"
  | "deposit-requested"
  | "deposit-pending"
  | "deposit-confirmed";

export interface DepositProgress {
  step: DepositStep;
  percentage: string;
  stepNumber: number;
  totalSteps: number;
}

export interface UseDepositProgressParams {
  isApproving: boolean;
  approveTxHash: string | undefined;
  isApprovalConfirmed: boolean;
  isDepositing: boolean;
  depositTxHash: string | undefined;
  isDepositConfirmed: boolean;
}

const PROGRESS_PERCENTAGES = {
  APPROVAL_REQUESTED: "25%",
  APPROVAL_PENDING: "40%",
  APPROVAL_CONFIRMED: "60%",
  DEPOSIT_REQUESTED: "75%",
  DEPOSIT_PENDING: "85%",
  DEPOSIT_CONFIRMED: "100%",
} as const;

export function useDepositProgress({
  isApproving,
  approveTxHash,
  isApprovalConfirmed,
  isDepositing,
  depositTxHash,
  isDepositConfirmed,
}: UseDepositProgressParams): DepositProgress {
  return useMemo(() => {
    const step: DepositStep = isDepositConfirmed
      ? "deposit-confirmed"
      : depositTxHash
      ? "deposit-pending"
      : isDepositing
      ? "deposit-requested"
      : isApprovalConfirmed
      ? "approval-confirmed"
      : approveTxHash
      ? "approval-pending"
      : isApproving
      ? "approval-requested"
      : "idle";

    const percentage = isDepositConfirmed
      ? PROGRESS_PERCENTAGES.DEPOSIT_CONFIRMED
      : depositTxHash
      ? PROGRESS_PERCENTAGES.DEPOSIT_PENDING
      : isDepositing
      ? PROGRESS_PERCENTAGES.DEPOSIT_REQUESTED
      : isApprovalConfirmed
      ? PROGRESS_PERCENTAGES.APPROVAL_CONFIRMED
      : approveTxHash
      ? PROGRESS_PERCENTAGES.APPROVAL_PENDING
      : isApproving
      ? PROGRESS_PERCENTAGES.APPROVAL_REQUESTED
      : "0%";

    const getStepNumber = (currentStep: DepositStep): number => {
      switch (currentStep) {
        case "idle":
          return 0;
        case "approval-requested":
        case "approval-pending":
          return 1;
        case "approval-confirmed":
        case "deposit-requested":
        case "deposit-pending":
          return 2;
        case "deposit-confirmed":
          return 2;
        default:
          return 0;
      }
    };

    return {
      step,
      percentage,
      stepNumber: getStepNumber(step),
      totalSteps: 2,
    };
  }, [
    isApproving,
    approveTxHash,
    isApprovalConfirmed,
    isDepositing,
    depositTxHash,
    isDepositConfirmed,
  ]);
}
