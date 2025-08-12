"use client";

import { SupportedChainId, getChainName } from "@/constant/chains";
import { NetworkBalanceCard } from "./NetworkBalanceCard";

export function NetworkBreakdown() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
