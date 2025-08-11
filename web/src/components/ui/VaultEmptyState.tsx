"use client";

import { cn } from "@/lib/utils";
import { WalletConnect } from "../WalletConnect";

interface VaultEmptyStateProps {
  className?: string;
}

export function VaultEmptyState({ className }: VaultEmptyStateProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="grid gap-6 sm:gap-8 md:gap-10 bg-teal-500/10 px-3 py-6 sm:px-6 sm:py-8 md:px-8 md:py-10">
        <div className="relative my-5 md:my-10 font-mono gap-5 grid">
          <span className="text-[10px] text-teal-100/40 block mb-2">
            WELCOME TO ARGENTA FINANCE
          </span>
          <div className="text-2xl sm:text-3xl md:text-4xl w-full sm:w-10/12 font-mono uppercase leading-tight">
            Connect wallet to get started
          </div>
          <div className="w-fit">
            <WalletConnect />
          </div>
        </div>
      </div>
    </div>
  );
}
