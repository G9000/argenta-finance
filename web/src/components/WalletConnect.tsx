"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";

export function WalletConnect() {
  return (
    <div className="w-full">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted,
        }) => {
          const ready = mounted && authenticationStatus !== "loading";
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus || authenticationStatus === "authenticated");

          return (
            <div
              {...(!ready && {
                "aria-hidden": true,
                style: {
                  opacity: 0,
                  pointerEvents: "none",
                  userSelect: "none",
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">
                        Wallet Connection
                      </div>
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className={cn(
                          "flex items-center justify-center gap-3 px-6 py-3",
                          "border border-teal-500/30 rounded",
                          "bg-teal-500/5 hover:bg-teal-500/10",
                          "text-teal-400 font-mono text-sm",
                          "transition-all duration-200",
                          "hover:border-teal-500/50",
                          "focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        )}
                      >
                        <div className="w-2 h-2 rounded-full bg-teal-500" />
                        Connect Wallet
                      </button>
                    </div>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">
                        Network Error
                      </div>
                      <button
                        onClick={openChainModal}
                        type="button"
                        className={cn(
                          "flex items-center justify-center gap-3 px-6 py-3",
                          "border border-red-500/30 rounded",
                          "bg-red-500/5 hover:bg-red-500/10",
                          "text-red-400 font-mono text-sm",
                          "transition-all duration-200",
                          "hover:border-red-500/50",
                          "focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        )}
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Wrong Network
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-gray-400 uppercase tracking-wide">
                      Connected Wallet
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openChainModal}
                        style={{
                          display: "flex",
                          alignItems: "center",
                        }}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 px-3 py-2",
                          "border border-white/10 rounded",
                          "bg-gray-900/50 hover:bg-gray-800/50",
                          "text-gray-300 font-mono text-xs",
                          "transition-all duration-200",
                          "hover:border-white/20",
                          "focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        )}
                      >
                        {chain.hasIcon && (
                          <div
                            style={{
                              background: chain.iconBackground,
                              width: 16,
                              height: 16,
                              borderRadius: 999,
                              overflow: "hidden",
                              marginRight: 4,
                            }}
                          >
                            {chain.iconUrl && (
                              <img
                                alt={chain.name ?? "Chain icon"}
                                src={chain.iconUrl}
                                style={{ width: 16, height: 16 }}
                              />
                            )}
                          </div>
                        )}
                        {chain.name}
                      </button>

                      <button
                        onClick={openAccountModal}
                        type="button"
                        className={cn(
                          "flex items-center gap-3 px-4 py-2",
                          "border border-teal-500/20 rounded",
                          "bg-teal-500/5 hover:bg-teal-500/10",
                          "text-teal-400 font-mono text-sm",
                          "transition-all duration-200",
                          "hover:border-teal-500/30",
                          "focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        )}
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {account.displayName}
                        {account.displayBalance
                          ? ` (${account.displayBalance})`
                          : ""}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
