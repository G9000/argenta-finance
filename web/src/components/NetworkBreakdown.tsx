"use client";

import { SupportedChainId, getChainName } from "@/constant/contracts";
import { NetworkBalanceCard } from "./NetworkBalanceCard";

export function NetworkBreakdown() {
  return (
    <div className="grid gap-4">
      <div className="text-lg font-semibold text-white mb-1 font-mono uppercase">
        Network Breakdown
      </div>
      <div className="text-gray-400 text-sm mb-2">
        Individual balances per network
      </div>

      <NetworkBalanceCard
        chainId={SupportedChainId.ETH_SEPOLIA}
        chainName={getChainName(SupportedChainId.ETH_SEPOLIA)}
      />
      <NetworkBalanceCard
        chainId={SupportedChainId.SEI_TESTNET}
        chainName={getChainName(SupportedChainId.SEI_TESTNET)}
      />
    </div>
  );
}
