"use client";

import { SupportedChainId } from "@/constant/contracts";
import { formatBalance } from "@/lib/format";
import { useChainBalances } from "@/hooks";

interface NetworkBalanceCardProps {
  chainId: SupportedChainId;
  chainName: string;
}

export function NetworkBalanceCard({
  chainId,
  chainName,
}: NetworkBalanceCardProps) {
  const {
    walletBalance: {
      data: walletBalance,
      isLoading: walletLoading,
      error: walletError,
    },
    vaultBalance: {
      data: vaultBalance,
      isLoading: vaultLoading,
      error: vaultError,
    },
  } = useChainBalances({ chainId });

  const totalChainBalance = (walletBalance || 0n) + (vaultBalance || 0n);

  return (
    <div className="grid gap-3 border border-white/10 p-4 bg-gray-900/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white font-mono text-sm uppercase">
            {chainName}
          </h3>
          <div className="text-xs text-gray-500 font-mono">ID: {chainId}</div>
        </div>
        <div className="text-sm font-mono text-teal-400">
          {formatBalance(totalChainBalance)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide">
            Vault
          </div>
          <div className="font-mono text-sm text-white">
            {vaultLoading ? (
              <div className="text-gray-500">...</div>
            ) : vaultError ? (
              <div className="text-gray-500">—</div>
            ) : (
              formatBalance(vaultBalance)
            )}
          </div>
        </div>

        <div className="grid gap-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide">
            Wallet
          </div>
          <div className="font-mono text-sm text-white">
            {walletLoading ? (
              <div className="text-gray-500">...</div>
            ) : walletError ? (
              <div className="text-gray-500">—</div>
            ) : (
              formatBalance(walletBalance)
            )}
          </div>
        </div>

        <div className="grid gap-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide">
            Total
          </div>
          <div className="font-mono text-sm text-teal-300">
            {walletLoading || vaultLoading ? (
              <div className="text-gray-500">...</div>
            ) : walletError && vaultError ? (
              <div className="text-gray-500">—</div>
            ) : (
              formatBalance(totalChainBalance)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
