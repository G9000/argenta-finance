"use client";

import { SupportedChainId } from "@/constant/contracts";
import { useChainBalances } from "@/hooks";
import { getChainLogo } from "@/lib/tokens";
import {
  BalanceAmount,
  BalanceItem,
  ChainHeader,
  CardContainer,
} from "@/components/ui";

interface NetworkBalanceCardProps {
  chainId: SupportedChainId;
  chainName: string;
}

export function NetworkBalanceCard({
  chainId,
  chainName,
}: NetworkBalanceCardProps) {
  const {
    data: balanceData,
    isLoading: balancesLoading,
    error: balancesError,
  } = useChainBalances({ chainId });

  const walletBalance = balanceData?.walletBalance;
  const vaultBalance = balanceData?.vaultBalance;
  const walletLoading = balancesLoading;
  const vaultLoading = balancesLoading;
  const walletError = balancesError;
  const vaultError = balancesError;

  const totalChainBalance = (walletBalance || 0n) + (vaultBalance || 0n);
  const chainLogo = getChainLogo(chainId);

  return (
    <CardContainer backgroundLogo={chainLogo} backgroundLogoAlt={chainName}>
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <ChainHeader chainId={chainId} chainName={chainName} />

          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Total
            </div>
            <BalanceAmount
              balance={totalChainBalance}
              isLoading={walletLoading || vaultLoading}
              error={walletError && vaultError ? walletError : null}
              token="USDC"
              size="lg"
              showIcon={true}
              className="justify-end text-teal-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-white/5">
          <BalanceItem
            label="Vault Balance"
            balance={vaultBalance}
            isLoading={vaultLoading}
            error={vaultError}
            token="USDC"
          />

          <BalanceItem
            label="Wallet Balance"
            balance={walletBalance}
            isLoading={walletLoading}
            error={walletError}
            token="USDC"
          />
        </div>
      </div>
    </CardContainer>
  );
}
