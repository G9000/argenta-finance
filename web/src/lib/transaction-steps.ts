import { getChainName, SupportedChainId } from "@/lib/contracts";

export interface TransactionStepState {
  isApproving: boolean;
  approveTxHash: string | undefined;
  isApprovalConfirmed: boolean;
  isDepositing: boolean;
  depositTxHash: string | undefined;
  isDepositConfirmed: boolean;
  selectedChainId: SupportedChainId;
  depositAmount: string;
}

export const TRANSACTION_STEP_LABELS = {
  REQUESTING_APPROVAL: "Step 1 of 2: Requesting Approval",
  APPROVAL_PENDING: "Step 1 of 2: Approval Pending",
  APPROVAL_COMPLETE: "✅ Step 1 Complete: USDC Approved",
  REQUESTING_DEPOSIT: "Step 2 of 2: Requesting Deposit",
  DEPOSIT_PENDING: "Step 2 of 2: Deposit Pending",
  ALL_COMPLETE: "🎉 All Steps Complete!",
} as const;

export const TRANSACTION_STEP_DESCRIPTIONS = {
  REQUESTING_APPROVAL:
    "⏳ Please confirm the approval transaction in your wallet...",
  APPROVAL_PENDING: (chainName: string) =>
    `⏳ Waiting for transaction confirmation on ${chainName}...`,
  STARTING_DEPOSIT: "Starting deposit transaction...",
  REQUESTING_DEPOSIT:
    "⏳ Please confirm the deposit transaction in your wallet...",
  DEPOSIT_PENDING: (chainName: string) =>
    `⏳ Waiting for transaction confirmation on ${chainName}...`,
  DEPOSIT_SUCCESS: (amount: string, chainName: string) =>
    `Successfully deposited ${amount} USDC on ${chainName}`,
} as const;

export function getCurrentStepLabel(state: TransactionStepState): string {
  const {
    isApproving,
    approveTxHash,
    isApprovalConfirmed,
    isDepositing,
    depositTxHash,
    isDepositConfirmed,
  } = state;

  if (isApproving && !approveTxHash) {
    return TRANSACTION_STEP_LABELS.REQUESTING_APPROVAL;
  }

  if (approveTxHash && !isApprovalConfirmed) {
    return TRANSACTION_STEP_LABELS.APPROVAL_PENDING;
  }

  if (isApprovalConfirmed && !isDepositing && !depositTxHash) {
    return TRANSACTION_STEP_LABELS.APPROVAL_COMPLETE;
  }

  if (isDepositing && !depositTxHash) {
    return TRANSACTION_STEP_LABELS.REQUESTING_DEPOSIT;
  }

  if (depositTxHash && !isDepositConfirmed) {
    return TRANSACTION_STEP_LABELS.DEPOSIT_PENDING;
  }

  if (isDepositConfirmed) {
    return TRANSACTION_STEP_LABELS.ALL_COMPLETE;
  }

  return "";
}

export function getCurrentStepDescription(state: TransactionStepState): string {
  const {
    isApproving,
    approveTxHash,
    isApprovalConfirmed,
    isDepositing,
    depositTxHash,
    isDepositConfirmed,
    selectedChainId,
    depositAmount,
  } = state;

  const chainName = getChainName(selectedChainId);

  if (isApproving && !approveTxHash) {
    return TRANSACTION_STEP_DESCRIPTIONS.REQUESTING_APPROVAL;
  }

  if (approveTxHash && !isApprovalConfirmed) {
    return TRANSACTION_STEP_DESCRIPTIONS.APPROVAL_PENDING(chainName);
  }

  if (isApprovalConfirmed && !isDepositing && !depositTxHash) {
    return TRANSACTION_STEP_DESCRIPTIONS.STARTING_DEPOSIT;
  }

  if (isDepositing && !depositTxHash) {
    return TRANSACTION_STEP_DESCRIPTIONS.REQUESTING_DEPOSIT;
  }

  if (depositTxHash && !isDepositConfirmed) {
    return TRANSACTION_STEP_DESCRIPTIONS.DEPOSIT_PENDING(chainName);
  }

  if (isDepositConfirmed) {
    return TRANSACTION_STEP_DESCRIPTIONS.DEPOSIT_SUCCESS(
      depositAmount,
      chainName
    );
  }

  return "";
}
