import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { simpleVaultAbi } from "@/generated/wagmi";
import { type SupportedChainId } from "@/constant/chains";
import { getUsdcAddress, getVaultAddress } from "@/constant/contracts";

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
  const contracts = userAddress
    ? [
        {
          chainId,
          abi: erc20Abi,
          address: usdcAddress,
          functionName: "balanceOf" as const,
          args: [userAddress],
        },
        {
          chainId,
          abi: simpleVaultAbi,
          address: vaultAddress,
          functionName: "getBalance" as const,
          args: [userAddress, usdcAddress],
        },
      ]
    : [];

  const result = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(userAddress && enabled),
      refetchInterval: 5000,
    },
  });

  const data = result.data
    ? {
        walletBalance: result.data[0]?.result as bigint,
        vaultBalance: result.data[1]?.result as bigint,
      }
    : undefined;

  return {
    ...result,
    data,
    addresses: {
      usdc: usdcAddress,
      vault: vaultAddress,
    },
  };
}
