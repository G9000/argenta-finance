import { useMemo } from "react";
import { useChainBalances } from "./useChainBalances";
import { SupportedChainId } from "@/constant/chains";

export function usePortfolioTotals() {
  const sepoliaBalances = useChainBalances({
    chainId: SupportedChainId.ETH_SEPOLIA,
  });

  const seiBalances = useChainBalances({
    chainId: SupportedChainId.SEI_TESTNET,
  });

  const totals = useMemo(() => {
    const sepoliaWalletBalance = sepoliaBalances.data?.walletBalance ?? 0n;
    const seiWalletBalance = seiBalances.data?.walletBalance ?? 0n;
    const sepoliaVaultBalance = sepoliaBalances.data?.vaultBalance ?? 0n;
    const seiVaultBalance = seiBalances.data?.vaultBalance ?? 0n;

    const totalWallet = sepoliaWalletBalance + seiWalletBalance;
    const totalVault = sepoliaVaultBalance + seiVaultBalance;
    const totalPortfolio = totalWallet + totalVault;

    return {
      totalWallet,
      totalVault,
      totalPortfolio,
      isLoading: sepoliaBalances.isLoading || seiBalances.isLoading,
      error: sepoliaBalances.error || seiBalances.error,
    };
  }, [sepoliaBalances, seiBalances]);

  return totals;
}
