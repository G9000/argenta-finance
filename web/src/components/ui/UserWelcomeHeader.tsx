"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getChainName, SupportedChainId } from "@/constant/contracts";
import { getChainLogo } from "@/lib/tokens";
import { useEnsName } from "@/hooks/useEnsName";

interface UserWelcomeHeaderProps {
  address: string;
  chainId: SupportedChainId;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function UserWelcomeHeader({
  address,
  chainId,
  title = "Manage your funds with Argenta",
  subtitle,
  className,
}: UserWelcomeHeaderProps) {
  const [logoError, setLogoError] = useState(false);
  const { data: ensName } = useEnsName({ address });

  useEffect(() => {
    setLogoError(false);
  }, [chainId]);

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const displayName = ensName || formatAddress(address);

  const displaySubtitle =
    subtitle ||
    `WELCOME ${displayName.toUpperCase()} YOU ARE CURRENTLY ON ${getChainName(
      chainId
    ).toUpperCase()}`;

  return (
    <div className={cn("relative my-5 md:my-10 font-mono", className)}>
      <span className="text-[10px] text-teal-100/40 block mb-2">
        {displaySubtitle}
      </span>
      <div className="text-2xl sm:text-3xl md:text-4xl w-full sm:w-10/12 font-mono uppercase leading-tight">
        {title}
      </div>

      {/* Desktop logo */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-70 hidden md:block">
        <div className="relative p-4 border border-teal-100/10 rounded-full">
          {!logoError ? (
            <Image
              src={getChainLogo(chainId)}
              alt={`${getChainName(chainId)} logo`}
              width={100}
              height={100}
              priority
              sizes="(max-width: 768px) 80px, (max-width: 1200px) 90px, 100px"
              className="grayscale"
              onError={() => setLogoError(true)}
              onLoad={() => setLogoError(false)}
            />
          ) : (
            <div className="w-[100px] h-[100px] flex items-center justify-center text-gray-400 text-xs font-mono">
              <div className="text-center">
                <div>{getChainName(chainId)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile chain indicator */}
      <div className="flex items-center gap-2 mt-3 md:hidden">
        <div className="relative w-6 h-6 border border-teal-100/20 rounded-full p-1 flex items-center justify-center">
          {!logoError ? (
            <Image
              src={getChainLogo(chainId)}
              alt={`${getChainName(chainId)} logo`}
              width={16}
              height={16}
              className="grayscale"
              onError={() => setLogoError(true)}
              onLoad={() => setLogoError(false)}
            />
          ) : (
            <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          )}
        </div>
        <span className="text-xs text-teal-100/60 font-mono uppercase">
          {getChainName(chainId)}
        </span>
      </div>
    </div>
  );
}
