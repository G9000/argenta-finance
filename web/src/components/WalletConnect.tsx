"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";
import { AddressDisplay } from "@/components/ui";

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
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className={cn(
                        "w-full border border-white/10 bg-gradient-to-br font-mono text-sm uppercase tracking-wide",
                        "px-4 py-3 transition-colors duration-200",
                        "focus-visible:outline-none focus-visible:bg-teal-500/5",
                        "from-teal-500/90 to-teal-600/90 text-white hover:from-teal-500 hover:to-teal-600 active:from-teal-600 active:to-teal-700"
                      )}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <span>Connect Wallet</span>
                      </div>
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">
                        Network Error
                      </div>
                      <button
                        onClick={openChainModal}
                        type="button"
                        className={cn(
                          "w-full border border-white/10 bg-gradient-to-br font-mono text-sm uppercase tracking-wide",
                          "px-4 py-3 transition-colors duration-200",
                          "focus-visible:outline-none focus-visible:bg-red-500/5",
                          "from-red-500/90 to-red-600/90 text-white hover:from-red-500 hover:to-red-600 active:from-red-600 active:to-red-700"
                        )}
                      >
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-current" />
                          <span>Wrong Network</span>
                        </div>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openChainModal}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 border transition-colors",
                          "border-white/10 bg-gray-800/60 text-gray-300 font-mono text-xs uppercase tracking-wide",
                          "hover:border-white/20 hover:bg-gray-800/80 hover:text-white",
                          "focus-visible:outline-none focus-visible:bg-teal-500/5 focus-visible:border-teal-500/30"
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
                        <span>{chain.name}</span>
                      </button>

                      <button
                        onClick={openAccountModal}
                        type="button"
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-4 py-2 border transition-colors",
                          "border-teal-500/30 bg-teal-500/10 text-teal-400 font-mono text-xs uppercase tracking-wide",
                          "hover:border-teal-500/50 hover:bg-teal-500/20 hover:text-teal-300",
                          "focus-visible:outline-none focus-visible:bg-teal-500/15"
                        )}
                      >
                        <AddressDisplay
                          address={account.address}
                          displayBalance={account.displayBalance}
                          showAvatar={true}
                          avatarSize={16}
                          className="truncate"
                        />
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
