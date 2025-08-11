import { useQuery } from "@tanstack/react-query";
import { createPublicClient, http, isAddress } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

// I dont use wagmi  hook because it dint work im not sure why
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

interface UseEnsNameProps {
  address?: string;
  enabled?: boolean;
}

export function useEnsName({ address, enabled = true }: UseEnsNameProps) {
  return useQuery({
    queryKey: ["ensName", address],
    queryFn: async () => {
      if (!address || !isAddress(address)) {
        return null;
      }

      try {
        const ensName = await ensClient.getEnsName({
          address: address as `0x${string}`,
        });
        return ensName;
      } catch (error) {
        console.warn("Failed to resolve ENS name:", error);
        return null;
      }
    },
    enabled: enabled && !!address && isAddress(address),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

interface UseEnsAvatarProps {
  name?: string | null;
  enabled?: boolean;
}

export function useEnsAvatar({ name, enabled = true }: UseEnsAvatarProps) {
  return useQuery({
    queryKey: ["ensAvatar", name],
    queryFn: async () => {
      if (!name) {
        return null;
      }

      try {
        const avatar = await ensClient.getEnsAvatar({
          name: normalize(name),
        });
        return avatar;
      } catch (error) {
        console.warn("Failed to resolve ENS avatar:", error);
        return null;
      }
    },
    enabled: enabled && !!name,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}
