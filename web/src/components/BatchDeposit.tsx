"use client";

import { useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  getChainName,
  isSupportedChainId,
  SupportedChainId,
  SUPPORTED_CHAINS,
} from "@/lib/contracts";
import { formatBalance } from "@/lib/format";
import { useChainBalances } from "@/hooks";
import { cn } from "@/lib/utils";

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

        <div className="border border-rose-100/10 grid">
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
                    ? "border-rose-500 bg-rose-500/40 text-rose-400"
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

          {address && (
            <div
              className={cn(
                "space-y-3 p-4 grid gap-5 bg-rose-500/20",
                isSwitching && "opacity-50"
              )}
            >
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                  Available USDC Balance
                </div>
                <div className="font-mono text-lg text-white font-semibol">
                  {usdcBalance ? formatBalance(usdcBalance) : "0.00"} USDC
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                  USDC in Vault
                </div>
                <div className="font-mono text-lg text-white font-semibold">
                  {vaultBalance ? formatBalance(vaultBalance) : "0.00"} USDC
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
