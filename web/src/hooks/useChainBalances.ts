import { useAccount } from "wagmi";
import { useTokenBalance } from "./useTokenBalance";
import { useVaultBalance } from "./useVaultBalance";
import {
  type SupportedChainId,
  getUsdcAddress,
  getVaultAddress,
} from "@/constant/contracts";

interface UseChainBalancesParams {
  chainId: SupportedChainId;
  enabled?: boolean;
}

export function useChainBalances({
  chainId,
  enabled = true,
}: UseChainBalancesParams) {
  const { address: userAddress } = useAccount();

  const usdcAddress = getUsdcAddress(chainId);
  const vaultAddress = getVaultAddress(chainId);

  const walletBalance = useTokenBalance({
    chainId,
    tokenAddress: usdcAddress,
    userAddress,
    enabled: Boolean(userAddress && enabled),
  });

  const vaultBalance = useVaultBalance({
    chainId,
    vaultAddress,
    userAddress,
    tokenAddress: usdcAddress,
    enabled: Boolean(userAddress && enabled),
  });

  return {
    walletBalance,
    vaultBalance,
    addresses: {
      usdc: usdcAddress,
      vault: vaultAddress,
    },
  };
}
