"use client";

import { getChainLogo } from "@/lib/tokens";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardContainerProps {
  children: ReactNode;
  backgroundLogo?: string;
  backgroundLogoAlt?: string;
  className?: string;
}

export function CardContainer({
  children,
  backgroundLogo,
  backgroundLogoAlt = "",
  className,
}: CardContainerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-white/10 bg-gradient-to-br from-gray-900/30 to-gray-800/20 backdrop-blur-sm",
        className
      )}
    >
      {backgroundLogo && (
        <div className="absolute top-2 right-2 opacity-5">
          <Image
            src={backgroundLogo}
            alt={backgroundLogoAlt}
            width={80}
            height={80}
            className="object-contain"
          />
        </div>
      )}
      <div className="relative z-10 p-5">{children}</div>
    </div>
  );
}
