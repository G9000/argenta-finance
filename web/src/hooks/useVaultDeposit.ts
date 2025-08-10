import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  parseUnits,
  UserRejectedRequestError,
  TransactionRejectedRpcError,
} from "viem";
import {
  SupportedChainId,
  USDC_DECIMALS,
  getUsdcAddress,
  getVaultAddress,
  getChainName,
} from "@/lib/contracts";
import { createComponentLogger } from "@/lib/logger";
import { useTokenApproval } from "./useTokenApproval";
import { useVaultDepositTransaction } from "./useVaultDepositTransaction";
import { useDepositProgress, type DepositProgress } from "./useDepositProgress";
import { CommonValidations } from "@/lib/validators";

const logger = createComponentLogger("useVaultDeposit");

export interface VaultDepositState {
  isOperationActive: boolean;
  operationError: string | null;
  isApproving: boolean;
  approveTxHash: string | undefined;
  isApprovalConfirmed: boolean;
  approveError: any;
  isDepositing: boolean;
  depositTxHash: string | undefined;
  isDepositConfirmed: boolean;
  depositError: any;
  currentAllowance: bigint | undefined;
  progress: DepositProgress;
}

export interface VaultDepositActions {
  executeDeposit: (amount: string) => void;
  resetDeposit: () => void;
  clearError: () => void;
}

export interface UseVaultDepositParams {
  chainId: SupportedChainId;
  onDepositComplete?: (amount: string) => void;
  onError?: (error: string) => void;
}

export interface UseVaultDepositReturn
  extends VaultDepositState,
    VaultDepositActions {}

