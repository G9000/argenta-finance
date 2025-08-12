"use client";

import { useState } from "react";
import Image from "next/image";
import { useChainId } from "wagmi";
import { useEnsAvatar } from "@/hooks";
import { cn } from "@/lib/utils";
import { isAddress } from "viem";
import { normalize } from "viem/ens";
import { SupportedChainId } from "@/constant/chains";

interface EnsAvatarProps {
  address: string;
  ensName: string;
  size?: number;
  className?: string;
  showFallback?: boolean;
}

export function EnsAvatar({
  ensName,
  address,
  size = 32,
  className = "",
  showFallback = true,
}: EnsAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const currentChainId = useChainId();

  const shouldResolveEns =
    currentChainId === SupportedChainId.ETH_SEPOLIA || currentChainId === 1;

  const normalizedEnsName = ensName
    ? (() => {
        try {
          return normalize(ensName);
        } catch (error) {
          console.warn("Failed to normalize ENS name:", ensName, error);
          return ensName;
        }
      })()
    : undefined;

  const { data: ensAvatar, isLoading: avatarLoading } = useEnsAvatar({
    name: normalizedEnsName || undefined,
    enabled: shouldResolveEns && !!normalizedEnsName,
  });

  if (ensAvatar && !imageError) {
    return (
      <div className={cn("relative flex-shrink-0", className)}>
        <Image
          src={ensAvatar}
          alt={`${normalizedEnsName || ensName || address} avatar`}
          width={size}
          height={size}
          className="rounded-full border border-white/20 object-cover"
          onError={() => {
            setImageError(true);
          }}
          onLoad={() => {
            setImageError(false);
          }}
          unoptimized
        />
      </div>
    );
  }

  if (avatarLoading && !imageError) {
    return (
      <div
        className={cn(
          "flex-shrink-0 rounded-full border border-white/10 bg-gray-700/50 animate-pulse",
          className
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  if (showFallback && (normalizedEnsName || ensName)) {
    const displayName = normalizedEnsName || ensName;
    return (
      <div
        className={cn(
          "flex-shrink-0 rounded-full border border-white/20 bg-gradient-to-br from-teal-500/30 to-teal-600/30 flex items-center justify-center",
          className
        )}
        style={{ width: size, height: size }}
      >
        <span
          className="font-mono text-teal-200 font-medium"
          style={{ fontSize: Math.max(10, size * 0.4) }}
        >
          {displayName?.charAt(0).toUpperCase() || "?"}
        </span>
      </div>
    );
  }

  if (showFallback && address && isAddress(address)) {
    return (
      <div
        className={cn(
          "flex-shrink-0 rounded-full border border-white/20 bg-gradient-to-br from-gray-500/30 to-gray-600/30 flex items-center justify-center",
          className
        )}
        style={{ width: size, height: size }}
      >
        <span
          className="font-mono text-gray-200 font-medium"
          style={{ fontSize: Math.max(10, size * 0.4) }}
        >
          {address.slice(2, 4).toUpperCase()}
        </span>
      </div>
    );
  }

  return null;
}
