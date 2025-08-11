"use client";

import { usePortfolioTotals } from "@/hooks";
import { getTokenLogo } from "@/lib/tokens";
import { BalanceAmount, BalanceItem, CardContainer } from "@/components/ui";

export function PortfolioSummary() {
  const portfolioTotals = usePortfolioTotals();
  const usdcLogo = getTokenLogo("USDC");

  return (
    <CardContainer>
      <div className="grid gap-4">
        {/* Header - similar to NetworkBalanceCard */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {usdcLogo && (
              <div className="flex-shrink-0">
                <img
                  src={usdcLogo}
                  alt="USDC"
                  width={24}
                  height={24}
                  className="object-contain"
                />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-white font-mono text-sm uppercase tracking-wide">
                Portfolio Summary
              </h3>
              <div className="text-xs text-gray-500 font-mono">
                All Networks Combined
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Total
            </div>
            <BalanceAmount
              balance={portfolioTotals.totalPortfolio}
              isLoading={false}
              error={null}
              token="USDC"
              size="lg"
              showIcon={true}
              className="justify-end text-teal-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-white/5">
          <div className="space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">
              Total in Vaults
            </div>
            <div className="flex items-baseline gap-1">
              <BalanceAmount
                balance={portfolioTotals.totalVault}
                isLoading={false}
                error={null}
                token="USDC"
                size="base"
                showIcon={false}
                className="text-white"
              />
              <span className="text-xs text-gray-400">USDC</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">
              Total in Wallets
            </div>
            <div className="flex items-baseline gap-1">
              <BalanceAmount
                balance={portfolioTotals.totalWallet}
                isLoading={false}
                error={null}
                token="USDC"
                size="base"
                showIcon={false}
                className="text-white"
              />
              <span className="text-xs text-gray-400">USDC</span>
            </div>
          </div>
        </div>
      </div>
    </CardContainer>
  );
}
