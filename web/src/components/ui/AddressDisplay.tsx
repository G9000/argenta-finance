"use client";

import { useEnsName } from "@/hooks/useEnsName";
import { EnsAvatar } from "./EnsAvatar";
import { cn } from "@/lib/utils";

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
  const { data: ensName, isLoading: nameLoading } = useEnsName({
    address,
    enabled: true,
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
