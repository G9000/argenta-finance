import { useReadSimpleVaultGetBalance } from "@/generated/wagmi";
import type { Address } from "viem";
import type { SupportedChainId } from "@/constant/contracts";

interface UseVaultBalanceParams {
  chainId: SupportedChainId;
  vaultAddress: Address;
  userAddress?: Address;
  tokenAddress: Address;
  enabled?: boolean;
}

export function useVaultBalance({
  chainId,
  vaultAddress,
  userAddress,
  tokenAddress,
  enabled = true,
}: UseVaultBalanceParams) {
  return useReadSimpleVaultGetBalance({
    chainId,
    address: vaultAddress,
    args: userAddress ? [userAddress, tokenAddress] : undefined,
    query: {
      enabled: Boolean(userAddress && enabled),
    },
  });
}
