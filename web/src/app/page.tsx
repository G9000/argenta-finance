"use client";
import { DashboardV2 } from "@/components/DashboardV2";
import { WalletConnect } from "@/components/WalletConnect";
import { useAccount } from "wagmi";

export default function Home() {
  const { address } = useAccount();
  return (
    <div className="font-sans flex flex-col min-h-screen p-4 md:p-10 gap-10">
      <main className="max-w-3xl mx-auto gap-5 grid">
        {address && <WalletConnect />}
        <DashboardV2 />
      </main>
      <footer className="mx-auto">
        <span className="uppercase text-xs font-mon text-teal-100/60">
          Argenta Finance
        </span>
      </footer>
    </div>
  );
}
