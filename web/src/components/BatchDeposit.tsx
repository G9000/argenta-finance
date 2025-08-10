"use client";

import { getChainName, SUPPORTED_CHAINS } from "@/lib/contracts";

export function BatchDeposit() {
  return (
    <div className="w-full">
      <div>Batch Deposit</div>
      <div className="space-y-4 w-full">
        {SUPPORTED_CHAINS.map((chainId) => (
          <div key={chainId} className="border border-white/10 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white font-mono uppercase">
                {getChainName(chainId)}
              </h3>
              <div className="text-xs text-gray-400 uppercase tracking-wide">
                USDC
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <input
                type="text"
                placeholder="0.00"
                className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-white placeholder-gray-500 font-mono text-lg focus:outline-none focus:border-blue-500 disabled:opacity-50 w-full"
              />
              <div className="text-gray-400 font-mono">USDC</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
