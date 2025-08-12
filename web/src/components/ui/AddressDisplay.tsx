"use client";

import { useChainId } from "wagmi";
import { useEnsName } from "@/hooks";
import { EnsAvatar } from "./EnsAvatar";
import { cn } from "@/lib/utils";
import { isAddress } from "viem";
import { SupportedChainId } from "@/constant/chains";

interface AddressDisplayProps {
  address: string;
  displayBalance?: string;
  showFullAddress?: boolean;
  showAvatar?: boolean;
  avatarSize?: number;
  className?: string;
}

export function AddressDisplay({
  address,
  displayBalance,
  showFullAddress = false,
  showAvatar = false,
  avatarSize = 20,
  className = "",
}: AddressDisplayProps) {
  const currentChainId = useChainId();

  const shouldResolveEns =
    currentChainId === SupportedChainId.ETH_SEPOLIA || currentChainId === 1;

  const { data: ensName, isLoading: nameLoading } = useEnsName({
    address: address && isAddress(address) ? address : undefined,
    enabled: shouldResolveEns,
  });

  const formatAddress = (addr: string) => {
    if (showFullAddress) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const displayName = ensName || formatAddress(address);
  const balanceText = displayBalance ? ` (${displayBalance})` : "";

  if (showAvatar) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <EnsAvatar
          address={address}
          ensName={ensName ?? ""}
          size={avatarSize}
          className="flex-shrink-0"
        />

        <span className="truncate">
          {nameLoading ? (
            <span className="animate-pulse">
              {formatAddress(address)}
              {balanceText}
            </span>
          ) : (
            <span title={ensName ? `${ensName} (${address})` : address}>
              {displayName}
              {balanceText}
            </span>
          )}
        </span>
      </div>
    );
  }

  return (
    <span className={className}>
      {nameLoading ? (
        <span className="animate-pulse">
          {formatAddress(address)}
          {balanceText}
        </span>
      ) : (
        <span title={ensName ? `${ensName} (${address})` : address}>
          {displayName}
          {balanceText}
        </span>
      )}
    </span>
  );
}
