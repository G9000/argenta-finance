"use client"

import { useAccount, useReadContract } from 'wagmi'
import { erc20Abi, formatUnits } from 'viem'
import { appChains } from '@/lib/chains'
import {
  getSimpleVaultAddress,
  getUsdcAddress,
  USDC_DECIMALS,
} from '@/lib/contracts'
import { useReadSimpleVaultGetBalance } from '@/generated/wagmi'

function ChainBalanceRow({ chainId, chainName }: { chainId: number; chainName: string }) {
  const { address } = useAccount()

  const usdcAddress = getUsdcAddress(chainId as (typeof appChains)[number]['id'])
  const vaultAddress = getSimpleVaultAddress(chainId as (typeof appChains)[number]['id'])

  const { data: walletBalance} = useReadContract({
    chainId,
    abi: erc20Abi,
    address: usdcAddress,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  })

  const { data: vaultBalance} = useReadSimpleVaultGetBalance({
    chainId,
    address: vaultAddress,
    args: address ? [address, usdcAddress] : undefined,
    query: { enabled: Boolean(address) },
  })

  const formatBalance = (balance: bigint | undefined) => {
    if (!address) return '—'
    if (!balance || balance === BigInt(0)) return '0.00'
    
    try {
      const formatted = formatUnits(balance, USDC_DECIMALS)
      const num = parseFloat(formatted)
    
      if (num >= Number.MAX_SAFE_INTEGER) {
        return formatted 
      }
      
      return num.toFixed(2)
    } catch (error) {
      console.error('Error formatting balance:', error)
      return 'Error'
    }
  }

  console.log(`${chainName} walletBalance:`, walletBalance)

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="font-medium">{chainName}</div>
      <div className="flex gap-8 text-sm">
        <div>
          <span>Wallet: </span>
          <span className="font-mono">
            {formatBalance(walletBalance)} USDC
          </span>
        </div>
        <div>
          <span>Vault: </span>
          <span className="font-mono">
            {formatBalance(vaultBalance)} USDC
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