export function useVaultDeposit({
  chainId,
  onDepositComplete,
  onError,
}: UseVaultDepositParams): UseVaultDepositReturn {
  const { address } = useAccount();

  const [isOperationActive, setIsOperationActive] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [currentDepositAmount, setCurrentDepositAmount] = useState<string>("");

  const usdcAddress = getUsdcAddress(chainId);
  const vaultAddress = getVaultAddress(chainId);

  const {
    currentAllowance,
    isApproving,
    approveTxHash,
    isApprovalConfirmed,
    approveError,
    approveToken,
    refetchAllowance,
    resetApproval,
    needsApproval,
  } = useTokenApproval({
    chainId,
    tokenAddress: usdcAddress,
    spenderAddress: vaultAddress,
  });

  const {
    isDepositing,
    depositTxHash,
    isDepositConfirmed,
    depositError,
    executeDepositTransaction,
    resetDepositTransaction,
  } = useVaultDepositTransaction({
    chainId,
    vaultAddress,
  });

  const progress = useDepositProgress({
    isApproving,
    approveTxHash,
    isApprovalConfirmed,
    isDepositing,
    depositTxHash,
    isDepositConfirmed,
  });

  // Handle successful approval -> auto-proceed to deposit
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (isApprovalConfirmed && currentDepositAmount) {
      logger.debug("Approval confirmed! Auto-proceeding with deposit...");

      const amountInWei = parseUnits(currentDepositAmount, USDC_DECIMALS);

      const proceedWithDeposit = async () => {
        try {
          await refetchAllowance();
          executeDepositTransaction(usdcAddress, amountInWei);
        } catch (error) {
          timeoutId = setTimeout(() => {
            executeDepositTransaction(usdcAddress, amountInWei);
          }, 1000);
        }
      };

      proceedWithDeposit();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    isApprovalConfirmed,
    currentDepositAmount,
    refetchAllowance,
    executeDepositTransaction,
    usdcAddress,
  ]);

  // Handle successful deposit completion
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (isDepositConfirmed) {
      logger.debug("Deposit confirmed! Operation complete.");

      // Call completion callback
      if (onDepositComplete && currentDepositAmount) {
        onDepositComplete(currentDepositAmount);
      }

      timeoutId = setTimeout(() => {
        setIsOperationActive(false);
        setCurrentDepositAmount("");
        setOperationError(null);
        resetApproval();
        resetDepositTransaction();
      }, 3000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    isDepositConfirmed,
    currentDepositAmount,
    onDepositComplete,
    resetApproval,
    resetDepositTransaction,
  ]);

  const isUserRejection = useCallback((error: any): boolean => {
    return (
      error instanceof UserRejectedRequestError ||
      error instanceof TransactionRejectedRpcError
    );
  }, []);

  const getUserFriendlyErrorMessage = useCallback(
    (approveError: any, depositError: any): string => {
      if (approveError) {
        if (isUserRejection(approveError)) {
          return "Approval cancelled by user";
        }
        return (
          approveError?.shortMessage ||
          approveError?.message ||
          "Approval transaction failed"
        );
      }

      if (depositError) {
        if (isUserRejection(depositError)) {
          return "Deposit cancelled by user";
        }
        return (
          depositError?.shortMessage ||
          depositError?.message ||
          "Deposit transaction failed"
        );
      }

      return "Transaction failed";
    },
    [isUserRejection]
  );

  useEffect(() => {
    if (approveError || depositError) {
      logger.debug("Error detected, resetting operation state");
      setIsOperationActive(false);

      const errorMessage = getUserFriendlyErrorMessage(
        approveError,
        depositError
      );

      setOperationError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }
    }
  }, [approveError, depositError, onError, getUserFriendlyErrorMessage]);

  const executeDeposit = useCallback(
    (amount: string) => {
      logger.debug(
        "Executing deposit:",
        amount,
        "USDC on",
        getChainName(chainId)
      );

      if (!address) {
        setOperationError("Wallet not connected");
        return;
      }

      if (isApproving || isDepositing) {
        logger.debug("Operation already in progress");
        return;
      }

      const validationResult = CommonValidations.amount(amount);
      if (!validationResult.isValid) {
        setOperationError(validationResult.error!);
        return;
      }

      setOperationError(null);
      setIsOperationActive(true);
      setCurrentDepositAmount(amount);

      let amountInWei: bigint;
      try {
        amountInWei = parseUnits(amount, USDC_DECIMALS);
      } catch (error) {
        logger.error("Failed to parse deposit amount", error);
        setOperationError("Invalid amount format. Please check your input.");
        setIsOperationActive(false);
        return;
      }

      logger.debug("amountInWei", amountInWei);
      logger.debug("usdcAddress", usdcAddress);
      logger.debug("vaultAddress", vaultAddress);
      logger.debug("currentAllowance", currentAllowance);

      try {
        if (needsApproval(amountInWei)) {
          logger.debug("🔐 Requesting USDC approval for", amount, "USDC");
          approveToken(amountInWei);
          return;
        }

        logger.debug("💰 Executing deposit for", amount, "USDC");
        executeDepositTransaction(usdcAddress, amountInWei);
      } catch (error) {
        logger.error("Unexpected error during deposit", error);
        setOperationError("An unexpected error occurred. Please try again.");
        setIsOperationActive(false);
      }
    },
    [
      address,
      chainId,
      isApproving,
      isDepositing,
      currentAllowance,
      usdcAddress,
      vaultAddress,
      needsApproval,
      approveToken,
      executeDepositTransaction,
    ]
  );

  const resetDeposit = useCallback(() => {
    setIsOperationActive(false);
    setOperationError(null);
    setCurrentDepositAmount("");
    resetApproval();
    resetDepositTransaction();
  }, [resetApproval, resetDepositTransaction]);

  const clearError = useCallback(() => {
    setOperationError(null);
    resetApproval();
    resetDepositTransaction();
  }, [resetApproval, resetDepositTransaction]);

  return {
    isOperationActive,
    operationError,
    isApproving,
    approveTxHash,
    isApprovalConfirmed,
    approveError,
    isDepositing,
    depositTxHash,
    isDepositConfirmed,
    depositError,
    currentAllowance,
    progress,
    executeDeposit,
    resetDeposit,
    clearError,
  };
}
