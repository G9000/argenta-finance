"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  getChainName,
  isSupportedChainId,
  SupportedChainId,
  SUPPORTED_CHAINS,
  USDC_DECIMALS,
  getUsdcAddress,
  getVaultAddress,
} from "@/lib/contracts";
import { formatBalance } from "@/lib/format";
import {
  useChainBalances,
  useOperationValidation,
  useVaultDeposit,
} from "@/hooks";
import { cn } from "@/lib/utils";
import { BalanceDisplay } from "./BalanceDisplay";
import { OperationInput } from "./OperationInput";
import { OperationTabs } from "./OperationTabs";
import { getTokenLogo, getChainLogo } from "@/lib/tokens";
import { OPERATION_TYPES, OperationType } from "@/types/operations";
import Image from "next/image";
import { createComponentLogger } from "@/lib/logger";

const logger = createComponentLogger("BatchDeposit");

export function BatchDeposit() {
  const { address } = useAccount();
  const chainId = useChainId();

  const [activeTab, setActiveTab] = useState<OperationType>(
    OPERATION_TYPES.DEPOSIT
  );
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const [selectedChainId, setSelectedChainId] = useState<SupportedChainId>(
    isSupportedChainId(chainId) ? chainId : SupportedChainId.ETH_SEPOLIA
  );

  const [chainLogoError, setChainLogoError] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const {
    isOperationActive,
    operationError: depositOperationError,
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
    resetDeposit: resetDepositOperation,
    clearError: clearDepositError,
  } = useVaultDeposit({
    chainId: selectedChainId,
    onDepositComplete: (amount) => {
      logger.debug(`Deposit of ${amount} USDC completed successfully`);
      setDepositAmount("");
    },
    onError: (error) => {
      logger.error("Deposit operation failed:", error);
    },
  });

  // Keep selectedChainId in sync especially when switching from the nav
  useEffect(() => {
    if (isSupportedChainId(chainId)) {
      setSelectedChainId(chainId);
    }
  }, [chainId]);

  useEffect(() => {
    setChainLogoError(false);
  }, [selectedChainId]);

  // Track client-side mounting to prevent hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    walletBalance: {
      data: usdcBalance,
      isLoading: walletLoading,
      error: walletError,
    },
    vaultBalance: {
      data: vaultBalance,
      isLoading: vaultLoading,
      error: vaultError,
    },
  } = useChainBalances({ chainId: selectedChainId });

  const { depositValidation, withdrawValidation } = useOperationValidation({
    depositAmount,
    withdrawAmount,
    walletBalance: walletError ? undefined : usdcBalance,
    vaultBalance: vaultError ? undefined : vaultBalance,
    chainId: selectedChainId,
    token: "USDC",
  });

  const handleChainSwitch = (newChainId: SupportedChainId) => {
    if (isSwitching) return;

    setSelectedChainId(newChainId);
    switchChain(
      { chainId: newChainId },
      {
        onError: (error) => {
          logger.error("Failed to switch chain:", error);
          setSelectedChainId(
            isSupportedChainId(chainId) ? chainId : SupportedChainId.ETH_SEPOLIA
          );
        },
      }
    );
  };

  const handleMaxDeposit = () => {
    if (usdcBalance) {
      setDepositAmount(formatBalance(usdcBalance));
      resetDepositOperation();
    }
  };

  const handleDepositAmountChange = (amount: string) => {
    setDepositAmount(amount);
    clearDepositError();
  };

  const handleMaxWithdraw = () => {
    if (vaultBalance) {
      setWithdrawAmount(formatBalance(vaultBalance));
    }
  };

  const handleDeposit = () => {
    executeDeposit(depositAmount);
  };

  const handleWithdraw = () => {
    logger.debug(
      "Withdraw:",
      withdrawAmount,
      "USDC from",
      getChainName(selectedChainId)
    );
    // TODO: Implement withdraw logic
  };

  if (!address) {
    return (
      <div className="text-center text-gray-400 text-sm">
        Connect your wallet to view balances
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <div className="border border-teal-100/10 grid">
        <div
          className="grid grid-cols-2"
          role="group"
          aria-labelledby="chain-selector-label"
        >
          {SUPPORTED_CHAINS.map((chainId) => (
            <button
              key={chainId}
              onClick={() => handleChainSwitch(chainId)}
              disabled={isSwitching}
              className={cn(
                "p-2 text-sm font-mono uppercase",
                selectedChainId === chainId
                  ? "border-teal-500 bg-teal-500/40 text-teal-400"
                  : "border-white/10 text-gray-400 hover:border-white/20",
                isSwitching && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSwitching && selectedChainId === chainId ? (
                <div className="flex items-center gap-2">
                  <div className="size-3 border border-current border-t-transparent rounded-full animate-spin" />
                  Switching...
                </div>
              ) : (
                getChainName(chainId)
              )}
            </button>
          ))}
        </div>

        <div className="grid gap-10 bg-teal-500/20 px-4 py-10">
          <div className="relative my-10 font-mono">
            <span className="text-[10px] text-teal-100/40">
              WELCOME {address?.slice(0, 6)}...{address?.slice(-4)} YOU ARE
              CURRENTLY ON {getChainName(selectedChainId).toUpperCase()}
            </span>
            <div className="text-4xl w-10/12 font-mono uppercase">
              Manage your funds
            </div>

            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-70">
              <div className="relative p-4 border border-teal-100/10 rounded-full">
                {!chainLogoError ? (
                  <Image
                    src={getChainLogo(selectedChainId)}
                    alt=""
                    width={100}
                    height={100}
                    className="grayscale"
                    onError={() => setChainLogoError(true)}
                    onLoad={() => setChainLogoError(false)}
                  />
                ) : (
                  <div className="w-[100px] h-[100px] flex items-center justify-center text-gray-400 text-xs font-mono">
                    <div className="text-center">
                      <div>{getChainName(selectedChainId)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {address && (
            <BalanceDisplay
              balances={[
                {
                  label: "Available USDC Balance",
                  value: usdcBalance,
                  logo: getTokenLogo("USDC"),
                  error: walletError?.message,
                  decimals: USDC_DECIMALS,
                },
                {
                  label: "USDC in Vault",
                  value: vaultBalance,
                  logo: getTokenLogo("USDC"),
                  error: vaultError?.message,
                  decimals: USDC_DECIMALS,
                },
              ]}
              isLoading={isSwitching || walletLoading || vaultLoading}
            />
          )}

          <OperationTabs activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === OPERATION_TYPES.DEPOSIT ? (
              <div className="space-y-4">
                <OperationInput
                  type={OPERATION_TYPES.DEPOSIT}
                  amount={depositAmount}
                  onAmountChange={handleDepositAmountChange}
                  onMaxClick={handleMaxDeposit}
                  onSubmit={handleDeposit}
                  disabled={isSwitching || isOperationActive}
                  token="USDC"
                  decimals={USDC_DECIMALS}
                  validation={depositValidation}
                />

                {(isOperationActive ||
                  isApproving ||
                  isDepositing ||
                  isApprovalConfirmed ||
                  isDepositConfirmed ||
                  approveError ||
                  depositError ||
                  depositOperationError) && (
                  <div
                    className={cn(
                      "p-3 border rounded font-mono text-sm",

                      depositOperationError
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : approveError &&
                          (approveError.message?.includes("rejected") ||
                            approveError.message?.includes("User denied"))
                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600"
                        : depositError &&
                          (depositError.message?.includes("rejected") ||
                            depositError.message?.includes("User denied"))
                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600"
                        : approveError || depositError
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-teal-500/10 border-teal-500/20"
                    )}
                  >
                    {depositOperationError ? (
                      <div className="text-red-400">
                        <strong>Error:</strong> {depositOperationError}
                      </div>
                    ) : (
                      <>
                        {isOperationActive &&
                          !approveError &&
                          !depositError && (
                            <div className="mb-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Progress</span>
                                <span>
                                  {progress.stepNumber}/{progress.totalSteps}
                                </span>
                              </div>
                              <div className="w-full bg-gray-600 rounded-full h-1.5">
                                <div
                                  className="bg-teal-400 h-1.5 rounded-full transition-all duration-500"
                                  style={{
                                    width: progress.percentage,
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}

                        {isApproving && !approveTxHash && (
                          <div>
                            <div className="font-semibold">
                              Step 1 of 2: Requesting Approval
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              ⏳ Please confirm the approval transaction in your
                              wallet...
                            </div>
                          </div>
                        )}
                        {approveTxHash && !isApprovalConfirmed && (
                          <div>
                            <div className="font-semibold">
                              Step 1 of 2: Approval Pending
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              ⏳ Waiting for transaction confirmation on{" "}
                              {getChainName(selectedChainId)}...
                            </div>
                          </div>
                        )}
                        {isApprovalConfirmed &&
                          !isDepositing &&
                          !depositTxHash && (
                            <div>
                              <div className="font-semibold">
                                ✅ Step 1 Complete: USDC Approved
                              </div>
                              <div className="text-xs opacity-75 mt-1">
                                Starting deposit transaction...
                              </div>
                            </div>
                          )}
                        {isDepositing && !depositTxHash && (
                          <div>
                            <div className="font-semibold">
                              Step 2 of 2: Requesting Deposit
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              ⏳ Please confirm the deposit transaction in your
                              wallet...
                            </div>
                          </div>
                        )}
                        {depositTxHash && !isDepositConfirmed && (
                          <div>
                            <div className="font-semibold">
                              Step 2 of 2: Deposit Pending
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              ⏳ Waiting for transaction confirmation on{" "}
                              {getChainName(selectedChainId)}...
                            </div>
                          </div>
                        )}
                        {isDepositConfirmed && (
                          <div>
                            <div className="font-semibold">
                              🎉 All Steps Complete!
                            </div>
                            <div className="text-xs opacity-75 mt-1">
                              Successfully deposited {depositAmount} USDC on{" "}
                              {getChainName(selectedChainId)}
                            </div>
                          </div>
                        )}
                        {approveError && (
                          <div>
                            {approveError.message?.includes("rejected") ||
                            approveError.message?.includes("User denied") ? (
                              <>⚠️ Approval cancelled by user</>
                            ) : (
                              <>❌ Approval failed: Transaction failed</>
                            )}
                          </div>
                        )}
                        {depositError && (
                          <div>
                            {depositError.message?.includes("rejected") ||
                            depositError.message?.includes("User denied") ? (
                              <>⚠️ Deposit cancelled by user</>
                            ) : (
                              <>❌ Deposit failed: Transaction failed</>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {isClient &&
                  process.env.NODE_ENV === "development" &&
                  address && (
                    <div className="text-xs text-gray-400 font-mono space-y-1">
                      <div>DEV Debug Info:</div>
                      <div>Your wallet: {address}</div>
                      <div>
                        USDC contract: {getUsdcAddress(selectedChainId)}
                      </div>
                      <div>
                        Vault contract: {getVaultAddress(selectedChainId)}
                      </div>
                      <div>
                        Current allowance:{" "}
                        {currentAllowance?.toString() || "Loading..."}
                      </div>
                      <div>Chain: {getChainName(selectedChainId)}</div>
                    </div>
                  )}
              </div>
            ) : (
              <OperationInput
                type={OPERATION_TYPES.WITHDRAW}
                amount={withdrawAmount}
                onAmountChange={setWithdrawAmount}
                onMaxClick={handleMaxWithdraw}
                onSubmit={handleWithdraw}
                disabled={isSwitching}
                token="USDC"
                decimals={USDC_DECIMALS}
                validation={withdrawValidation}
              />
            )}
          </OperationTabs>
        </div>
      </div>
    </div>
  );
}
