"use client";

import Image from "next/image";
import { getTokenLogo, getChainLogo } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import type { SupportedChainId } from "@/constant/contracts";

interface DepositSummaryProps {
  activeChainIds: SupportedChainId[];
  totalAmount: string;
}

export function DepositSummary({
  activeChainIds,
  totalAmount,
}: DepositSummaryProps) {
  const activeChainCount = activeChainIds.length;

  return (
    <div className="border border-teal-500/30 bg-teal-500/5 p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400 uppercase tracking-wide">
            Active Chains
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center -space-x-1">
              {activeChainIds.map((chainId, index) => {
                const logo = getChainLogo(chainId);
                return (
                  <div
                    key={chainId}
                    className={cn(
                      "relative rounded-full border-2 border-gray-800 bg-gray-800",
                      index > 0 && "z-10"
                    )}
                    style={{ zIndex: activeChainIds.length - index }}
                  >
                    {logo && (
                      <Image
                        src={logo}
                        alt={`Chain ${chainId}`}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <span className="text-white font-mono text-xs uppercase">
              {activeChainCount} CHAIN{activeChainCount !== 1 ? "S" : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400 uppercase tracking-wide">
            Total Amount
          </span>
          <div className="flex items-center gap-1.5">
            <Image
              src={getTokenLogo("USDC")}
              alt="USDC"
              width={16}
              height={16}
              className="rounded-full"
            />
            <span className="text-white font-mono font-semibold">
              {totalAmount} USDC
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 uppercase tracking-wide">
            Estimated Transactions
          </span>
          <span className="text-gray-400 font-mono uppercase">
            {activeChainCount * 2} (APPROVAL + DEPOSIT PER CHAIN)
          </span>
        </div>
      </div>
    </div>
  );
}
