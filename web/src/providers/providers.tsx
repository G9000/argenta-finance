"use client";

import { type ReactNode } from "react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/wagmi";


const queryClient = new QueryClient();

// const { wallets } = getDefaultWallets();

// if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
//   throw new Error(
//     "Environment variable NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID must be defined"
//   );
// }

// const walletConnectProjectId =
//   process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;


// export const wagmiConfig = getDefaultConfig({
//   appName: "Argenta",
//   projectId: walletConnectProjectId,
//   wallets,
//   chains: appChains,
//   ssr: true,
// });

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}


