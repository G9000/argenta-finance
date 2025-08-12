"use client";

import Image from "next/image";
import { getTokenLogo } from "@/lib/tokens";

interface TotalAmountDisplayProps {
  totalAmount: string;
}

export function TotalAmountDisplay({ totalAmount }: TotalAmountDisplayProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-medium">
        Total Amount
      </h3>
      <div className="flex items-center gap-3">
        <Image
          src={getTokenLogo("USDC")}
          alt="USDC"
          width={20}
          height={20}
          className="rounded-full shadow-sm"
        />
        <span className="text-white font-mono text-xl font-bold tracking-wide">
          {totalAmount} USDC
        </span>
      </div>
    </div>
  );
}
