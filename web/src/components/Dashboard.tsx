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


export function Dashboard() {
  const { address } = useAccount()

  return (
    <div className="w-full max-w-4xl">


      {!address ? (
        <div>
          <div className="text-lg">Connect Your Wallet</div>
        </div>
      ) : (
        <div className="space-y-4">
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
    <div className="grid gap-5 border border-white/10 p-5">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-white font-mono uppercase">{chainName}</h3>
        </div>
        <div className="text-xs text-gray-400 uppercase tracking-wide">USDC</div>
      </div>
      

      <div className='flex items-center gap-10'>
        <div className="grid gap-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Deposited in Vault
          </div>
          <div className="font-mono text-xl text-white">
            {vaultLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : vaultError ? (
              <div className="text-gray-500">—</div>
            ) : (
              formatBalance(vaultBalance)
            )}
          </div>
        </div>

        <div className="grid gap-1">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Available to deposit
          </div>
          <div className="font-mono text-xl text-white">
            {walletLoading ? (
              <div className="text-gray-500">Loading...</div>
            ) : vaultError ? (
              <div className="text-gray-500">—</div>
            ) : (
              formatBalance(walletBalance)
            )}
          </div>
        </div>
      
      </div>
    </div>
  )
}