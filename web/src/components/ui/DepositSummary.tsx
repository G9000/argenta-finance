"use client";

import Image from "next/image";
import { getTokenLogo } from "@/lib/tokens";

interface DepositSummaryProps {
  activeChainCount: number;
  totalAmount: string;
}

export function DepositSummary({
  activeChainCount,
  totalAmount,
}: DepositSummaryProps) {
  return (
    <div className="border border-teal-500/30 rounded-lg p-4 bg-teal-500/5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Active Chains</span>
          <span className="text-white font-mono">{activeChainCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Amount</span>
          <div className="flex items-center gap-1">
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
          <span className="text-gray-500">Estimated Transactions</span>
          <span className="text-gray-400 font-mono">
            {activeChainCount * 2} (Approval + Deposit per chain)
          </span>
        </div>
      </div>
    </div>
  );
}
