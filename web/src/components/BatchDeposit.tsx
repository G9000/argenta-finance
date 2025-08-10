"use client";

import { useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  getChainName,
  isSupportedChainId,
  SupportedChainId,
} from "@/lib/contracts";
import { formatBalance } from "@/lib/format";
import { useChainBalances } from "@/hooks";

export function BatchDeposit() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [selectedChainId, setSelectedChainId] = useState<SupportedChainId>(
    isSupportedChainId(chainId) ? chainId : SupportedChainId.ETH_SEPOLIA
  );

  const {
    walletBalance: { data: usdcBalance },
    vaultBalance: { data: vaultBalance },
  } = useChainBalances({ chainId: selectedChainId });

  const handleChainSwitch = (newChainId: SupportedChainId) => {
    if (isSwitching) return;

    setSelectedChainId(newChainId);
    switchChain(
      { chainId: newChainId },
      {
        onError: (error) => {
          console.error("Failed to switch chain:", error);
          setSelectedChainId(
            isSupportedChainId(chainId) ? chainId : SupportedChainId.ETH_SEPOLIA
          );
        },
      }
    );
  };

  if (!address) {
    return (
      <div className="text-center text-gray-400 text-sm">
        Connect your wallet to view balances
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="space-y-4 border border-white/10 p-4 rounded-lg">
        <div className="mb-3">
          <label
            id="chain-selector-label"
            className="text-xs text-gray-400 uppercase tracking-wide"
          >
            Select Chain
          </label>
        </div>

        <div
          className="grid grid-cols-2 gap-2"
          role="group"
          aria-labelledby="chain-selector-label"
        >
          <button
            onClick={() => handleChainSwitch(SupportedChainId.ETH_SEPOLIA)}
            disabled={isSwitching}
            className={`p-2 rounded border text-sm font-mono ${
              selectedChainId === SupportedChainId.ETH_SEPOLIA
                ? "border-blue-500 bg-blue-500/10 text-blue-400"
                : "border-white/10 text-gray-400 hover:border-white/20"
            } ${isSwitching ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSwitching && selectedChainId === SupportedChainId.ETH_SEPOLIA ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                Switching...
              </div>
            ) : (
              getChainName(SupportedChainId.ETH_SEPOLIA)
            )}
          </button>
          <button
            onClick={() => handleChainSwitch(SupportedChainId.SEI_TESTNET)}
            disabled={isSwitching}
            className={`p-2 rounded border text-sm font-mono ${
              selectedChainId === SupportedChainId.SEI_TESTNET
                ? "border-blue-500 bg-blue-500/10 text-blue-400"
                : "border-white/10 text-gray-400 hover:border-white/20"
            } ${isSwitching ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSwitching && selectedChainId === SupportedChainId.SEI_TESTNET ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                Switching...
              </div>
            ) : (
              getChainName(SupportedChainId.SEI_TESTNET)
            )}
          </button>
        </div>

        {address && (
          <div className="space-y-3">
            <div className="border border-white/10 p-4 rounded-lg">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                Available USDC Balance
              </div>
              <div className="font-mono text-lg text-white">
                {usdcBalance ? formatBalance(usdcBalance) : "0.00"} USDC
              </div>
            </div>

            <div className="border border-white/10 p-4 rounded-lg">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                USDC in Vault
              </div>
              <div className="font-mono text-lg text-white">
                {vaultBalance ? formatBalance(vaultBalance) : "0.00"} USDC
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
