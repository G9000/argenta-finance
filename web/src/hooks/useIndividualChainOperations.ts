import { useState, useCallback } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { erc20Abi } from "viem";
import type { Hash } from "viem";

import { SupportedChainId } from "@/constant/chains";
import { simpleVaultAbi } from "@/generated/wagmi";
import { wagmiConfig } from "@/wagmi";
import {
  parseAmountToBigInt,
  validateChainOperation,
  isUserRejection,
} from "@/lib/vault-operations";

type OperationType = "approval" | "deposit" | "confirming";

interface ChainTransactions {
  approvalTxHash?: Hash;
  depositTxHash?: Hash;
}

interface OperationState {
  isOperating: boolean;
  operatingChain: SupportedChainId | null;
  operationType: OperationType | null;
  txHash: Hash | null;
  error: string | null;
  chainTransactions: Record<SupportedChainId, ChainTransactions>;
}

export interface UseIndividualChainOperationsReturn {
  approveChain: (chainId: SupportedChainId, amount: string) => Promise<Hash>;
  depositChain: (chainId: SupportedChainId, amount: string) => Promise<Hash>;
  isOperating: boolean;
  operatingChain: SupportedChainId | null;
  operationType: OperationType | null;
  txHash: Hash | null;
  error: string | null;
  chainTransactions: Record<SupportedChainId, ChainTransactions>;
  clearError: () => void;
  getChainTransactions: (chainId: SupportedChainId) => ChainTransactions;
}

export function useIndividualChainOperations(): UseIndividualChainOperationsReturn {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const [state, setState] = useState<OperationState>({
    isOperating: false,
    operatingChain: null,
    operationType: null,
    txHash: null,
    error: null,
    chainTransactions: {} as Record<SupportedChainId, ChainTransactions>,
  });

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const resetState = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOperating: false,
      operatingChain: null,
      operationType: null,
      txHash: null,
      error: null,
    }));
  }, []);

  const setOperationState = useCallback(
    (
      chainId: SupportedChainId,
      type: OperationType,
      txHash: Hash | null = null
    ) => {
      setState((prev) => ({
        ...prev,
        isOperating: true,
        operatingChain: chainId,
        operationType: type,
        txHash,
        error: null,
      }));
    },
    []
  );

  const setError = useCallback((error: string) => {
    setState((prev) => ({
      ...prev,
      isOperating: false,
      error,
    }));
  }, []);

  const storeTransactionHash = useCallback(
    (chainId: SupportedChainId, type: OperationType, txHash: Hash) => {
      setState((prev) => ({
        ...prev,
        chainTransactions: {
          ...prev.chainTransactions,
          [chainId]: {
            ...prev.chainTransactions[chainId],
            [type === "approval" ? "approvalTxHash" : "depositTxHash"]: txHash,
          },
        },
      }));
    },
    []
  );

  const getChainTransactions = useCallback(
    (chainId: SupportedChainId): ChainTransactions => {
      return state.chainTransactions[chainId] || {};
    },
    [state.chainTransactions]
  );

  const ensureChainSwitch = useCallback(
    async (targetChainId: SupportedChainId) => {
      if (currentChainId !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId });
        // Small delay to ensure chain switch is complete
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    },
    [currentChainId, switchChainAsync]
  );

  const approveChain = useCallback(
    async (chainId: SupportedChainId, amount: string): Promise<Hash> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      try {
        setOperationState(chainId, "approval");

        // Validate and get addresses
        const { usdcAddress, vaultAddress } = validateChainOperation(chainId);
        const amountWei = parseAmountToBigInt(amount, chainId);

        // Switch to target chain
        await ensureChainSwitch(chainId);

        // Execute approval
        const hash = await writeContract(wagmiConfig, {
          address: usdcAddress,
          abi: erc20Abi,
          functionName: "approve",
          args: [vaultAddress, amountWei],
          chainId,
        });

        setState((prev) => ({ ...prev, txHash: hash }));

        // Store the transaction hash
        storeTransactionHash(chainId, "approval", hash);

        // Update to confirming state
        setState((prev) => ({
          ...prev,
          operationType: "confirming",
        }));

        // Wait for confirmation
        await waitForTransactionReceipt(wagmiConfig, {
          hash,
          chainId,
        });

        resetState();
        return hash;
      } catch (error) {
        const errorMessage = isUserRejection(error)
          ? "Transaction cancelled by user"
          : error instanceof Error
          ? error.message
          : "Approval failed";

        setError(errorMessage);
        throw error;
      }
    },
    [address, ensureChainSwitch, setOperationState, setError, resetState]
  );

  const depositChain = useCallback(
    async (chainId: SupportedChainId, amount: string): Promise<Hash> => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      try {
        setOperationState(chainId, "deposit");

        // Validate and get addresses
        const { usdcAddress, vaultAddress } = validateChainOperation(chainId);
        const amountWei = parseAmountToBigInt(amount, chainId);

        // Switch to target chain
        await ensureChainSwitch(chainId);

        // Execute deposit
        const hash = await writeContract(wagmiConfig, {
          address: vaultAddress,
          abi: simpleVaultAbi,
          functionName: "deposit",
          args: [usdcAddress, amountWei],
          chainId,
        });

        setState((prev) => ({ ...prev, txHash: hash }));

        // Store the transaction hash
        storeTransactionHash(chainId, "deposit", hash);

        // Update to confirming state
        setState((prev) => ({
          ...prev,
          operationType: "confirming",
        }));

        // Wait for confirmation
        await waitForTransactionReceipt(wagmiConfig, {
          hash,
          chainId,
        });

        resetState();
        return hash;
      } catch (error) {
        const errorMessage = isUserRejection(error)
          ? "Transaction cancelled by user"
          : error instanceof Error
          ? error.message
          : "Deposit failed";

        setError(errorMessage);
        throw error;
      }
    },
    [address, ensureChainSwitch, setOperationState, setError, resetState]
  );

  return {
    approveChain,
    depositChain,
    isOperating: state.isOperating,
    operatingChain: state.operatingChain,
    operationType: state.operationType,
    txHash: state.txHash,
    error: state.error,
    chainTransactions: state.chainTransactions,
    clearError,
    getChainTransactions,
  };
}
