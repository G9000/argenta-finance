"use client";

import { formatBalance } from "@/lib/format";
import { usePortfolioTotals } from "@/hooks";

export function PortfolioSummary() {
  const portfolioTotals = usePortfolioTotals();

  return (
    <div className="grid gap-5 border border-white/10 p-5 bg-gray-900/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-white font-mono uppercase">
            Portfolio Summary
          </h3>
        </div>
        <div className="text-xs text-gray-400 uppercase tracking-wide">
          USDC
        </div>
      </div>

      <div className="flex items-center gap-10">
        <div className="grid gap-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Total in Vaults
          </div>
          <div className="font-mono text-xl text-white">
            {formatBalance(portfolioTotals.totalVault)}
          </div>
        </div>

        <div className="grid gap-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Total in Wallets
          </div>
          <div className="font-mono text-xl text-white">
            {formatBalance(portfolioTotals.totalWallet)}
          </div>
        </div>

        <div className="grid gap-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Total Portfolio
          </div>
          <div className="font-mono text-2xl text-teal-400">
            {formatBalance(portfolioTotals.totalPortfolio)}
          </div>
        </div>
      </div>
    </div>
  );
}
