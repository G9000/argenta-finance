"use client";

import { useAccount } from "wagmi";
import { SupportedChainId, getChainName } from "@/lib/contracts";
import { formatBalance } from "@/lib/format";
import { usePortfolioTotals, useChainBalances } from "@/hooks";

export function Dashboard() {
  const { address } = useAccount();
  const portfolioTotals = usePortfolioTotals();

  console.log("Portfolio Totals:", portfolioTotals);

  return (
    <div className="w-full max-w-4xl">
      {!address ? (
        <div>
          <div className="text-lg">Connect Your Wallet</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-5 border border-white/10 p-5">
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
                <div className="font-mono text-xl text-white">
                  {formatBalance(portfolioTotals.totalPortfolio)}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white mb-1">
              Chain Breakdown
            </h2>
            <p className="text-gray-400 text-sm">
              Individual balances per network
            </p>
          </div>

          <ChainBalanceRow
            chainId={SupportedChainId.ETH_SEPOLIA}
            chainName={getChainName(SupportedChainId.ETH_SEPOLIA)}
          />
          <ChainBalanceRow
            chainId={SupportedChainId.SEI_TESTNET}
            chainName={getChainName(SupportedChainId.SEI_TESTNET)}
          />
        </div>
      )}
    </div>
  );
}

function ChainBalanceRow({
  chainId,
  chainName,
}: {
  chainId: SupportedChainId;
  chainName: string;
}) {
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

  return (
    <div className="grid gap-5 border border-white/10 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-white font-mono uppercase">
            {chainName}
          </h3>
        </div>
        <div className="text-xs text-gray-400 uppercase tracking-wide">
          USDC
        </div>
      </div>

      <div className="flex items-center gap-10">
        <div className="grid gap-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Deposited in Vault
          </div>
          <div className="font-mono text-xl text-white">
            {vaultLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : vaultError ? (
              <div className="text-gray-500">—</div>
            ) : (
              formatBalance(vaultBalance)
            )}
          </div>
        </div>

        <div className="grid gap-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Available to deposit
          </div>
          <div className="font-mono text-xl text-white">
            {walletLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : vaultError ? (
              <div className="text-gray-500">—</div>
            ) : (
              formatBalance(walletBalance)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
