import Image from "next/image";
import { WalletConnect } from "@/components/WalletConnect";
import { VaultOperations } from "@/components/VaultOperations";

export default function Home() {
  return (
    <div className="font-sans flex flex-col min-h-screen px-3 pt-4 pb-20 gap-8 sm:px-6 sm:pt-8 sm:gap-12 md:px-10 md:pt-12">
      <main className="flex flex-col flex-1 items-stretch w-full max-w-3xl mx-auto gap-6 sm:gap-8">
        <WalletConnect />
        <VaultOperations />
      </main>
      <footer className="mt-auto flex gap-4 flex-wrap items-center justify-center pt-6 sm:pt-8 border-t border-white/5 text-center">
        <span className="uppercase text-xs font-mon text-teal-100/60">
          Argenta Finance
        </span>
      </footer>
    </div>
  );
}
