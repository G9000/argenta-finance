"use client"

import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi } from 'viem'
import { appChains } from '@/lib/chains'
import {
  getSimpleVaultAddress,
  getUsdcAddress,
} from '@/lib/contracts'
import { useReadSimpleVaultGetBalance } from '@/generated/wagmi'
import { formatBalance } from '@/lib/format'

function ChainBalanceRow({ chainId, chainName }: { chainId: number; chainName: string }) {
  const { address: walletAddress } = useAccount()

  const usdcAddress = getUsdcAddress(chainId as (typeof appChains)[number]['id'])
  const vaultAddress = getSimpleVaultAddress(chainId as (typeof appChains)[number]['id'])

  const { data: walletBalance, isLoading: walletLoading, error: walletError } = useReadContract({
    chainId,
    abi: erc20Abi,
    address: usdcAddress,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: Boolean(walletAddress) },
  })

  const { data: vaultBalance, isLoading: vaultLoading, error: vaultError } = useReadSimpleVaultGetBalance({
    chainId,
    address: vaultAddress,
    args: walletAddress ? [walletAddress, usdcAddress] : undefined,
    query: { enabled: Boolean(walletAddress) },
  })

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="font-medium">{chainName}</div>
      <div className="flex gap-8 text-sm">
        <div>
          <span className="text-gray-500">Wallet: </span>
          <span className="font-mono">
            {walletLoading ? (
              <span className="text-blue-600">Loading...</span>
            ) : walletError ? (
              <span className="text-red-600">Error</span>
            ) : (
              `${formatBalance(walletBalance)} USDC`
            )}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Vault: </span>
          <span className="font-mono">
            {vaultLoading ? (
              <span className="text-blue-600">Loading...</span>
            ) : vaultError ? (
              <span className="text-red-600">Error</span>
            ) : (
              `${formatBalance(vaultBalance)} USDC`
            )}
          </span>
        </div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const { address } = useAccount()


  return (
    <div className="w-full max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Portfolio Dashboard</h2>
        <p>View your USDC balances across all supported chains</p>
      </div>

      {!address ? (
        <div>
          <p>Connect your wallet to view balances</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appChains.map((chain) => (
            <ChainBalanceRow
              key={chain.id}
              chainId={chain.id}
              chainName={chain.name}
            />
          ))}
        </div>
      )}
    </div>
  )
}
