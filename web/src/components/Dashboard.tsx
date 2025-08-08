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


function formatBalance(balance: bigint | undefined, decimals: number = USDC_DECIMALS, displayDecimals: number = 2): string {
  if (!balance || balance === BigInt(0)) return '0.00'
  
  try {
    // Clamp display decimals to actual token decimals
    const d = Math.min(displayDecimals, decimals)
    
    // Get full precision string
    const formatted = formatUnits(balance, decimals)
    const parts = formatted.split('.')
    const wholePart = parts[0] || '0'
    const decimalPart = parts[1] || '00'
    
    // String-length check avoids any float conversion
    if (wholePart.length > 15) {
      // Very large number - use truncation to preserve precision
      const displayDecimalPart = decimalPart.slice(0, d).padEnd(d, '0')
      // Keep it purely string-based - avoid Number() conversion for huge values
      const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      return `${formattedWhole}.${displayDecimalPart}`
    }
    
    // Normal case: safe to use parseFloat for rounding
    const num = parseFloat(formatted)
    
    //  Check for tiny non-zero values
    if (num > 0 && num < Math.pow(10, -d)) {
      return `< ${Math.pow(10, -d).toFixed(d)}`
    }
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    }).format(num)
    
  } catch (error) {
    console.error('Error formatting balance:', error)
    return 'Error'
  }
}

function ChainBalanceRow({ chainId, chainName }: { chainId: number; chainName: string }) {
  const { address } = useAccount()

  const usdcAddress = getUsdcAddress(chainId as (typeof appChains)[number]['id'])
  const vaultAddress = getSimpleVaultAddress(chainId as (typeof appChains)[number]['id'])

  const { data: walletBalance, isLoading: walletLoading, error: walletError } = useReadContract({
    chainId,
    abi: erc20Abi,
    address: usdcAddress,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  })

  const { data: vaultBalance, isLoading: vaultLoading, error: vaultError } = useReadSimpleVaultGetBalance({
    chainId,
    address: vaultAddress,
    args: address ? [address, usdcAddress] : undefined,
    query: { enabled: Boolean(address) },
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
