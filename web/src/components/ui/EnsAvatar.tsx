"use client";

import { useState } from "react";
import Image from "next/image";
import { useEnsName, useEnsAvatar } from "@/hooks/useEnsName";
import { cn } from "@/lib/utils";

interface EnsAvatarProps {
  address: string;
  size?: number;
  className?: string;
  showFallback?: boolean;
}

export function EnsAvatar({
  address,
  size = 32,
  className = "",
  showFallback = true,
}: EnsAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar, isLoading } = useEnsAvatar({
    name: ensName,
    enabled: !!ensName,
  });

  if (ensAvatar && !imageError) {
    return (
      <div className={cn("relative flex-shrink-0", className)}>
        <Image
          src={ensAvatar}
          alt={`${ensName || address} avatar`}
          width={size}
          height={size}
          className="rounded-full border border-white/20 object-cover"
          onError={() => {
            setImageError(true);
          }}
          onLoad={() => {
            setImageError(false);
          }}
          unoptimized // Fallback for external images that might cause issues
        />
      </div>
    );
  }

  if (isLoading && !imageError) {
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

  if (showFallback && ensName) {
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
          {ensName.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return null;
}
