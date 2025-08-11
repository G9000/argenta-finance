import { useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import type { Address } from "viem";
import type { SupportedChainId } from "@/constant/contracts";

interface UseTokenBalanceParams {
  chainId: SupportedChainId;
  tokenAddress: Address;
  userAddress?: Address;
  enabled?: boolean;
}

export function useTokenBalance({
  chainId,
  tokenAddress,
  userAddress,
  enabled = true,
}: UseTokenBalanceParams) {
  return useReadContract({
    chainId,
    abi: erc20Abi,
    address: tokenAddress,
    functionName: "balanceOf",
    args: [userAddress || "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: Boolean(userAddress && enabled),
    },
  });
}
