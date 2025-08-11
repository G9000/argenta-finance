import { useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import type { Address } from "viem";
import type { SupportedChainId } from "@/constant/contracts";

interface UseTokenDataParams {
  chainId: SupportedChainId;
  tokenAddress: Address;
  userAddress?: Address;
  enabled?: boolean;
}

export function useTokenData({
  chainId,
  tokenAddress,
  userAddress,
  enabled = true,
}: UseTokenDataParams) {
  const baseContracts = [
    {
      chainId,
      abi: erc20Abi,
      address: tokenAddress,
      functionName: "name" as const,
    },
    {
      chainId,
      abi: erc20Abi,
      address: tokenAddress,
      functionName: "symbol" as const,
    },
    {
      chainId,
      abi: erc20Abi,
      address: tokenAddress,
      functionName: "decimals" as const,
    },
  ];

  const balanceContract = userAddress
    ? [
        {
          chainId,
          abi: erc20Abi,
          address: tokenAddress,
          functionName: "balanceOf" as const,
          args: [userAddress],
        },
      ]
    : [];

  const contracts = [...baseContracts, ...balanceContract];

  const result = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(enabled && tokenAddress),
      refetchInterval: userAddress ? 5000 : false, // Only refetch balance if we're tracking a user
    },
  });

  // Parse the results with proper type handling
  const data = result.data
    ? {
        name: (result.data[0]?.result as string) || "",
        symbol: (result.data[1]?.result as string) || "",
        decimals: Number(result.data[2]?.result) || 0,
        balance: userAddress ? (result.data[3]?.result as bigint) : undefined,
      }
    : undefined;

  return {
    ...result,
    data,
  };
}

// Hook for getting multiple tokens data efficiently
interface UseMultipleTokensDataParams {
  tokens: Array<{
    chainId: SupportedChainId;
    tokenAddress: Address;
    userAddress?: Address;
  }>;
  enabled?: boolean;
}

export function useMultipleTokensData({
  tokens,
  enabled = true,
}: UseMultipleTokensDataParams) {
  // Build contracts array for all tokens
  const contracts = tokens.flatMap(({ chainId, tokenAddress, userAddress }) => {
    const baseContracts = [
      {
        chainId,
        abi: erc20Abi,
        address: tokenAddress,
        functionName: "name" as const,
      },
      {
        chainId,
        abi: erc20Abi,
        address: tokenAddress,
        functionName: "symbol" as const,
      },
      {
        chainId,
        abi: erc20Abi,
        address: tokenAddress,
        functionName: "decimals" as const,
      },
    ];

    const balanceContract = userAddress
      ? [
          {
            chainId,
            abi: erc20Abi,
            address: tokenAddress,
            functionName: "balanceOf" as const,
            args: [userAddress],
          },
        ]
      : [];

    return [...baseContracts, ...balanceContract];
  });

  const result = useReadContracts({
    contracts,
    query: {
      enabled: Boolean(enabled && tokens.length > 0),
      refetchInterval: tokens.some((token) => token.userAddress) ? 5000 : false,
    },
  });

  // Parse results back into token data
  const data = result.data
    ? tokens.map((token, index) => {
        const hasBalance = Boolean(token.userAddress);
        const contractsPerToken = hasBalance ? 4 : 3;
        const baseIndex = index * contractsPerToken;

        return {
          chainId: token.chainId,
          tokenAddress: token.tokenAddress,
          name: (result.data?.[baseIndex]?.result as string) || "",
          symbol: (result.data?.[baseIndex + 1]?.result as string) || "",
          decimals: Number(result.data?.[baseIndex + 2]?.result) || 0,
          balance: hasBalance
            ? (result.data?.[baseIndex + 3]?.result as bigint)
            : undefined,
        };
      })
    : undefined;

  return {
    ...result,
    data,
  };
}
